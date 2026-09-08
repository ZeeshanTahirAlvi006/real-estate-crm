import React, { useEffect, useState } from 'react'

interface AudioWaveformProps {
  isActive: boolean
  isMuted?: boolean
  barCount?: number
  className?: string
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  isActive,
  isMuted = false,
  barCount = 18,
  className = '',
}) => {
  const [heights, setHeights] = useState<number[]>(() =>
    Array.from({ length: barCount }, () => 15)
  )

  useEffect(() => {
    if (!isActive || isMuted) {
      setHeights(Array.from({ length: barCount }, () => 12))
      return
    }

    const interval = setInterval(() => {
      setHeights(
        Array.from({ length: barCount }, () => Math.floor(Math.random() * 65) + 15)
      )
    }, 120)

    return () => clearInterval(interval)
  }, [isActive, isMuted, barCount])

  return (
    <div className={`flex items-center gap-0.75 h-9 px-2 ${className}`}>
      {heights.map((h, i) => (
        <span
          key={i}
          className={`w-1 rounded-full transition-all duration-100 ${isMuted
              ? 'bg-muted-foreground/30 h-1.5'
              : isActive
                ? 'bg-primary shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                : 'bg-muted-foreground/20'
            }`}
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  )
}
