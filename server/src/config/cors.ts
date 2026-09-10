import cors from 'cors'
import { env } from './env.js'

// Normalize CLIENT_URL to prevent trailing slash mismatches
const normalizedClientUrl = env.CLIENT_URL ? env.CLIENT_URL.replace(/\/$/, '') : ''

// Explicitly allowed production & development origins
const allowedOrigins = new Set([
  normalizedClientUrl,
  'https://real-estate-grid2xfsj-codewithgoostyhumans-projects.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
])

// CORS middleware options
export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // 1. Allow requests with no origin (like mobile apps, curl, Postman, webhooks)
    if (!origin) return callback(null, true)

    const cleanOrigin = origin.replace(/\/$/, '')

    // 2. Allow any Vercel production or preview deployment
    const isVercelOrigin = /^https:\/\/[a-z0-9-.]+\.vercel\.app$/.test(cleanOrigin)

    if (
      allowedOrigins.has(cleanOrigin) ||
      isVercelOrigin ||
      (env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin))
    ) {
      callback(null, true)
    } else {
      // Safely deny CORS without crashing server with 500 error
      callback(null, false)
    }
  },
  credentials: true, // Allows HTTP cookies with requests
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'X-XSRF-Token',
    'X-CSRF-Token',
    'x-xsrf-token',
    'x-csrf-token',
    'X-Refresh-Token',
    'x-refresh-token',
  ],
  exposedHeaders: ['Set-Cookie', 'X-XSRF-Token', 'X-CSRF-Token', 'Authorization', 'X-Refresh-Token'],
  maxAge: 86400, // Cache preflight response for 24 hours
}

export const corsMiddleware = cors(corsOptions)
