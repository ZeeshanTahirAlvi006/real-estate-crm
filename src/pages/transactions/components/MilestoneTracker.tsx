import React, { useState } from 'react'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useUpdateMilestoneMutation } from '@/store/api/transactionsApi'
import { toast } from 'sonner'
import type { MilestoneDto, MilestoneStatus } from '@/types/transaction'

interface MilestoneTrackerProps {
  transactionId: string
  milestones: MilestoneDto[]
  readOnly?: boolean
}

export const MilestoneTracker: React.FC<MilestoneTrackerProps> = ({
  transactionId,
  milestones,
  readOnly = false,
}) => {
  const [updateMilestone, { isLoading }] = useUpdateMilestoneMutation()
  const [editingMilestone, setEditingMilestone] = useState<MilestoneDto | null>(null)
  const [editNotes, setEditNotes] = useState('')
  const [editDueDate, setEditDueDate] = useState('')

  const handleQuickStatus = async (m: MilestoneDto, nextStatus: MilestoneStatus) => {
    if (readOnly) return
    try {
      await updateMilestone({
        transactionId,
        milestoneId: m.id,
        payload: { status: nextStatus },
      }).unwrap()
      toast.success(`Milestone marked as ${nextStatus.replace('_', ' ')}`)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to update milestone')
    }
  }

  const handleOpenEdit = (m: MilestoneDto) => {
    setEditingMilestone(m)
    setEditNotes(m.notes || '')
    setEditDueDate(m.dueDate ? m.dueDate.split('T')[0] : '')
  }

  const handleSaveEdit = async () => {
    if (!editingMilestone) return
    try {
      await updateMilestone({
        transactionId,
        milestoneId: editingMilestone.id,
        payload: {
          status: editingMilestone.status,
          notes: editNotes,
          dueDate: editDueDate ? new Date(editDueDate).toISOString() : undefined,
        },
      }).unwrap()
      toast.success('Milestone details updated')
      setEditingMilestone(null)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to update milestone details')
    }
  }

  const sortedMilestones = [...milestones].sort((a, b) => a.order - b.order)

  return (
    <div className="space-y-4">
      {/* 
        Precision Vertical Stepper:
        The connecting line is positioned at left-4 (16px) with w-0.5 (2px) and -translate-x-1/2,
        which aligns through the 32px (w-8) circular icons (center = 16px).
      */}
      <div className="relative space-y-5">
        {/* Continuous Connecting Line */}
        <div className="absolute top-6 bottom-6 left-4 -translate-x-1/2 w-0.5 bg-[#D8E2D6] dark:bg-[#618764]/60 z-0" />

        {sortedMilestones.map((m, idx) => {
          const isCompleted = m.status === 'completed'
          const isInProgress = m.status === 'in_progress'
          const isSkipped = m.status === 'skipped'
          const isPending = m.status === 'pending'

          return (
            <div
              key={m.id}
              className="relative flex items-start gap-3 sm:gap-4 group transition-all duration-300"
              style={{
                animation: 'cascadeReveal 0.5s ease-out both',
                animationDelay: `${idx * 90}ms`,
              }}
            >
              {/* Stepper Node Indicator — Centered on the Line */}
              <div
                className={`mt-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-transform duration-200 group-hover:scale-110 shadow-xs z-10 ${
                  isCompleted
                    ? 'bg-[#9CB080] border-[#9CB080] text-[#273338] shadow-[#9CB080]/30'
                    : isInProgress
                      ? 'bg-[#618764] border-[#9CB080] text-white ring-4 ring-[#9CB080]/20 animate-pulse'
                      : isSkipped
                        ? 'bg-[#EDF2EB] dark:bg-[#1A2E26] border-[#D8E2D6] dark:border-[#618764] text-[#75887E] dark:text-[#A0B2A6]'
                        : 'bg-red-500/15 dark:bg-red-500/25 border-red-500 text-red-600 dark:text-red-400 ring-2 ring-red-500/20'
                }`}
              >
                {isCompleted ? (
                  <MaterialIcon name="check" size={18} />
                ) : isSkipped ? (
                  <MaterialIcon name="fast_forward" size={15} />
                ) : isInProgress ? (
                  <MaterialIcon name="hourglass_top" size={15} />
                ) : (
                  <span className="text-[11px] font-bold font-mono">{idx + 1}</span>
                )}
              </div>

              {/* Milestone Card with Parallax Hover Shift */}
              <div
                className={`flex-1 min-w-0 p-4 rounded-xl border transition-all duration-200 transform group-hover:-translate-y-0.5 group-hover:translate-x-1 group-hover:shadow-md ${
                  isCompleted
                    ? 'bg-white dark:bg-[#254238] border-[#D8E2D6] dark:border-[#618764] hover:border-[#9CB080]'
                    : isInProgress
                      ? 'bg-[#EDF2EB]/50 dark:bg-[#1A2E26]/70 border-[#9CB080] ring-1 ring-[#9CB080]/40'
                      : isSkipped
                        ? 'bg-[#F5F7F4] dark:bg-[#202B2F] border-[#D8E2D6]/70 dark:border-[#618764]/40 opacity-70'
                        : 'bg-white dark:bg-[#254238] border-red-500/30 hover:border-red-500/60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-[#273338] dark:text-white group-hover:text-[#2B5748] dark:group-hover:text-[#9CB080] transition-colors">
                        {m.title}
                      </h4>

                      {/* Prominent Red Background for Pending Status Badge */}
                      {isPending ? (
                        <Badge className="text-[10px] font-bold uppercase tracking-wider bg-red-600 hover:bg-red-700 text-white shadow-xs border-transparent">
                          Pending
                        </Badge>
                      ) : isCompleted ? (
                        <Badge className="text-[10px] font-bold uppercase tracking-wider bg-[#9CB080]/20 text-[#2B5748] dark:text-[#9CB080] border border-[#9CB080]/30">
                          Completed
                        </Badge>
                      ) : isInProgress ? (
                        <Badge className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                          In Progress
                        </Badge>
                      ) : (
                        <Badge className="text-[10px] font-bold uppercase tracking-wider bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#75887E] dark:text-[#A0B2A6] border border-[#D8E2D6] dark:border-[#618764]/40">
                          Skipped
                        </Badge>
                      )}
                    </div>

                    {m.notes && (
                      <p className="text-xs text-[#4A5D54] dark:text-[#A0B2A6] mt-1 leading-relaxed">
                        {m.notes}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-[11px] text-[#75887E] dark:text-[#A0B2A6] pt-1">
                      {m.dueDate && (
                        <span className="flex items-center gap-1 font-mono">
                          <MaterialIcon name="event" size={13} className="text-[#618764] dark:text-[#9CB080]" />
                          Target: {new Date(m.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      {m.completedAt && (
                        <span className="flex items-center gap-1 font-mono text-[#2B5748] dark:text-[#9CB080] font-semibold">
                          <MaterialIcon name="task_alt" size={13} />
                          Closed: {new Date(m.completedAt).toLocaleDateString()}
                          {m.completedByName ? ` (${m.completedByName})` : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {!readOnly && (
                    <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center pt-2 sm:pt-0">
                      {m.status !== 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs font-bold gap-1 bg-[#9CB080]/15 hover:bg-[#9CB080] text-[#2B5748] dark:text-[#9CB080] hover:text-[#273338] border-[#9CB080]/40 transition-colors cursor-pointer"
                          onClick={() => handleQuickStatus(m, 'completed')}
                          disabled={isLoading}
                        >
                          <MaterialIcon name="check" size={14} />
                          <span>Complete</span>
                        </Button>
                      )}

                      {m.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs font-semibold gap-1 bg-[#EDF2EB] dark:bg-[#1A2E26] hover:bg-[#618764] text-[#273338] dark:text-white border-[#D8E2D6] dark:border-[#618764] transition-colors cursor-pointer"
                          onClick={() => handleQuickStatus(m, 'in_progress')}
                          disabled={isLoading}
                        >
                          <MaterialIcon name="play_arrow" size={14} />
                          <span>Start</span>
                        </Button>
                      )}

                      {m.status === 'completed' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-[#75887E] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white"
                          onClick={() => handleQuickStatus(m, 'in_progress')}
                          disabled={isLoading}
                        >
                          Reopen
                        </Button>
                      )}

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-[#75887E] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white hover:bg-[#EDF2EB] dark:hover:bg-[#1A2E26]"
                        onClick={() => handleOpenEdit(m)}
                        title="Edit milestone notes or due date"
                      >
                        <MaterialIcon name="edit" size={14} />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Edit Milestone Modal with Theme Colors */}
      <Dialog open={!!editingMilestone} onOpenChange={(open) => !open && setEditingMilestone(null)}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border border-[#D8E2D6] dark:border-[#618764] bg-white dark:bg-[#254238] shadow-xl rounded-2xl">
          <DialogHeader className="p-5 pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/40 bg-[#EDF2EB]/50 dark:bg-[#1A2E26]/50">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-[#273338] dark:text-white">
              <MaterialIcon name="tune" size={18} className="text-[#618764] dark:text-[#9CB080]" />
              <span>Edit Milestone: {editingMilestone?.title}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="p-5 space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#273338] dark:text-[#E2ECE4] flex items-center gap-1.5">
                <MaterialIcon name="event" size={14} className="text-[#618764] dark:text-[#9CB080]" />
                Target Due Date
              </label>
              <Input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="h-9 text-xs bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white focus:ring-1 focus:ring-[#9CB080] focus:border-[#9CB080]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#273338] dark:text-[#E2ECE4] flex items-center gap-1.5">
                <MaterialIcon name="description" size={14} className="text-[#618764] dark:text-[#9CB080]" />
                Notes & Contingency Stipulations
              </label>
              <Textarea
                rows={3}
                placeholder="Add escrow notes, attorney stipulations, or inspection items..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full text-xs rounded-lg bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white placeholder-[#75887E] dark:placeholder-[#A0B2A6] p-2.5 focus:outline-none focus:ring-1 focus:ring-[#9CB080] focus:border-[#9CB080]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#D8E2D6] dark:border-[#618764]/40">
              <Button
                variant="outline"
                size="sm"
                className="border-[#D8E2D6] dark:border-[#618764] bg-white dark:bg-[#202B2F] text-[#273338] dark:text-white hover:bg-[#EDF2EB] dark:hover:bg-[#1A2E26]"
                onClick={() => setEditingMilestone(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] font-bold shadow-xs transition-colors"
                onClick={handleSaveEdit}
                disabled={isLoading}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
