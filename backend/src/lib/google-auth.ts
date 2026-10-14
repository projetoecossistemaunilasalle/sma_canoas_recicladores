import { OAuth2Client } from "google-auth-library"

// The OAuth client ID from Google Cloud Console — the same value the frontend
// renders the "Sign in with Google" button with (NEXT_PUBLIC_GOOGLE_CLIENT_ID).
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID

const client = new OAuth2Client()

export interface GoogleIdentity {
  sub: string
  email: string
  name: string
}

export function isGoogleSignInConfigured() {
  return Boolean(CLIENT_ID)
}

/**
 * Checks a Google Identity Services ID token (the button's `credential`):
 * Google's signature, issuer, expiry and that it was issued to *our* client
 * ID. Throws when any of that fails, or when Google hasn't verified the email.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdentity> {
  // Without an audience google-auth-library skips the check, and a token
  // minted for any other app would be accepted.
  if (!CLIENT_ID) throw new Error("GOOGLE_CLIENT_ID is not set")

  const ticket = await client.verifyIdToken({ idToken, audience: CLIENT_ID })
  const payload = ticket.getPayload()
  if (!payload?.email || !payload.email_verified) throw new Error("Google account has no verified email")

  const email = payload.email.toLowerCase()
  return { sub: payload.sub, email, name: payload.name?.trim() || email }
}
