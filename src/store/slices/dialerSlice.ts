import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { DialerLine, DialerLineCount, LineState } from '@/types/communication'

interface DialerState {
  isOpen: boolean
  isMinimized: boolean
  lineCount: DialerLineCount
  isDialing: boolean
  lines: DialerLine[]
  activeConnectedLineIndex: number | null
  isMuted: boolean
  isRecording: boolean
  selectedVoicemailDropId: string | null
  autoNextCall: boolean
  sessionDurationSeconds: number
  callsCompletedInSession: number
}

const initialLines = (count: DialerLineCount): DialerLine[] =>
  Array.from({ length: count }, (_, i) => ({
    lineIndex: i,
    state: 'idle' as LineState,
    callDurationSeconds: 0,
    isMuted: false,
    isRecording: true,
  }))

const initialState: DialerState = {
  isOpen: false,
  isMinimized: false,
  lineCount: 3,
  isDialing: false,
  lines: initialLines(3),
  activeConnectedLineIndex: null,
  isMuted: false,
  isRecording: true,
  selectedVoicemailDropId: 'vm-1',
  autoNextCall: true,
  sessionDurationSeconds: 0,
  callsCompletedInSession: 0,
}

export const dialerSlice = createSlice({
  name: 'dialer',
  initialState,
  reducers: {
    openDialer: (state, action: PayloadAction<{ lineCount?: DialerLineCount; minimize?: boolean } | undefined>) => {
      state.isOpen = true
      state.isMinimized = action.payload?.minimize ?? false
      if (action.payload?.lineCount) {
        state.lineCount = action.payload.lineCount
        state.lines = initialLines(action.payload.lineCount)
      }
    },
    closeDialer: (state) => {
      state.isOpen = false
      state.isMinimized = false
      state.isDialing = false
      state.activeConnectedLineIndex = null
      state.lines = initialLines(state.lineCount)
    },
    minimizeDialer: (state) => {
      state.isMinimized = true
    },
    maximizeDialer: (state) => {
      state.isMinimized = false
      state.isOpen = true
    },
    setLineCount: (state, action: PayloadAction<DialerLineCount>) => {
      state.lineCount = action.payload
      state.lines = initialLines(action.payload)
    },
    startDialingSession: (
      state,
      action: PayloadAction<{ targets: Array<{ id: string; name: string; phone: string }> }>
    ) => {
      state.isDialing = true
      state.activeConnectedLineIndex = null
      const targets = action.payload.targets

      state.lines = state.lines.map((line, idx) => {
        const target = targets[idx]
        if (target) {
          return {
            ...line,
            contactId: target.id,
            contactName: target.name,
            contactPhone: target.phone,
            state: 'dialing',
            callDurationSeconds: 0,
          }
        }
        return { ...line, state: 'idle' }
      })
    },
    updateLineState: (
      state,
      action: PayloadAction<{ lineIndex: number; state: LineState; duration?: number }>
    ) => {
      const line = state.lines[action.payload.lineIndex]
      if (line) {
        line.state = action.payload.state
        if (action.payload.duration !== undefined) {
          line.callDurationSeconds = action.payload.duration
        }
        if (action.payload.state === 'connected') {
          state.activeConnectedLineIndex = action.payload.lineIndex
          // Other dialing lines get hung up or marked idle
          state.lines.forEach((l, idx) => {
            if (idx !== action.payload.lineIndex && (l.state === 'dialing' || l.state === 'ringing')) {
              l.state = 'completed'
            }
          })
        }
      }
    },
    hangupActiveCall: (state) => {
      if (state.activeConnectedLineIndex !== null) {
        const line = state.lines[state.activeConnectedLineIndex]
        if (line) {
          line.state = 'completed'
        }
      }
      state.activeConnectedLineIndex = null
      state.isDialing = false
      state.callsCompletedInSession += 1
    },
    toggleMute: (state) => {
      state.isMuted = !state.isMuted
    },
    toggleRecording: (state) => {
      state.isRecording = !state.isRecording
    },
    setSelectedVoicemailDrop: (state, action: PayloadAction<string>) => {
      state.selectedVoicemailDropId = action.payload
    },
    toggleAutoNextCall: (state) => {
      state.autoNextCall = !state.autoNextCall
    },
    incrementSessionTimer: (state) => {
      state.sessionDurationSeconds += 1
      if (state.activeConnectedLineIndex !== null) {
        const line = state.lines[state.activeConnectedLineIndex]
        if (line && line.state === 'connected') {
          line.callDurationSeconds += 1
        }
      }
    },
  },
})

export const {
  openDialer,
  closeDialer,
  minimizeDialer,
  maximizeDialer,
  setLineCount,
  startDialingSession,
  updateLineState,
  hangupActiveCall,
  toggleMute,
  toggleRecording,
  setSelectedVoicemailDrop,
  toggleAutoNextCall,
  incrementSessionTimer,
} = dialerSlice.actions

export default dialerSlice.reducer
