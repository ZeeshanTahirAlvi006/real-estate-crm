import { Request, Response, NextFunction } from 'express'
import { circuitRegistry, CircuitBreaker } from '../utils/circuitBreaker.js'
import { sendError } from '../utils/apiResponse.js'
import { HTTP_STATUS } from '../utils/constants.js'

/**
 * Route-Level Circuit Breaker Guard Middleware
 * Fast-fails incoming API requests when dependent downstream vendor circuits are OPEN.
 */
export const requireCircuit = (circuitNameOrInstance: string | CircuitBreaker) => {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const breaker =
      typeof circuitNameOrInstance === 'string'
        ? circuitRegistry[circuitNameOrInstance]
        : circuitNameOrInstance

    if (!breaker) {
      return next()
    }

    if (breaker.isOpen()) {
      sendError(
        res,
        `Service dependency [${breaker.name}] is experiencing an outage and is temporarily suspended for safety.`,
        HTTP_STATUS.SERVICE_UNAVAILABLE,
        {
          circuit: breaker.name,
          state: breaker.getState(),
        }
      )
      return
    }

    next()
  }
}
