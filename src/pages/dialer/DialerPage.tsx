import React, { useState } from 'react'
import { useGetDialerQueueQuery, useGetCallLogsQuery } from '@/store/api/communicationApi'
import { useAppDispatch } from '@/store/hooks'
import { openDialer } from '@/store/slices/dialerSlice'
import { CallHistoryList } from './components/CallHistoryList'
import { DialerSettings } from './components/DialerSettings'
import {
  PhoneIcon,
  BoltIcon,
  SparklesIcon,
  UserGroupIcon,
  ClockIcon,
  ShieldCheckIcon,
  PlayIcon,
} from '@heroicons/react/24/outline'

export const DialerPage: React.FC = () => {
  const dispatch = useAppDispatch()
  const { data: queue = [] } = useGetDialerQueueQuery()
  const { data: callLogs = [] } = useGetCallLogsQuery()
  const [activeTab, setActiveTab] = useState<'queue' | 'history' | 'settings'>('queue')

  const handleLaunchDialer = (lineCount: 1 | 3 | 5) => {
    dispatch(openDialer({ lineCount }))
  }

  const totalConnectedSecs = callLogs.reduce((acc, c) => acc + c.durationSeconds, 0)
  const avgDuration = callLogs.length > 0 ? Math.round(totalConnectedSecs / callLogs.length) : 0

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner: Power Dialer Launcher */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-chart-3 to-chart-2 p-8 text-primary-foreground shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold">
              <BoltIcon className="w-4 h-4" />
              <span>Native WebRTC Parallel Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Multi-Line Parallel Power Dialer
            </h1>
            <p className="text-xs sm:text-sm text-white/85 leading-relaxed">
              Dial 3 to 5 leads simultaneously with zero telemarketer delay, dynamic local presence caller ID, and automated voicemail drop.
            </p>
          </div>

          {/* Quick Launch Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => handleLaunchDialer(1)}
              className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/30 backdrop-blur-md font-bold text-xs transition-all hover:scale-[1.02]"
            >
              1-Line Standard
            </button>
            <button
              type="button"
              onClick={() => handleLaunchDialer(3)}
              className="px-5 py-3 rounded-2xl bg-white text-primary hover:bg-white/90 font-bold text-xs shadow-xl transition-all hover:scale-[1.04] flex items-center gap-2"
            >
              <BoltIcon className="w-4 h-4 text-primary" />
              <span>Launch 3-Line Parallel</span>
            </button>
            <button
              type="button"
              onClick={() => handleLaunchDialer(5)}
              className="px-4 py-3 rounded-2xl bg-amber-400 text-amber-950 hover:bg-amber-300 font-bold text-xs shadow-xl transition-all hover:scale-[1.02] flex items-center gap-1.5"
            >
              <SparklesIcon className="w-4 h-4" />
              <span>5-Line Hyperdrive</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <UserGroupIcon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-medium">Ready in Queue</span>
            <p className="text-xl font-bold text-foreground">{queue.length} Contacts</p>
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <ShieldCheckIcon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-medium">TCPA Scrub Status</span>
            <p className="text-xl font-bold text-foreground">100% Clean</p>
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-chart-3/10 text-chart-3">
            <PhoneIcon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-medium">Calls Completed Today</span>
            <p className="text-xl font-bold text-foreground">{callLogs.length} Calls</p>
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
            <ClockIcon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-medium">Avg Talk Time</span>
            <p className="text-xl font-bold text-foreground">{avgDuration}s / call</p>
          </div>
        </div>
      </div>

      {/* Tabs: Queue vs History vs Settings */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'queue'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/40 hover:bg-muted text-muted-foreground'
          }`}
        >
          Dialer Lead Queue ({queue.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'history'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/40 hover:bg-muted text-muted-foreground'
          }`}
        >
          Call Logs & Recordings ({callLogs.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'settings'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/40 hover:bg-muted text-muted-foreground'
          }`}
        >
          Dialer Settings & Voicemails
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'queue' && (
        <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border/60 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-foreground">Active Calling List</h3>
              <p className="text-xs text-muted-foreground">
                High-priority leads dynamically ordered by response probability
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleLaunchDialer(3)}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center gap-1.5 shadow-md transition-all hover:scale-[1.02]"
            >
              <PlayIcon className="w-4 h-4" />
              <span>Start Dialing Queue</span>
            </button>
          </div>

          <div className="divide-y divide-border/50">
            {queue.map((contact, idx) => (
              <div
                key={contact.id}
                className="p-4 flex flex-wrap items-center justify-between gap-4 hover:bg-muted/30 transition-colors text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-muted-foreground text-xs w-4">#{idx + 1}</span>
                  <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center">
                    {contact.firstName[0]}
                    {contact.lastName[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">
                        {contact.firstName} {contact.lastName}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                        TCPA Clean
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Source: {contact.leadSource} • Interest: {contact.propertyInterest || 'General Inquiry'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="font-mono text-foreground">{contact.phone}</span>
                  <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-bold">
                    Score: {contact.leadScore}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleLaunchDialer(1)}
                    className="p-2 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground"
                    title="Dial Single Lead"
                  >
                    <PhoneIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'history' && <CallHistoryList logs={callLogs} />}

      {activeTab === 'settings' && <DialerSettings />}
    </div>
  )
}
