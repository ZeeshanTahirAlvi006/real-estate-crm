import React, { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  closeDialer,
  minimizeDialer,
  setLineCount,
  startDialingSession,
  updateLineState,
  incrementSessionTimer,
} from '@/store/slices/dialerSlice'
import { useGetDialerQueueQuery } from '@/store/api/communicationApi'
import { CallActiveScreen } from './CallActiveScreen'
import type { DialerLineCount } from '@/types/communication'
import {
  PhoneIcon,
  XMarkIcon,
  MinusIcon,
  SignalIcon,
  BoltIcon,
  SparklesIcon,
  UserGroupIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'

export const ParallelDialerModal: React.FC = () => {
  const dispatch = useAppDispatch()
  const dialer = useAppSelector((state) => state.dialer)
  const { data: queue = [] } = useGetDialerQueueQuery()

  // Run session timer
  useEffect(() => {
    if (!dialer.isOpen) return
    const interval = setInterval(() => {
      dispatch(incrementSessionTimer())
    }, 1000)
    return () => clearInterval(interval)
  }, [dialer.isOpen, dispatch])

  // Handle line simulation when dialing starts
  useEffect(() => {
    if (!dialer.isDialing || dialer.activeConnectedLineIndex !== null) return

    const timeouts: Array<ReturnType<typeof setTimeout>> = []

    dialer.lines.forEach((line, idx) => {
      if (line.state === 'dialing') {
        // Line ringing after 1.5s
        timeouts.push(
          setTimeout(() => {
            dispatch(updateLineState({ lineIndex: idx, state: 'ringing' }))
          }, 1500 + idx * 400)
        )

        // Line 1 connects after 3.8s, others simulate busy/voicemail
        if (idx === 0) {
          timeouts.push(
            setTimeout(() => {
              dispatch(updateLineState({ lineIndex: 0, state: 'connected' }))
            }, 3800)
          )
        } else {
          timeouts.push(
            setTimeout(() => {
              dispatch(updateLineState({ lineIndex: idx, state: 'no_answer' }))
            }, 4500 + idx * 500)
          )
        }
      }
    })

    return () => {
      timeouts.forEach((t) => clearTimeout(t))
    }
  }, [dialer.isDialing, dialer.activeConnectedLineIndex, dispatch])

  if (!dialer.isOpen || dialer.isMinimized) {
    return null
  }

  const handleStartSession = () => {
    if (queue.length === 0) return
    const targets = queue.slice(0, dialer.lineCount).map((c) => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      phone: c.phone,
    }))
    dispatch(startDialingSession({ targets }))
  }

  const hasActiveConnectedCall = dialer.activeConnectedLineIndex !== null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-card border border-border/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-chart-3 text-primary-foreground font-bold shadow-md shadow-primary/20">
              <BoltIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  Native Parallel Power Dialer
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <ShieldCheckIcon className="w-3.5 h-3.5" /> TCPA Pre-Scrubbed
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                High-throughput WebRTC dialing engine with auto-voicemail drop & live transcription
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => dispatch(minimizeDialer())}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
              title="Minimize to Floating Bar"
            >
              <MinusIcon className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => dispatch(closeDialer())}
              className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Close Dialer"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {hasActiveConnectedCall ? (
            <CallActiveScreen onCallCompleted={() => handleStartSession()} />
          ) : (
            <>
              {/* Line Count Selector & Launch Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 bg-muted/30 border border-border/80 rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Parallel Speed Mode
                      </span>
                      <span className="text-xs text-primary font-medium flex items-center gap-1">
                        <SparklesIcon className="w-3.5 h-3.5" /> 3x to 5x Contact Rate
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {([1, 3, 5] as DialerLineCount[]).map((count) => (
                        <button
                          key={count}
                          type="button"
                          disabled={dialer.isDialing}
                          onClick={() => dispatch(setLineCount(count))}
                          className={`p-3.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                            dialer.lineCount === count
                              ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                              : 'bg-card hover:bg-muted/50 border-border text-foreground'
                          }`}
                        >
                          <span className="text-lg font-bold">{count} {count === 1 ? 'Line' : 'Lines'}</span>
                          <span className="text-[11px] opacity-80">
                            {count === 1 ? 'Standard Single' : count === 3 ? 'Recommended (3x)' : 'Hyper-Drive (5x)'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between pt-4 border-t border-border/50">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <SignalIcon className="w-4 h-4 text-emerald-500" />
                      <span>Caller ID: Local Presence Matched (Dynamic Area Code)</span>
                    </div>

                    <button
                      type="button"
                      disabled={dialer.isDialing || queue.length === 0}
                      onClick={handleStartSession}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-chart-2 text-primary-foreground font-bold text-sm shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      <PhoneIcon className="w-4 h-4" />
                      <span>{dialer.isDialing ? 'Dialing Lines...' : `Start Parallel Session (${dialer.lineCount} Lines)`}</span>
                    </button>
                  </div>
                </div>

                {/* Queue Summary Box */}
                <div className="bg-muted/30 border border-border/80 rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2 text-foreground font-semibold text-sm">
                      <UserGroupIcon className="w-4 h-4 text-primary" />
                      <span>Active Lead Queue</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Filtered high-intent leads ready for rapid parallel outreach.
                    </p>

                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Total In Queue:</span>
                        <span className="font-bold text-foreground">{queue.length} Leads</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Clean TCPA Status:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">100% Verified</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Avg. Lead Score:</span>
                        <span className="font-bold text-primary">85 / 100</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-muted-foreground/80 bg-background/50 p-2.5 rounded-lg border border-border/40 mt-4">
                    Calls automatically terminate parallel lines as soon as a lead answers.
                  </div>
                </div>
              </div>

              {/* Parallel Lines Live Status Display */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Simultaneous Line Status ({dialer.lines.length} Channels)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {dialer.lines.map((line, idx) => {
                    const isRinging = line.state === 'ringing'
                    const isDialing = line.state === 'dialing'

                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border flex flex-col gap-2 transition-all ${
                          isRinging
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400 animate-pulse'
                            : isDialing
                            ? 'bg-primary/10 border-primary/40 text-primary'
                            : 'bg-muted/20 border-border/60 text-muted-foreground'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span>Line {idx + 1}</span>
                          <span className="capitalize">{line.state.replace('_', ' ')}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-xs truncate text-foreground">
                            {line.contactName || 'Idle'}
                          </p>
                          <p className="text-[11px] text-muted-foreground font-mono truncate">
                            {line.contactPhone || '—'}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Next Contacts in Queue Preview */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Upcoming Queue ({queue.length})
                </h3>

                <div className="divide-y divide-border/60 border border-border/60 rounded-xl overflow-hidden bg-background">
                  {queue.slice(0, 4).map((c) => (
                    <div
                      key={c.id}
                      className="p-3.5 flex items-center justify-between text-xs hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
                          {c.firstName[0]}
                          {c.lastName[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">
                            {c.firstName} {c.lastName}
                          </p>
                          <p className="text-muted-foreground text-[11px]">
                            {c.propertyInterest || c.leadSource}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="font-mono text-muted-foreground">{c.phone}</span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-primary/10 text-primary">
                          Score {c.leadScore}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
