import { env } from '../config/env.js'
import { logger } from './logger.js'
import { AppError } from '../middleware/errorHandler.js'
import { HTTP_STATUS } from './constants.js'

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export interface CircuitBreakerOptions {
  failureThreshold?: number // Number of consecutive failures to trip
  cooldownMs?: number // Cooldown duration before attempting HALF_OPEN probe (default 5 min)
  name: string
}

export class CircuitBreaker {
  public readonly name: string
  private state: CircuitState = 'CLOSED'
  private failureCount: number = 0
  private lastFailureTime: number = 0
  private readonly failureThreshold: number
  private readonly cooldownMs: number

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name
    this.failureThreshold = options.failureThreshold || env.CIRCUIT_BREAKER_FAILURE_THRESHOLD || 5
    this.cooldownMs = options.cooldownMs || env.CIRCUIT_BREAKER_COOLDOWN_MS || 300000
  }

  public getState(): CircuitState {
    this.evaluateStateTransition()
    return this.state
  }

  public isOpen(): boolean {
    return this.getState() === 'OPEN'
  }

  private evaluateStateTransition(): void {
    if (this.state === 'OPEN') {
      const now = Date.now()
      if (now - this.lastFailureTime >= this.cooldownMs) {
        this.state = 'HALF_OPEN'
        logger.info(`Circuit breaker [${this.name}] entered HALF_OPEN`)
      }
    }
  }

  public recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED'
      this.failureCount = 0
      logger.info(`Circuit breaker [${this.name}] recovered! State reset to CLOSED.`)
    } else if (this.state === 'CLOSED') {
      this.failureCount = 0
    }
  }

  public recordFailure(err?: any): void {
    this.lastFailureTime = Date.now()
    this.failureCount += 1

    logger.warn(
      `Circuit breaker [${this.name}] recorded failure #${this.failureCount} (${err?.message || 'Vendor error'})`
    )

    if (this.state === 'HALF_OPEN' || this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN'
      logger.error(
        `Circuit breaker [${this.name}] TRIPPED to OPEN! Fast-failing calls for ${Math.round(this.cooldownMs / 1000)}s.`
      )
    }
  }

  public reset(): void {
    this.state = 'CLOSED'
    this.failureCount = 0
    this.lastFailureTime = 0
    logger.info(`Circuit breaker [${this.name}] manually reset to CLOSED.`)
  }

  /**
   * Executes a protected asynchronous vendor operation through the circuit breaker.
   */
  public async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T> | T
  ): Promise<T> {
    if (this.isOpen()) {
      if (fallback) {
        return fallback()
      }
      throw new AppError(
        `External service [${this.name}] is temporarily unavailable due to safety circuit trip. Please try again later.`,
        HTTP_STATUS.SERVICE_UNAVAILABLE
      )
    }

    try {
      const result = await operation()
      this.recordSuccess()
      return result
    } catch (err: any) {
      this.recordFailure(err)
      if (fallback) {
        return fallback()
      }
      throw err
    }
  }
}

// ── Registry of Pre-Configured Circuit Breakers ─────────
export const openaiCircuit = new CircuitBreaker({ name: 'OpenAI_LLM' })
export const whatsappCircuit = new CircuitBreaker({ name: 'Meta_WhatsApp' })
export const telephonyCircuit = new CircuitBreaker({ name: 'Twilio_Telephony' })
export const stripeCircuit = new CircuitBreaker({ name: 'Stripe_Billing' })

export const circuitRegistry: Record<string, CircuitBreaker> = {
  openai: openaiCircuit,
  whatsapp: whatsappCircuit,
  telephony: telephonyCircuit,
  stripe: stripeCircuit,
}
