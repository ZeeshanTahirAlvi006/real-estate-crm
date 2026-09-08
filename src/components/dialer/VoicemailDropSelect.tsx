import React from 'react'
import { useGetVoicemailDropsQuery } from '@/store/api/communicationApi'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setSelectedVoicemailDrop } from '@/store/slices/dialerSlice'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline'

interface VoicemailDropSelectProps {
  onDrop?: (dropId: string) => void
  disabled?: boolean
}

export const VoicemailDropSelect: React.FC<VoicemailDropSelectProps> = ({
  onDrop,
  disabled = false,
}) => {
  const dispatch = useAppDispatch()
  const selectedDropId = useAppSelector((state) => state.dialer.selectedVoicemailDropId)
  const { data: voicemailDrops = [], isLoading } = useGetVoicemailDropsQuery()

  const currentDrop = voicemailDrops.find((vm) => vm.id === selectedDropId) || voicemailDrops[0]

  return (
    <div className="flex items-center gap-2">
      <Select
        value={selectedDropId || (voicemailDrops[0]?.id ?? '')}
        onValueChange={(val) => {
          if (val) dispatch(setSelectedVoicemailDrop(val))
        }}
        disabled={disabled || isLoading}
      >
        <SelectTrigger className="h-9 w-60 text-xs bg-background/80 border-border/80">
          <SelectValue placeholder="Select Voicemail Drop..." />
        </SelectTrigger>
        <SelectContent>
          {voicemailDrops.map((vm) => (
            <SelectItem key={vm.id} value={vm.id} className="text-xs">
              <span className="font-medium">{vm.title}</span>{' '}
              <span className="text-muted-foreground">({vm.durationSeconds}s)</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {onDrop && (
        <button
          type="button"
          disabled={disabled || !currentDrop}
          onClick={() => currentDrop && onDrop(currentDrop.id)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 font-medium text-xs border border-amber-500/30 transition-colors disabled:opacity-50"
          title="Instant 1-Click Voicemail Drop & Disconnect"
        >
          <ArrowDownTrayIcon className="w-3.5 h-3.5" />
          <span>Drop VM ({currentDrop ? `${currentDrop.durationSeconds}s` : ''})</span>
        </button>
      )}
    </div>
  )
}
