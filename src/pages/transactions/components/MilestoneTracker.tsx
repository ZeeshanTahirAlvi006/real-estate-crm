import React, { useState } from 'react'
import {
  CheckCircleIcon,
  ClockIcon,
  ForwardIcon,
  PencilIcon,
  CalendarIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid'
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
      <div className="relative border-l-2 border-border/80 ml-4 pl-6 space-y-6">
        {sortedMilestones.map((m, idx) => {
          const isCompleted = m.status === 'completed'
          const isInProgress = m.status === 'in_progress'
          const isSkipped = m.status === 'skipped'

          return (
            <div key={m.id} className="relative group">
              {/* Stepper Dot */}
              <div
                className={`absolute -left-[35px] top-1 flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all ${
                  isCompleted
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-md'
                    : isInProgress
                      ? 'bg-primary border-primary text-primary-foreground ring-4 ring-primary/20 animate-pulse'
                      : isSkipped
                        ? 'bg-muted border-muted-foreground/40 text-muted-foreground'
                        : 'bg-card border-border text-muted-foreground'
                }`}
              >
                {isCompleted ? (
                  <CheckCircleSolid className="w-5 h-5" />
                ) : isSkipped ? (
                  <ForwardIcon className="w-3.5 h-3.5" />
                ) : isInProgress ? (
                  <ClockIcon className="w-4 h-4" />
                ) : (
                  <span className="text-xs font-bold">{idx + 1}</span>
                )}
              </div>

              {/* Milestone Card */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  isInProgress
                    ? 'bg-primary/5 border-primary/40 shadow-xs'
                    : isCompleted
                      ? 'bg-card/70 border-border/60'
                      : 'bg-card/40 border-border/40 opacity-80 group-hover:opacity-100'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-foreground">{m.title}</h4>
                      <Badge
                        variant={
                          isCompleted
                            ? 'default'
                            : isInProgress
                              ? 'secondary'
                              : isSkipped
                                ? 'outline'
                                : 'outline'
                        }
                        className={`text-[10px] font-semibold uppercase tracking-wider ${
                          isCompleted
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : isInProgress
                              ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                              : isSkipped
                                ? 'bg-muted text-muted-foreground border-border'
                                : 'bg-muted/50 text-muted-foreground border-border/60'
                        }`}
                      >
                        {m.status.replace('_', ' ')}
                      </Badge>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground uppercase font-mono">
                        {m.category}
                      </span>
                    </div>

                    {m.notes && (
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                        {m.notes}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-[11px] text-muted-foreground mt-2">
                      {m.dueDate && (
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-3.5 h-3.5 text-primary/70" />
                          Target: {new Date(m.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      {m.completedAt && (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <CheckCircleIcon className="w-3.5 h-3.5" />
                          Completed: {new Date(m.completedAt).toLocaleDateString()}
                          {m.completedByName ? ` by ${m.completedByName}` : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {!readOnly && (
                    <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
                      {m.status !== 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs font-semibold gap-1 bg-emerald-500/10 hover:bg-emerald-600 text-emerald-600 hover:text-white border-emerald-500/30"
                          onClick={() => handleQuickStatus(m, 'completed')}
                          disabled={isLoading}
                        >
                          <CheckCircleIcon className="w-3.5 h-3.5" />
                          <span>Complete</span>
                        </Button>
                      )}

                      {m.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs font-semibold gap-1 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border-primary/30"
                          onClick={() => handleQuickStatus(m, 'in_progress')}
                          disabled={isLoading}
                        >
                          <ClockIcon className="w-3.5 h-3.5" />
                          <span>Start</span>
                        </Button>
                      )}

                      {m.status === 'completed' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => handleQuickStatus(m, 'in_progress')}
                          disabled={isLoading}
                        >
                          Reopen
                        </Button>
                      )}

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => handleOpenEdit(m)}
                        title="Edit milestone notes or due date"
                      >
                        <PencilIcon className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Edit Milestone Modal */}
      <Dialog open={!!editingMilestone} onOpenChange={(open) => !open && setEditingMilestone(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DocumentTextIcon className="w-5 h-5 text-primary" />
              <span>Edit Milestone: {editingMilestone?.title}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Target Due Date
              </label>
              <Input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Notes & Conditions
              </label>
              <Textarea
                rows={3}
                placeholder="Add escrow notes, attorney stipulations, or inspection items..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEditingMilestone(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={isLoading}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
