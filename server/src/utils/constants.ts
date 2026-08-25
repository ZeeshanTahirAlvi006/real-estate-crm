// User roles hierarchy & definitions
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  BROKERAGE_OWNER: 'brokerage_owner',
  TEAM_LEAD: 'team_lead',
  AGENT: 'agent',
  LEAD: 'lead',
} as const

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES]

// Cookie name constants
export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'pp_access_token',
  REFRESH_TOKEN: 'pp_refresh_token',
} as const

// Standard HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const

// Opaque error messages for sensitive auth routes to prevent user enumeration
export const GENERIC_AUTH_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password.',
  UNABLE_TO_REGISTER: 'Unable to process registration request.',
  FORGOT_PASSWORD_SENT: 'If an account exists with that email, a password reset link has been dispatched.',
  RESET_PASSWORD_FAILED: 'Unable to reset password. The link may be invalid or expired.',
  UNAUTHORIZED: 'Authentication required to access this resource.',
  FORBIDDEN: 'You do not possess the required permissions for this action.',
  SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
  FEATURE_MAINTENANCE: 'This feature is currently undergoing scheduled maintenance. Please check back shortly.',
} as const
