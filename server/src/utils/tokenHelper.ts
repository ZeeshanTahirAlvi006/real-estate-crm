import jwt, { SignOptions } from 'jsonwebtoken'
import { env } from '../config/env.js'
import { UserRole } from './constants.js'

export interface TokenPayload {
  userId: string
  email: string
  role: UserRole
  brokerageId: string
  tokenVersion?: number
}

// Generate short-lived JWT Access Token
export const signAccessToken = (payload: TokenPayload): string => {
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as any,
  }
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options)
}

// Generate long-lived JWT Refresh Token
export const signRefreshToken = (payload: TokenPayload): string => {
  const options: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
  }
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, options)
}

// Verify JWT Access Token
export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload
}

// Verify JWT Refresh Token
export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload
}
