import React, { useState } from 'react'
import type { Deal } from '@/types'
import {
  XMarkIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  CalculatorIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAppDispatch } from '@/store/hooks'
import { openDialer, startDialingSession } from '@/store/slices/dialerSlice'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { DEFAULT_PIPELINE_STAGES, STAGE_COLORS } from '@/constants/pipeline'
import { cn } from '@/lib/utils'

interface DealDetailDrawerProps {
  deal: Deal | null
  open: boolean
  onClose: () => void
  onDeleteDeal?: (id: string) => void
  onOpenCalculator?: (price: number) => void
}

const defaultChecklist = [
  { id: 'c1', label: 'Purchase Agreement Signed & Ratified', done: true },
  { id: 'c2', label: 'Earnest Money Deposit Wire Verified', done: true },
  { id: 'c3', label: 'Home Inspection Scheduled', done: false },
  { id: 'c4', label: 'Lender Appraisal Ordered', done: false },
  { id: 'c5', label: 'Title Commitment & HOA Docs Reviewed', done: false },
  { id: 'c6', label: 'Final Walkthrough & Closing Disclosure', done: false },
]

export const DealDetailDrawer: React.FC<DealDetailDrawerProps> = ({
  deal,
  open,
  onClose,
  onDeleteDeal,
  onOpenCalculator,
}) => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [checklist, setChecklist] = useState(defaultChecklist)

  if (!open || !deal) return null

  const handleCall = () => {
    dispatch(openDialer({ lineCount: 1 }))
    dispatch(
      startDialingSession({
        targets: [
          {
            id: deal.contactId,
            name: deal.contactName,
            phone: '+1 (555) 234-5678',
          },
        ],
      })
    )
  }

  const toggleChecklistItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    )
    toast.success('Checklist item updated')
  }

  const initials = deal.assignedAgentName?.split(' ').map((n) => n[0]).join('') || '?'
  const completedCount = checklist.filter((c) => c.done).length
  const progressPercent = Math.round((completedCount / checklist.length) * 100)

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-104 bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Deal Overview
          </span>
          <h3 className="font-bold text-base text-foreground mt-0.5">{deal.contactName}</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
        {/* Deal Financial Snapshot */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-chart-3/5 to-chart-2/10 border border-primary/20 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground font-semibold">Sale Price / Value</span>
            <Badge variant="outline" className="font-bold text-xs uppercase">
              {deal.priority} Priority
            </Badge>
          </div>
          <p className="text-3xl font-black text-foreground font-mono">
            ${deal.dealValue.toLocaleString()}
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
            <span>Est. 3% GCI: ${(deal.dealValue * 0.03).toLocaleString()}</span>
            <button
              type="button"
              onClick={() => onOpenCalculator?.(deal.dealValue)}
              className="text-primary font-bold hover:underline flex items-center gap-1"
            >
              <CalculatorIcon className="w-3.5 h-3.5" />
              <span>Calculate Split</span>
            </button>
          </div>
        </div>

        {/* Quick Communication Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" onClick={handleCall} className="shadow-xs font-semibold">
            <PhoneIcon className="w-4 h-4 mr-1.5" />
            Call Lead
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigate('/inbox')
              onClose()
            }}
          >
            <ChatBubbleLeftRightIcon className="w-4 h-4 mr-1.5" />
            Send Message
          </Button>
        </div>

        {/* Property & Agent Details */}
        <div className="space-y-2.5 bg-muted/30 border border-border/70 rounded-2xl p-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <span className="text-muted-foreground font-medium">Pipeline Stage:</span>
            <Badge variant="outline" className={cn('text-[11px] font-bold px-2 py-0.5', STAGE_COLORS[deal.stageId] || 'bg-primary/10 text-primary')}>
              {DEFAULT_PIPELINE_STAGES.find((s) => s.id === deal.stageId)?.name || deal.stageName || deal.stageId}
            </Badge>
          </div>

          <div className="flex items-start gap-2.5">
            <BuildingOfficeIcon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <span className="text-muted-foreground font-medium block">Property Address:</span>
              <span className="font-bold text-foreground text-xs">{deal.propertyAddress}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 pt-2 border-t border-border/40">
            <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
            <div>
              <span className="text-muted-foreground font-medium block">Stage Velocity:</span>
              <span className="font-semibold text-foreground">{deal.daysInStage} days in current stage</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 pt-2 border-t border-border/40">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <span className="text-muted-foreground font-medium block">Assigned Agent:</span>
              <span className="font-semibold text-foreground">{deal.assignedAgentName || 'Sarah Jenkins'}</span>
            </div>
          </div>
        </div>

        {/* Transaction Closing Checklist */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <CheckCircleIcon className="w-4 h-4 text-primary" />
              <span className="font-bold text-xs text-foreground uppercase tracking-wider">
                Transaction Milestone Checklist
              </span>
            </div>
            <span className="text-[11px] font-bold text-emerald-500 font-mono">
              {progressPercent}% Complete
            </span>
          </div>

          {/* Progress Bar */}
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="space-y-2 pt-1">
            {checklist.map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-background border border-border/60 hover:bg-muted/30 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => toggleChecklistItem(item.id)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <span
                  className={
                    item.done
                      ? 'line-through text-muted-foreground'
                      : 'font-medium text-foreground'
                  }
                >
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Notes */}
        {deal.notes && (
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground">Deal Notes:</span>
            <p className="text-xs text-foreground leading-relaxed">{deal.notes}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      {onDeleteDeal && (
        <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => {
              onDeleteDeal(deal.id)
              onClose()
            }}
          >
            <TrashIcon className="w-4 h-4 mr-1" />
            Delete Deal
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      )}
    </div>
  )
}
