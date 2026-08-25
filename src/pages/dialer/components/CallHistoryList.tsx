import React, { useState } from 'react'
import type { CallLog } from '@/types/communication'
import {
  PlayIcon,
  PauseIcon,
  DocumentTextIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'

interface CallHistoryListProps {
  logs: CallLog[]
}

export const CallHistoryList: React.FC<CallHistoryListProps> = ({ logs }) => {
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)
  const [playingLogId, setPlayingLogId] = useState<string | null>(null)

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60)
    const secs = sec % 60
    return `${mins}m ${secs}s`
  }

  const formatDisposition = (disp: string) => {
    return disp
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const togglePlay = (id: string) => {
    setPlayingLogId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-border/60 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-foreground">Recent Call Activity Logs</h3>
          <p className="text-xs text-muted-foreground">
            Complete audio recordings, sentiment tags, and AI transcription summaries
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold">
          {logs.length} Recorded Calls
        </span>
      </div>

      <div className="divide-y divide-border/50">
        {logs.map((log) => {
          const isExpanded = expandedLogId === log.id
          const isPlaying = playingLogId === log.id

          return (
            <div key={log.id} className="p-4 hover:bg-muted/30 transition-colors space-y-3">
              {/* Top Row: Contact Name, Disposition, Duration, Play button */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                    {log.contactName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-foreground">{log.contactName}</span>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {log.contactPhone}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Agent: {log.agentName} • {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Disposition badge */}
                  <span
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium border ${
                      log.disposition === 'showing_requested' || log.disposition === 'interested'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        : log.disposition === 'voicemail_left'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        : 'bg-muted text-muted-foreground border-border/60'
                    }`}
                  >
                    {formatDisposition(log.disposition)}
                  </span>

                  {/* Lines indicator */}
                  <span className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                    {log.linesUsed}L
                  </span>

                  {/* Audio Playback button */}
                  <button
                    type="button"
                    onClick={() => togglePlay(log.id)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      isPlaying
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/60 hover:bg-muted text-foreground border-border/80'
                    }`}
                  >
                    {isPlaying ? <PauseIcon className="w-3.5 h-3.5" /> : <PlayIcon className="w-3.5 h-3.5" />}
                    <span>{isPlaying ? 'Playing' : formatSeconds(log.durationSeconds)}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground text-xs"
                    title="View Transcript & AI Summary"
                  >
                    <DocumentTextIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Expandable Live Transcript and AI Summary */}
              {isExpanded && (
                <div className="mt-3 p-4 bg-muted/40 rounded-xl border border-border/60 space-y-3 animate-in fade-in duration-150">
                  {log.aiSummary && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                        <SparklesIcon className="w-3.5 h-3.5" />
                        <span>AI Call Summary</span>
                      </div>
                      <p className="text-xs text-foreground bg-background/80 p-2.5 rounded-lg border border-border/40 leading-relaxed">
                        {log.aiSummary}
                      </p>
                    </div>
                  )}

                  {log.liveTranscript && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Full Call Transcription
                      </span>
                      <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap font-sans bg-background/80 p-2.5 rounded-lg border border-border/40 leading-relaxed">
                        {log.liveTranscript}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
