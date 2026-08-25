import React, { useState } from 'react'
import { useGetVoicemailDropsQuery } from '@/store/api/communicationApi'
import {
  MusicalNoteIcon,
  ShieldCheckIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline'

export const DialerSettings: React.FC = () => {
  const { data: voicemailDrops = [] } = useGetVoicemailDropsQuery()
  const [localPresence, setLocalPresence] = useState(true)
  const [autoNext, setAutoNext] = useState(true)

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-border/60">
        <div className="p-2 rounded-xl bg-primary/10 text-primary">
          <AdjustmentsHorizontalIcon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-foreground">Parallel Dialer Configuration</h3>
          <p className="text-xs text-muted-foreground">
            Manage telephony caller ID, local area code presence, and audio recordings
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Telephony & Caller ID */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Caller ID & Local Presence
          </h4>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/60">
              <div>
                <span className="font-semibold text-xs text-foreground block">
                  Dynamic Local Presence Matching
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Displays outgoing caller ID matching the contact's area code (+40% pickup rate)
                </span>
              </div>
              <input
                type="checkbox"
                checked={localPresence}
                onChange={(e) => setLocalPresence(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/60">
              <div>
                <span className="font-semibold text-xs text-foreground block">
                  Automatic TCPA DNC Pre-Scrub
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Instantly skips contacts registered on state/federal DNC databases
                </span>
              </div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <ShieldCheckIcon className="w-4 h-4" /> Always Active
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/60">
              <div>
                <span className="font-semibold text-xs text-foreground block">
                  Auto-Advance to Next Lead
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Launches next parallel dialing batch 3 seconds after call disposition saved
                </span>
              </div>
              <input
                type="checkbox"
                checked={autoNext}
                onChange={(e) => setAutoNext(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Voicemail Drop Library */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Voicemail Drop Presets ({voicemailDrops.length})</span>
            <button className="text-primary hover:underline text-[11px] font-medium">+ Record New Drop</button>
          </h4>

          <div className="space-y-2.5">
            {voicemailDrops.map((vm) => (
              <div
                key={vm.id}
                className="p-3 rounded-xl bg-background border border-border/70 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <MusicalNoteIcon className="w-4 h-4 text-amber-500" />
                  <div>
                    <span className="font-semibold text-foreground">{vm.title}</span>
                    <span className="text-[11px] text-muted-foreground block">
                      Category: {vm.category.replace('_', ' ')} • {vm.durationSeconds}s
                    </span>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary">
                  Ready
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
