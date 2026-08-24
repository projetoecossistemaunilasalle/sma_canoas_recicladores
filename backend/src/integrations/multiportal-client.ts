// Client for the Multiportal / 1gps.com.br vehicle tracking API. Credentials
// come from env (never hardcoded) — see backend/.env.example.
const BASE_URL = process.env.MULTIPORTAL_BASE_URL ?? "http://apiv1.1gps.com.br"
const USERNAME = process.env.MULTIPORTAL_USERNAME
const PASSWORD = process.env.MULTIPORTAL_PASSWORD
const APP_ID = Number(process.env.MULTIPORTAL_APP_ID ?? 0)

// The login response's own `expiration` timestamp isn't used to schedule
// refresh: comparing it against our local clock is one more thing that can
// drift. Instead the token is refreshed on a flat cadence, plus a
// re-login-and-retry on any 401/403, so a wrong assumption about the actual
// server-side TTL self-heals instead of silently going stale.
const TOKEN_REFRESH_INTERVAL_MS = 50 * 60 * 1000

// Never attempt a new /seguranca/logon call more often than this, no matter
// how many callers ask for one (the sync job polls every 30s and would
// otherwise retry a failed login on every single tick). A rejected login is
// left rejected until this cools down, rather than hammered.
const LOGIN_RETRY_COOLDOWN_MS = 5 * 60 * 1000

export interface MultiportalPosition {
  online: boolean
  dataGPS: number
  latitude: number
  longitude: number
  velocidade: number
  proa: number
  endereco: string
}

export interface MultiportalDevice {
  posicoes: MultiportalPosition[]
}

export interface MultiportalVehicle {
  id: number
  placa: string
  tipo: string
  cor: string
  modelo: string
  proprietario: string
  dispositivos: MultiportalDevice[]
}

interface MultiportalEnvelope<T> {
  status: string
  responseMessage: string
  object: T
}

let cachedToken: string | null = null
let lastLoginAttemptAt = 0
let loginPromise: Promise<string> | null = null

async function login(): Promise<string> {
  if (!USERNAME || !PASSWORD) {
    throw new Error("Multiportal credentials are not configured")
  }

  const res = await fetch(`${BASE_URL}/seguranca/logon`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD, appid: APP_ID, token: null, expiration: null }),
  })
  if (!res.ok) throw new Error(`Multiportal login failed with status ${res.status}`)

  const data = (await res.json()) as MultiportalEnvelope<{ token: string }>
  if (data.status !== "OK" || !data.object?.token) {
    throw new Error(`Multiportal login rejected: ${data.responseMessage ?? "unknown error"}`)
  }

  cachedToken = data.object.token
  return cachedToken
}

// Single entry point for every login attempt, whichever caller triggers it
// (first request, scheduled refresh, or a 401 retry) — collapses concurrent
// callers onto one in-flight request and enforces LOGIN_RETRY_COOLDOWN_MS so
// a rejected/failing login can't be retried on every 30s sync tick.
function ensureFreshLogin(): Promise<string> {
  if (loginPromise) return loginPromise

  const now = Date.now()
  if (now - lastLoginAttemptAt < LOGIN_RETRY_COOLDOWN_MS) {
    return Promise.reject(new Error("Multiportal login is cooling down after a recent failure"))
  }

  lastLoginAttemptAt = now
  loginPromise = login()
    .catch((err) => {
      cachedToken = null
      throw err
    })
    .finally(() => {
      loginPromise = null
    })
  return loginPromise
}

async function authedPost<T>(path: string): Promise<T> {
  if (!cachedToken) await ensureFreshLogin()

  const doRequest = () =>
    fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: cachedToken as string },
    })

  let res = await doRequest()
  if (res.status === 401 || res.status === 403) {
    cachedToken = null
    await ensureFreshLogin()
    res = await doRequest()
  }
  if (!res.ok) throw new Error(`Multiportal request to ${path} failed with status ${res.status}`)

  const data = (await res.json()) as MultiportalEnvelope<T>
  if (data.status !== "OK") {
    throw new Error(`Multiportal request to ${path} rejected: ${data.responseMessage ?? "unknown error"}`)
  }
  return data.object
}

export function startTokenRefreshLoop() {
  ensureFreshLogin().catch((err) => console.error("Multiportal initial login failed:", err))
  setInterval(() => {
    ensureFreshLogin().catch((err) => console.error("Multiportal token refresh failed:", err))
  }, TOKEN_REFRESH_INTERVAL_MS)
}

export async function getLastPositions(): Promise<MultiportalVehicle[]> {
  return authedPost<MultiportalVehicle[]>("/posicoes/ultimaPosicao")
}
