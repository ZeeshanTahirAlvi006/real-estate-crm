import React, { useState, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  hangupActiveCall,
  toggleMute,
  toggleRecording,
} from '@/store/slices/dialerSlice'
import { useSaveCallDispositionMutation } from '@/store/api/communicationApi'
import { AudioWaveform } from './AudioWaveform'
import { VoicemailDropSelect } from './VoicemailDropSelect'
import type { CallDisposition } from '@/types/communication'
import {
  PhoneXMarkIcon,
  MicrophoneIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { toast } from 'sonner'

interface CallActiveScreenProps {
  onCallCompleted?: () => void
}

const mockSimulatedTranscripts = [
  "Lead: Hello, who is this?",
  "Agent: Hi! This is Sarah from PropPulse Realty following up regarding your property inquiry.",
  "Lead: Oh yes! I was looking at the 4-bedroom home on Highland.",
  "Lead: Is the property still taking private tours this weekend?",
  "Agent: Yes absolutely! We have walkthrough slots open this Saturday at 11 AM and 2 PM.",
  "Lead: Saturday at 2 PM works best for my family.",
]

export const CallActiveScreen: React.FC<CallActiveScreenProps> = ({ onCallCompleted }) => {
  const dispatch = useAppDispatch()
  const dialer = useAppSelector((state) => state.dialer)
  const [saveDisposition, { isLoading: isSaving }] = useSaveCallDispositionMutation()

  const activeLine =
    dialer.activeConnectedLineIndex !== null
      ? dialer.lines[dialer.activeConnectedLineIndex]
      : null

  const [notes, setNotes] = useState('')
  const [selectedDisposition, setSelectedDisposition] = useState<CallDisposition>('interested')
  const [transcriptLines, setTranscriptLines] = useState<string[]>([])

  // Stream live transcript simulation while call is active
  useEffect(() => {
    if (!activeLine || activeLine.state !== 'connected') {
      return
    }

    setTranscriptLines([mockSimulatedTranscripts[0]])
    let idx = 1
    const interval = setInterval(() => {
      if (idx < mockSimulatedTranscripts.length) {
        setTranscriptLines((prev) => [...prev, mockSimulatedTranscripts[idx]])
        idx++
      }
    }, 3500)

    return () => clearInterval(interval)
  }, [activeLine?.contactId])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleHangup = () => {
    dispatch(hangupActiveCall())
  }

  const handleVoicemailDrop = (_dropId: string) => {
    toast.success('Voicemail drop dispatched. Disconnecting line...')
    handleHangup()
  }

  const handleSaveAndNext = async () => {
    if (!activeLine?.contactId) return

    try {
      await saveDisposition({
        contactId: activeLine.contactId,
        contactName: activeLine.contactName || 'Lead Contact',
        contactPhone: activeLine.contactPhone || '+1 (555) 000-0000',
        durationSeconds: activeLine.callDurationSeconds || 45,
        disposition: selectedDisposition,
        notes,
        linesUsed: dialer.lineCount,
      }).unwrap()

      toast.success('Call disposition saved successfully')
      setNotes('')
      onCallCompleted?.()
    } catch (err) {
      toast.error('Failed to save call disposition')
    }
  }

  if (!activeLine) {
    return null
  }

  return (
    <div className="bg-card border border-border/80 rounded-2xl shadow-xl p-6 flex flex-col gap-6">
      {/* Top Bar: Contact Info & Call Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold text-lg border border-primary/20">
            {activeLine.contactName
              ? activeLine.contactName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
              : 'LC'}
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-foreground">
                {activeLine.contactName || 'Dialing Contact...'}
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Line {activeLine.lineIndex + 1} Connected
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              {activeLine.contactPhone} • WebRTC HD Audio (Low Latency)
            </p>
          </div>
        </div>

        {/* Audio Wave & Timer */}
        <div className="flex items-center gap-4 bg-muted/40 px-4 py-2 rounded-xl border border-border/50">
          <AudioWaveform
            isActive={activeLine.state === 'connected'}
            isMuted={dialer.isMuted}
            barCount={20}
          />
          <div className="text-right">
            <span className="text-xs text-muted-foreground uppercase font-medium">Duration</span>
            <p className="text-lg font-mono font-bold text-foreground">
              {formatDuration(activeLine.callDurationSeconds)}
            </p>
          </div>
        </div>
      </div>

      {/* Mid Section: Live AI Transcription & Call Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Real-time Live Transcript */}
        <div className="flex flex-col h-64 bg-background/80 rounded-xl border border-border/80 p-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/40 mb-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <SparklesIcon className="w-4 h-4 animate-pulse" />
              <span>Real-Time AI Live Transcription</span>
            </div>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block animate-ping"></span>
              Streaming (Whisper Live)
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
            {transcriptLines.map((line, idx) => {
              const isAgent = line.startsWith('Agent:')
              return (
                <div
                  key={idx}
                  className={`p-2 rounded-lg max-w-[90%] leading-relaxed ${
                    isAgent
                      ? 'ml-auto bg-primary/10 text-primary-foreground border border-primary/20 text-foreground'
                      : 'bg-muted/60 text-foreground border border-border/40'
                  }`}
                >
                  <p className="font-semibold text-[10px] text-muted-foreground mb-0.5">
                    {isAgent ? 'You (Agent)' : activeLine.contactName || 'Lead'}
                  </p>
                  <p>{line.replace(/^(Agent|Lead):\s*/, '')}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Call Notes & Disposition Input */}
        <div className="flex flex-col h-64 bg-background/80 rounded-xl border border-border/80 p-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/40 mb-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <DocumentTextIcon className="w-4 h-4 text-muted-foreground" />
              <span>Call Notes & Log</span>
            </div>
            <span className="text-[11px] text-muted-foreground">Auto-saved on disposition</span>
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Type live call notes, buyer preferences, or objections discussed..."
            className="flex-1 w-full resize-none rounded-lg bg-muted/30 border border-border/60 p-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />

          <div className="mt-3 flex items-center justify-between gap-2">
            <label className="text-xs font-medium text-muted-foreground">Call Disposition:</label>
            <select
              value={selectedDisposition}
              onChange={(e) => setSelectedDisposition(e.target.value as CallDisposition)}
              className="h-8 px-2 rounded-md bg-muted text-xs font-medium border border-border/70 focus:outline-none"
            >
              <option value="interested">Interested - High Intent</option>
              <option value="showing_requested">Showing Requested</option>
              <option value="nurture_long_term">Nurture Long Term</option>
              <option value="voicemail_left">Voicemail Left</option>
              <option value="call_back_later">Call Back Later</option>
              <option value="not_interested">Not Interested</option>
              <option value="wrong_number">Wrong Number</option>
              <option value="dnc_requested">TCPA Do Not Call</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Action Controls & Voicemail Drop */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border/60 bg-muted/20 -mx-6 -mb-6 p-4 rounded-b-2xl">
        {/* Voicemail Drop Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground hidden sm:inline">1-Click Drop:</span>
          <VoicemailDropSelect
            onDrop={handleVoicemailDrop}
            disabled={activeLine.state !== 'connected'}
          />
        </div>

        {/* Call Manipulation Buttons */}
        <div className="flex items-center gap-2">
          {/* Mute */}
          <button
            type="button"
            onClick={() => dispatch(toggleMute())}
            className={`p-2.5 rounded-xl border font-medium text-xs transition-colors flex items-center gap-1.5 ${
              dialer.isMuted
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400'
                : 'bg-background hover:bg-muted border-border text-foreground'
            }`}
            title={dialer.isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            <MicrophoneIcon className="w-4 h-4" />
            <span className="hidden md:inline">{dialer.isMuted ? 'Unmute' : 'Mute'}</span>
          </button>

          {/* Recording */}
          <button
            type="button"
            onClick={() => dispatch(toggleRecording())}
            className={`p-2.5 rounded-xl border font-medium text-xs transition-colors flex items-center gap-1.5 ${
              dialer.isRecording
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-background hover:bg-muted border-border text-muted-foreground'
            }`}
            title="Toggle Call Recording"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                dialer.isRecording ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'
              }`}
            />
            <span className="hidden md:inline">Rec</span>
          </button>

          {/* End Call / Hangup */}
          {activeLine.state === 'connected' ? (
            <button
              type="button"
              onClick={handleHangup}
              className="px-5 py-2.5 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold text-xs flex items-center gap-2 shadow-lg shadow-destructive/20 transition-all hover:scale-[1.02]"
            >
              <PhoneXMarkIcon className="w-4 h-4" />
              <span>End Call</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSaveAndNext}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs flex items-center gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] disabled:opacity-50"
            >
              <CheckCircleIcon className="w-4 h-4" />
              <span>Save & Next Lead</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
