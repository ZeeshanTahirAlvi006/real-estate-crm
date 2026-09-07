import { useState, useEffect, useRef } from 'react'

export interface UseCountUpOptions {
  end: number
  start?: number
  duration?: number // in ms, default 1500
  decimals?: number
}

/**
 * Custom hook for smooth ease-out count-up animation.
 * Increments at high speed initially, then gradually slows down (ease-out quartic curve)
 * until settling precisely on the target value.
 */
export function useCountUp({
  end,
  start = 0,
  duration = 1500,
  decimals = 0,
}: UseCountUpOptions) {
  const [count, setCount] = useState(start)
  const prevTargetRef = useRef(start)

  useEffect(() => {
    let startTimestamp: number | null = null
    let animationFrameId: number
    const initialVal = prevTargetRef.current
    const targetVal = end
    const difference = targetVal - initialVal

    if (difference === 0 && count === targetVal) {
      return
    }

    // Ease-out Quartic: fast initial surge, smooth deceleration to final value
    const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4)

    const step = (timestamp: number) => {
      if (startTimestamp === null) {
        startTimestamp = timestamp
      }
      const elapsed = timestamp - startTimestamp
      const progress = Math.min(elapsed / duration, 1)
      const eased = easeOutQuart(progress)

      const nextValue = initialVal + difference * eased

      if (decimals === 0) {
        setCount(Math.round(nextValue))
      } else {
        const factor = Math.pow(10, decimals)
        setCount(Math.round(nextValue * factor) / factor)
      }

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step)
      } else {
        setCount(targetVal)
        prevTargetRef.current = targetVal
      }
    }

    animationFrameId = requestAnimationFrame(step)

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [end, duration, decimals])

  return count
}
