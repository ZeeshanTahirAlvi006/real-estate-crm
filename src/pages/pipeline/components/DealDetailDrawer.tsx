import React, { useState } from 'react'
import type { Deal, Pipeline, PipelineStage } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { useGetContactActivityQuery } from '@/store/api/contactsApi'
import { ConvertDealModal } from '@/pages/transactions/components/ConvertDealModal'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface DealDetailDrawerProps {
  deal: Deal | null
  pipeline: Pipeline | null
  open: boolean
  onClose: () => void
  onDeleteDeal?: (id: string) => void
  onEditDeal?: (deal: Deal) => void
  onRequestStageMove?: (deal: Deal, targetStage: PipelineStage) => void
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
  pipeline,
  open,
  onClose,
  onDeleteDeal,
  onEditDeal,
  onRequestStageMove,
  onOpenCalculator,
}) => {
  const navigate = useNavigate()
  const [checklist, setChecklist] = useState(defaultChecklist)
  const [convertOpen, setConvertOpen] = useState(false)

  const { data: activities = [] } = useGetContactActivityQuery(deal?.contactId || '', {
    skip: !deal?.contactId || !open,
  })

  if (!open || !deal) return null

  const initials = deal.assignedAgentName?.split(' ').map((n) => n[0]).join('') || '?'
  const sortedStages = pipeline ? [...pipeline.stages].sort((a, b) => a.order - b.order) : []
  const currentStageIndex = sortedStages.findIndex((s) => s.id === deal.stageId)
  const currentStage = sortedStages[currentStageIndex]
  const prevStage = currentStageIndex > 0 ? sortedStages[currentStageIndex - 1] : null
  const nextStage = currentStageIndex < sortedStages.length - 1 ? sortedStages[currentStageIndex + 1] : null

  const toggleChecklistItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    )
  }

  const completedCount = checklist.filter((c) => c.done).length
  const progressPercent = Math.round((completedCount / checklist.length) * 100)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white dark:bg-[#202B2F] border-l border-[#D8E2D6] dark:border-[#618764] shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-[#D8E2D6] dark:border-[#618764]/60 flex items-start justify-between gap-4 bg-[#F5F7F4] dark:bg-[#273338]">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-[#273338] dark:text-white truncate">
                {deal.contactName}
              </h2>
              {deal.isConvertedToEscrow ? (
                <Badge className="bg-[#618764]/20 text-[#2B5748] dark:text-[#9CB080] border-[#618764] text-[10px] font-bold">
                  In Escrow
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase font-bold border-[#618764]/40 text-[#2B5748] dark:text-[#E2ECE4]"
                >
                  {deal.priority}
                </Badge>
              )}
            </div>
            <p className="text-xs text-[#75887E] dark:text-[#A0B2A6] truncate flex items-center gap-1">
              <MaterialIcon name="location_on" size={14} className="text-[#618764]" />
              {deal.propertyAddress}
            </p>
          </div>

          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8 text-[#75887E] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white"
          >
            <MaterialIcon name="close" size={18} />
          </Button>
        </div>

        {/* Drawer Body Scroll */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* Deal Valuation Metric */}
          <div className="p-4 rounded-2xl bg-[#EDF2EB] dark:bg-[#2B5748]/30 border border-[#D8E2D6] dark:border-[#618764]/50 space-y-2">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[#75887E] dark:text-[#A0B2A6] block">
                  Contract / Deal Value
                </span>
                <span className="text-2xl font-black text-[#273338] dark:text-white font-mono">
                  ${deal.dealValue.toLocaleString()}
                </span>
              </div>
              {currentStage && (
                <div className="text-right">
                  <span className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] block">Weighted Value</span>
                  <span className="text-sm font-bold text-[#2B5748] dark:text-[#9CB080] font-mono">
                    ${Math.round((deal.dealValue * currentStage.probability) / 100).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[#D8E2D6] dark:border-[#618764]/40 text-[11px] text-[#75887E] dark:text-[#A0B2A6]">
              <span>Est. 3% GCI: ${(deal.dealValue * 0.03).toLocaleString()}</span>
              <button
                type="button"
                onClick={() => onOpenCalculator?.(deal.dealValue)}
                className="text-[#2B5748] dark:text-[#9CB080] font-bold hover:underline flex items-center gap-1"
              >
                <MaterialIcon name="calculate" size={14} />
                <span>Commission Split</span>
              </button>
            </div>
          </div>

          {/* Sequential Stage Navigation Controls */}
          {sortedStages.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-[#F5F7F4] dark:bg-[#273338] border border-[#D8E2D6] dark:border-[#618764]/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#75887E] dark:text-[#A0B2A6]">
                  Sequential Stage Pipeline
                </span>
                {currentStage && (
                  <Badge
                    variant="outline"
                    className="text-[10px] font-bold px-2 py-0.5 border-[#618764] text-[#2B5748] dark:text-[#9CB080] bg-[#618764]/10"
                  >
                    Step #{currentStageIndex + 1}: {currentStage.name} ({currentStage.probability}%)
                  </Badge>
                )}
              </div>

              {/* Stepper Dots */}
              <div className="flex items-center gap-1 w-full pt-1">
                {sortedStages.map((stage, idx) => {
                  const isPassed = idx <= currentStageIndex
                  const isCurrent = idx === currentStageIndex
                  return (
                    <div
                      key={stage.id}
                      title={`${stage.name} (${stage.probability}%)`}
                      className={cn(
                        'flex-1 h-1.5 rounded-full transition-all',
                        isCurrent
                          ? 'h-2 shadow-xs bg-[#9CB080]'
                          : isPassed
                            ? 'bg-[#618764]'
                            : 'bg-[#D8E2D6] dark:bg-[#202B2F]'
                      )}
                    />
                  )
                })}
              </div>

              {/* Step forward / backward action buttons */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!prevStage}
                  onClick={() => prevStage && onRequestStageMove?.(deal, prevStage)}
                  className="h-8 text-xs flex-1 gap-1 border-[#D8E2D6] dark:border-[#618764]"
                >
                  <MaterialIcon name="arrow_back" size={14} />
                  {prevStage ? `Back to ${prevStage.name}` : 'At First Stage'}
                </Button>
                <Button
                  size="sm"
                  disabled={!nextStage}
                  onClick={() => nextStage && onRequestStageMove?.(deal, nextStage)}
                  className="h-8 text-xs flex-1 gap-1 font-semibold bg-[#9CB080] hover:bg-[#8CA070] text-[#273338]"
                >
                  {nextStage ? `Advance: ${nextStage.name}` : 'At Final Stage'}
                  <MaterialIcon name="arrow_forward" size={14} />
                </Button>
              </div>
            </div>
          )}

          {/* Quick Communication Actions & Escrow Conversion */}
          <div className="space-y-2">
            {deal.isConvertedToEscrow ? (
              <Button
                size="sm"
                onClick={() => {
                  navigate('/transactions')
                  onClose()
                }}
                className="w-full shadow-xs font-semibold bg-[#2B5748] hover:bg-[#23473B] text-white gap-1.5"
              >
                <MaterialIcon name="check_circle" size={16} />
                <span>In Escrow • View Milestone Hub</span>
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setConvertOpen(true)}
                className="w-full shadow-xs font-semibold bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] gap-1.5"
              >
                <MaterialIcon name="location_city" size={16} />
                <span>Open Escrow & Track Closing</span>
              </Button>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                onClick={() => {
                  navigate('/inbox')
                  onClose()
                }}
                className="shadow-xs font-semibold bg-[#618764] hover:bg-[#527355] text-white"
                title="Open WhatsApp Voice Call & Chat"
              >
                <MaterialIcon name="call" size={16} className="mr-1.5" />
                WhatsApp Call
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigate('/inbox')
                  onClose()
                }}
                className="border-[#D8E2D6] dark:border-[#618764]"
              >
                Open Inbox Thread
              </Button>
            </div>
          </div>

          {/* Property & Agent Details */}
          <div className="space-y-2.5 bg-[#F5F7F4] dark:bg-[#273338] border border-[#D8E2D6] dark:border-[#618764]/50 rounded-2xl p-4">
            <div className="flex items-start gap-2.5">
              <MaterialIcon name="location_city" size={16} className="text-[#75887E] dark:text-[#A0B2A6] shrink-0 mt-0.5" />
              <div>
                <span className="text-[#75887E] dark:text-[#A0B2A6] font-medium block">Property Address:</span>
                <span className="font-bold text-[#273338] dark:text-white text-xs">{deal.propertyAddress}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-2 border-t border-[#D8E2D6] dark:border-[#618764]/40">
              <MaterialIcon name="schedule" size={16} className="text-[#75887E] dark:text-[#A0B2A6] shrink-0" />
              <div>
                <span className="text-[#75887E] dark:text-[#A0B2A6] font-medium block">Stage Velocity:</span>
                <span className="font-semibold text-[#273338] dark:text-white">{deal.daysInStage} day(s) in current stage</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-2 border-t border-[#D8E2D6] dark:border-[#618764]/40">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="bg-[#EDF2EB] dark:bg-[#2B5748] text-[#2B5748] dark:text-[#9CB080] text-[10px] font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <span className="text-[#75887E] dark:text-[#A0B2A6] font-medium block">Assigned Agent:</span>
                <span className="font-semibold text-[#273338] dark:text-white">{deal.assignedAgentName || 'Assigned Agent'}</span>
              </div>
            </div>
          </div>

          {/* Transaction Closing Checklist */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MaterialIcon name="checklist" size={16} className="text-[#9CB080]" />
                <span className="font-bold text-xs text-[#273338] dark:text-white uppercase tracking-wider">
                  Transaction Checklist
                </span>
              </div>
              <span className="text-[11px] font-bold text-[#2B5748] dark:text-[#9CB080] font-mono">
                {progressPercent}% Complete
              </span>
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 w-full rounded-full bg-[#EDF2EB] dark:bg-[#202B2F] overflow-hidden">
              <div
                className="h-full bg-[#9CB080] rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="space-y-2 pt-1">
              {checklist.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/50 hover:border-[#9CB080] cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => toggleChecklistItem(item.id)}
                    className="h-4 w-4 rounded border-[#618764] text-[#9CB080] focus:ring-[#9CB080]"
                  />
                  <span
                    className={
                      item.done
                        ? 'line-through text-[#75887E] dark:text-[#A0B2A6]'
                        : 'font-medium text-[#273338] dark:text-white'
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
            <div className="p-3.5 rounded-xl bg-[#F5F7F4] dark:bg-[#273338] border border-[#D8E2D6] dark:border-[#618764]/50 space-y-1">
              <span className="text-[11px] font-semibold text-[#75887E] dark:text-[#A0B2A6]">Deal Notes:</span>
              <p className="text-xs text-[#273338] dark:text-white leading-relaxed">{deal.notes}</p>
            </div>
          )}

          {/* Activity Timeline */}
          {activities.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-1.5 text-[#75887E] dark:text-[#A0B2A6]">
                <MaterialIcon name="schedule" size={16} />
                <span className="font-bold text-xs uppercase tracking-wider">
                  Recent Contact Activity ({activities.length})
                </span>
              </div>
              <div className="space-y-2 border-l-2 border-[#D8E2D6] dark:border-[#618764]/60 ml-2 pl-3">
                {activities.slice(0, 5).map((act) => (
                  <div key={act.id} className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-[#273338] dark:text-white">
                        {act.description}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] block">
                      {new Date(act.createdAt).toLocaleString()} • {act.createdBy || 'System'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#D8E2D6] dark:border-[#618764]/60 flex items-center justify-between gap-2 bg-[#F5F7F4] dark:bg-[#273338]">
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              if (window.confirm(`Are you sure you want to archive deal for "${deal.contactName}"?`)) {
                onDeleteDeal?.(deal.id)
                onClose()
                toast.success('Deal archived')
              }
            }}
            className="h-8 text-xs font-semibold gap-1"
          >
            <MaterialIcon name="delete" size={16} />
            <span>Archive</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEditDeal?.(deal)}
              className="h-8 text-xs font-semibold gap-1 border-[#D8E2D6] dark:border-[#618764]"
            >
              <MaterialIcon name="edit" size={14} />
              <span>Edit Deal</span>
            </Button>
            <Button size="sm" onClick={onClose} className="h-8 text-xs font-bold bg-[#9CB080] hover:bg-[#8CA070] text-[#273338]">
              Done
            </Button>
          </div>
        </div>
      </div>

      {/* Escrow Conversion Modal */}
      {convertOpen && (
        <ConvertDealModal
          open={convertOpen}
          onOpenChange={setConvertOpen}
          deal={deal}
        />
      )}
    </>
  )
}
