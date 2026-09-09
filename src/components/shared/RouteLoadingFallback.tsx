import { useEffect, useState } from 'react'

export function RouteLoadingFallback() {
  const [showSlowIndicator, setShowSlowIndicator] = useState(false)

  // Only show full loading indicator if loading takes > 120ms to avoid flicker on fast transitions
  useEffect(() => {
    const timer = setTimeout(() => setShowSlowIndicator(true), 120)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex-1 w-full min-h-[60vh] flex flex-col items-center justify-center p-6 transition-opacity duration-200">
      {/* Top minimal progress line */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-transparent overflow-hidden z-50 pointer-events-none">
        <div className="h-full bg-[#9CB080] dark:bg-[#9CB080] animate-[pulse_1s_ease-in-out_infinite] w-full" />
      </div>

      {showSlowIndicator && (
        <div className="flex flex-col items-center gap-3 animate-in fade-in duration-300">
          <div className="h-8 w-8 rounded-full border-2 border-[#9CB080]/30 border-t-[#9CB080] animate-spin" />
          <p className="text-xs font-medium text-[#4A5D54] dark:text-[#A0B2A6] tracking-wide">
            Loading view...
          </p>
        </div>
      )}
    </div>
  )
}
