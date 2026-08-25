import cors from 'cors'
import { env } from './env.js'

// Allowed origin list
const allowedOrigins = [
  env.CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]

// CORS middleware options
export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true)

    if (allowedOrigins.indexOf(origin) !== -1 || env.NODE_ENV !== 'production') {
      callback(null, true)
    } else {
      callback(new Error('Blocked: CORS policy'))
    }
  },
  credentials: true, // Allow cookies to be sent across origins
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400, // 24 hours
}

export const corsMiddleware = cors(corsOptions)
