import cors from 'cors'
import { env } from './env.js'

// Allowed origin list
const allowedOrigins = [
  env.CLIENT_URL,
  'https://real-estate-grid2xfsj-codewithgoostyhumans-projects.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]

// CORS middleware options
export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true)

    const isVercelDomain =
      /^https:\/\/[a-z0-9-]+-codewithgoostyhumans-projects\.vercel\.app$/.test(origin) ||
      /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)

    if (allowedOrigins.indexOf(origin) !== -1 || isVercelDomain || env.NODE_ENV !== 'production') {
      callback(null, true)
    } else {
      callback(new Error('Blocked: CORS policy'))
    }
  },
  credentials: true, // Allow cookies to be sent across origins
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'X-XSRF-Token',
    'X-CSRF-Token',
    'x-xsrf-token',
    'x-csrf-token',
  ],
  exposedHeaders: ['Set-Cookie', 'X-XSRF-Token', 'X-CSRF-Token'],
  maxAge: 86400, // 24 hours
}

export const corsMiddleware = cors(corsOptions)
