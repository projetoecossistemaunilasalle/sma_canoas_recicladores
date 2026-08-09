import jwt from "jsonwebtoken"

const SECRET = process.env.JWT_SECRET!
const EXPIRES_IN = (process.env.JWT_EXPIRES_IN || "7d") as jwt.SignOptions["expiresIn"]

export interface JwtPayload {
  userId: string
  email: string
  role: string
  cooperativeId?: string | null
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN })
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload
}
