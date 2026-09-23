// integrations/whatsapp/fsm.ts

export type WAState =
  | 'NOT_CONNECTED'
  | 'AWAITING_CALLBACK'
  | 'EXCHANGING_TOKEN'
  | 'TOKEN_EXCHANGE_FAILED'
  | 'SUBSCRIBING_WEBHOOKS'
  | 'WEBHOOK_SUBSCRIBE_FAILED'
  | 'REGISTERING_PHONE'
  | 'PHONE_REGISTER_FAILED'
  | 'PENDING_PAYMENT'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'TOKEN_REVOKED'
  | 'DISCONNECTED'

export type WAEvent =
  | 'SIGNUP_LAUNCHED'
  | 'CODE_RECEIVED'
  | 'CALLBACK_TIMEOUT'
  | 'TOKEN_EXCHANGE_SUCCESS'
  | 'TOKEN_EXCHANGE_FAILURE'
  | 'WEBHOOK_SUBSCRIBE_SUCCESS'
  | 'WEBHOOK_SUBSCRIBE_FAILURE'
  | 'PHONE_REGISTER_SUCCESS'
  | 'PHONE_REGISTER_FAILURE'
  | 'PAYMENT_METHOD_CONFIRMED'
  | 'ACCOUNT_RESTRICTED'
  | 'ACCOUNT_REINSTATED'
  | 'TOKEN_INVALIDATED'
  | 'MANUAL_DISCONNECT'
  | 'RETRY'
  | 'RESTART'
  | 'FLOW_CANCELLED'
  | 'FLOW_ERROR_REPORTED'
  | 'REAUTH_LAUNCHED'

export const ALL_WA_STATES: readonly WAState[] = [
  'NOT_CONNECTED',
  'AWAITING_CALLBACK',
  'EXCHANGING_TOKEN',
  'TOKEN_EXCHANGE_FAILED',
  'SUBSCRIBING_WEBHOOKS',
  'WEBHOOK_SUBSCRIBE_FAILED',
  'REGISTERING_PHONE',
  'PHONE_REGISTER_FAILED',
  'PENDING_PAYMENT',
  'ACTIVE',
  'SUSPENDED',
  'TOKEN_REVOKED',
  'DISCONNECTED',
] as const

// The ONLY legal transitions. Nothing outside this map is ever applied.
export const TRANSITIONS: Readonly<
  Partial<Record<WAState, Readonly<Partial<Record<WAEvent, WAState>>>>>
> = {
  NOT_CONNECTED: {
    SIGNUP_LAUNCHED: 'AWAITING_CALLBACK',
  },
  AWAITING_CALLBACK: {
    CODE_RECEIVED: 'EXCHANGING_TOKEN',
    FLOW_CANCELLED: 'NOT_CONNECTED',
    FLOW_ERROR_REPORTED: 'NOT_CONNECTED',
    CALLBACK_TIMEOUT: 'NOT_CONNECTED',
  },
  EXCHANGING_TOKEN: {
    TOKEN_EXCHANGE_SUCCESS: 'SUBSCRIBING_WEBHOOKS',
    TOKEN_EXCHANGE_FAILURE: 'TOKEN_EXCHANGE_FAILED',
  },
  TOKEN_EXCHANGE_FAILED: {
    RESTART: 'NOT_CONNECTED',
  },
  SUBSCRIBING_WEBHOOKS: {
    WEBHOOK_SUBSCRIBE_SUCCESS: 'REGISTERING_PHONE',
    WEBHOOK_SUBSCRIBE_FAILURE: 'WEBHOOK_SUBSCRIBE_FAILED',
  },
  WEBHOOK_SUBSCRIBE_FAILED: {
    RETRY: 'SUBSCRIBING_WEBHOOKS',
    RESTART: 'NOT_CONNECTED',
  },
  REGISTERING_PHONE: {
    PHONE_REGISTER_SUCCESS: 'PENDING_PAYMENT',
    PHONE_REGISTER_FAILURE: 'PHONE_REGISTER_FAILED',
  },
  PHONE_REGISTER_FAILED: {
    RETRY: 'REGISTERING_PHONE',
    RESTART: 'NOT_CONNECTED',
  },
  PENDING_PAYMENT: {
    PAYMENT_METHOD_CONFIRMED: 'ACTIVE',
    MANUAL_DISCONNECT: 'DISCONNECTED',
  },
  ACTIVE: {
    ACCOUNT_RESTRICTED: 'SUSPENDED',
    TOKEN_INVALIDATED: 'TOKEN_REVOKED',
    MANUAL_DISCONNECT: 'DISCONNECTED',
  },
  SUSPENDED: {
    ACCOUNT_REINSTATED: 'ACTIVE',
    TOKEN_INVALIDATED: 'TOKEN_REVOKED',
    MANUAL_DISCONNECT: 'DISCONNECTED',
  },
  TOKEN_REVOKED: {
    REAUTH_LAUNCHED: 'AWAITING_CALLBACK',
    MANUAL_DISCONNECT: 'DISCONNECTED',
  },
  DISCONNECTED: {
    SIGNUP_LAUNCHED: 'AWAITING_CALLBACK',
  },
} as const

// States where a Redis lock must be held before transitioning further.
export const LOCKED_STATES: ReadonlySet<WAState> = new Set<WAState>([
  'EXCHANGING_TOKEN',
  'SUBSCRIBING_WEBHOOKS',
  'REGISTERING_PHONE',
])

export class IllegalTransitionError extends Error {
  public readonly status = 400
  constructor(
    public readonly tenantId: string,
    public readonly from: WAState,
    public readonly event: WAEvent
  ) {
    super(`Illegal transition: tenant=${tenantId} state=${from} event=${event}`)
    this.name = 'IllegalTransitionError'
    Object.setPrototypeOf(this, IllegalTransitionError.prototype)
  }
}

/**
 * Pure function — no side effects, no I/O. Callers are responsible for
 * locking, persistence, and the actual Graph API calls; this only decides
 * whether the transition is legal and what the resulting state is.
 */
export function transition(
  tenantId: string,
  current: WAState,
  event: WAEvent
): WAState {
  const next = TRANSITIONS[current]?.[event]
  if (!next) {
    throw new IllegalTransitionError(tenantId, current, event)
  }
  return next
}

/**
 * Helper to check if a transition is legal without throwing.
 */
export function canTransition(current: WAState, event: WAEvent): boolean {
  return Boolean(TRANSITIONS[current]?.[event])
}

/**
 * Returns all legal events for a given state.
 */
export function getLegalEvents(current: WAState): WAEvent[] {
  const transitionsForState = TRANSITIONS[current]
  return transitionsForState ? (Object.keys(transitionsForState) as WAEvent[]) : []
}
