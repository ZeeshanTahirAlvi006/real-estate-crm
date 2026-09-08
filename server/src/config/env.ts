import dotenv from 'dotenv'
import { z } from 'zod'

// Load environment variables from .env file
dotenv.config()

// Environment variable validation schema
const envSchema = z.object({
  PORT: z.coerce.number(),
  NODE_ENV: z.enum(['development', 'production', 'test']),
  CLIENT_URL: z.string(),
  MONGODB_URI: z.string(),
  REDIS_URL: z.string(),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string(),
  JWT_REFRESH_EXPIRES_IN: z.string(),
  COOKIE_SECRET: z.string().min(16, 'COOKIE_SECRET must be at least 16 characters'),
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: z.coerce.boolean(),
  ENCRYPTION_MASTER_KEY: z.string().length(64, 'ENCRYPTION_MASTER_KEY must be a 64-character hex string (32 bytes)'),
  OPENROUTER_API_KEY: z.string().optional(),
  MISTRAL_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_PROVIDER: z.enum(['openrouter', 'mistral', 'openai', 'gemini', 'anthropic', 'local', 'auto']).optional(),
  META_WHATSAPP_TOKEN: z.string().optional(),
  META_PHONE_NUMBER_ID: z.string().optional(),
  META_VERIFY_TOKEN: z.string(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  ATTOM_API_KEY: z.string().optional(),
  STORAGE_PROVIDER: z.enum(['local', 's3']).optional(),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_S3_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_PUBLIC_URL: z.string().optional(),
  API_PUBLIC_URL: z.string().optional(),
  // Email Provider (SMTP & IMAP)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string(),
  IMAP_HOST: z.string().optional().or(z.literal('')),
  IMAP_PORT: z.string().optional().transform(v => v ? parseInt(v, 10) : undefined),
  // Rate Limits (req/min)
  RATE_LIMIT_SUPER_ADMIN: z.coerce.number(),
  RATE_LIMIT_BROKERAGE_OWNER: z.coerce.number(),
  RATE_LIMIT_TEAM_LEAD: z.coerce.number(),
  RATE_LIMIT_AGENT: z.coerce.number(),
  RATE_LIMIT_LEAD: z.coerce.number(),
  RATE_LIMIT_UNAUTHENTICATED: z.coerce.number(),
  // Daily Quotas
  QUOTA_DAILY_USER_REQUESTS: z.coerce.number(),
  QUOTA_DAILY_BROKERAGE_REQUESTS: z.coerce.number(),
  QUOTA_DAILY_USER_AI_TOKENS: z.coerce.number(),
  QUOTA_DAILY_BROKERAGE_AI_TOKENS: z.coerce.number(),
  QUOTA_DAILY_USER_SMS: z.coerce.number(),
  QUOTA_DAILY_BROKERAGE_SMS: z.coerce.number(),
  // Circuit Breakers
  CIRCUIT_BREAKER_FAILURE_THRESHOLD: z.coerce.number(),
  CIRCUIT_BREAKER_COOLDOWN_MS: z.coerce.number(),
})

// Parse and validate process.env
const parseEnv = () => {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    console.error('Invalid environment variables:', result.error.format())
    process.exit(1)
  }
  return result.data
}

export const env = parseEnv()
export type Env = z.infer<typeof envSchema>
