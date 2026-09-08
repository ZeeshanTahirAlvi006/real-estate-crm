import React, { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  maximizeDialer,
  hangupActiveCall,
  toggleMute,
  incrementSessionTimer,
} from '@/store/slices/dialerSlice'
import { AudioWaveform } from './AudioWaveform'
import {
  PhoneIcon,
  PhoneXMarkIcon,
  MicrophoneIcon,
  ArrowsPointingOutIcon,
} from '@heroicons/react/24/outline'

export const MiniDialerBar: React.FC = () => {
  const dispatch = useAppDispatch()
  const dialer = useAppSelector((state) => state.dialer)

  // Timer interval for call duration
  useEffect(() => {
    if (!dialer.isOpen) return
    const interval = setInterval(() => {
      dispatch(incrementSessionTimer())
    }, 1000)
    return () => clearInterval(interval)
  }, [dialer.isOpen, dispatch])

  if (!dialer.isOpen || !dialer.isMinimized) {
    return null
  }

  const activeLine =
    dialer.activeConnectedLineIndex !== null
      ? dialer.lines[dialer.activeConnectedLineIndex]
      : dialer.lines.find((l) => l.state === 'dialing' || l.state === 'ringing')

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-4 bg-card/95 backdrop-blur-md border border-primary/30 shadow-2xl rounded-2xl px-5 py-3.5 text-card-foreground animate-in slide-in-from-bottom-5 duration-300">
      {/* Status indicator */}
      <div className="flex items-center gap-3">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-md">
          <PhoneIcon className="w-5 h-5 animate-pulse" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">
              {activeLine?.contactName || 'Parallel Calling...'}
            </span>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {dialer.lineCount} Lines
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            {activeLine ? activeLine.contactPhone : `${dialer.lines.length} lines active`} •{' '}
            {formatTime(activeLine?.callDurationSeconds || dialer.sessionDurationSeconds)}
          </p>
        </div>
      </div>

      {/* Audio visualizer */}
      <AudioWaveform
        isActive={activeLine?.state === 'connected'}
        isMuted={dialer.isMuted}
        barCount={14}
      />

      {/* Action Buttons */}
      <div className="flex items-center gap-2 border-l border-border/80 pl-3">
        <button
          type="button"
          onClick={() => dispatch(toggleMute())}
          className={`p-2 rounded-lg border text-xs transition-colors ${
            dialer.isMuted
              ? 'bg-rose-500/20 text-rose-500 border-rose-500/30'
              : 'hover:bg-muted text-muted-foreground'
          }`}
          title={dialer.isMuted ? 'Unmute' : 'Mute'}
        >
          <MicrophoneIcon className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => dispatch(hangupActiveCall())}
          className="p-2 rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground transition-colors"
          title="End Call"
        >
          <PhoneXMarkIcon className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => dispatch(maximizeDialer())}
          className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors"
          title="Maximize Dialer View"
        >
          <ArrowsPointingOutIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
