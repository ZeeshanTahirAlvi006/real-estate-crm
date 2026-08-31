import dotenv from 'dotenv'
import { z } from 'zod'

// Load environment variables from .env file
dotenv.config()

// Environment variable validation schema
const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/proppulse_crm'),
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  COOKIE_SECRET: z.string().min(16, 'COOKIE_SECRET must be at least 16 characters').default('proppulse_cookie_secret_super_secure_signing_key_2026'),
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: z.coerce.boolean().default(false),
  ENCRYPTION_MASTER_KEY: z.string().length(64, 'ENCRYPTION_MASTER_KEY must be a 64-character hex string (32 bytes)').default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
  OPENROUTER_API_KEY: z.string().optional(),
  MISTRAL_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_PROVIDER: z.enum(['openrouter', 'mistral', 'openai', 'gemini', 'anthropic', 'local', 'auto']).default('auto'),
  META_WHATSAPP_TOKEN: z.string().optional(),
  META_PHONE_NUMBER_ID: z.string().optional(),
  META_VERIFY_TOKEN: z.string().default('proppulse_webhook_verify_token_2026'),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  // Rate Limits (req/min)
  RATE_LIMIT_SUPER_ADMIN: z.coerce.number().default(200),
  RATE_LIMIT_BROKERAGE_OWNER: z.coerce.number().default(120),
  RATE_LIMIT_TEAM_LEAD: z.coerce.number().default(80),
  RATE_LIMIT_AGENT: z.coerce.number().default(60),
  RATE_LIMIT_LEAD: z.coerce.number().default(20),
  RATE_LIMIT_UNAUTHENTICATED: z.coerce.number().default(10),
  // Daily Quotas
  QUOTA_DAILY_USER_REQUESTS: z.coerce.number().default(1000),
  QUOTA_DAILY_BROKERAGE_REQUESTS: z.coerce.number().default(20000),
  QUOTA_DAILY_USER_AI_TOKENS: z.coerce.number().default(50000),
  QUOTA_DAILY_BROKERAGE_AI_TOKENS: z.coerce.number().default(500000),
  QUOTA_DAILY_USER_SMS: z.coerce.number().default(100),
  QUOTA_DAILY_BROKERAGE_SMS: z.coerce.number().default(2000),
  // Circuit Breakers
  CIRCUIT_BREAKER_FAILURE_THRESHOLD: z.coerce.number().default(5),
  CIRCUIT_BREAKER_COOLDOWN_MS: z.coerce.number().default(300000),
})

// Parse and validate process.env
const parseEnv = () => {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    console.error('❌ Invalid environment variables:', result.error.format())
    process.exit(1)
  }
  return result.data
}

export const env = parseEnv()
export type Env = z.infer<typeof envSchema>
