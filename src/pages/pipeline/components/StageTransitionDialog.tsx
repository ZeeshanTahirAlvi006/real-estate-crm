import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRightIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import type { Deal, PipelineStage } from '@/types'

interface StageTransitionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deal: Deal | null
  fromStage: PipelineStage | null
  toStage: PipelineStage | null
  onConfirm: () => Promise<void>
  isLoading?: boolean
}

export const StageTransitionDialog: React.FC<StageTransitionDialogProps> = ({
  open,
  onOpenChange,
  deal,
  fromStage,
  toStage,
  onConfirm,
  isLoading = false,
}) => {
  if (!deal || !fromStage || !toStage) return null

  // Check if transition is sequential (difference in order must be 1)
  const isSequential = Math.abs(toStage.order - fromStage.order) === 1
  const isAdvancing = toStage.order > fromStage.order

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-border/80 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <span>Confirm Stage Transition</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Moving deal for <strong className="text-foreground font-semibold">{deal.contactName}</strong> ({deal.propertyAddress})
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Stage Transition Visual */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border/60">
            {/* From Stage */}
            <div className="flex flex-col items-center gap-1.5 flex-1 text-center">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Current Stage</span>
              <Badge
                variant="outline"
                className="px-2.5 py-1 text-xs font-semibold"
                style={{
                  borderColor: `${fromStage.color}50`,
                  backgroundColor: `${fromStage.color}15`,
                  color: fromStage.color,
                }}
              >
                {fromStage.name}
              </Badge>
              <span className="text-[10px] text-muted-foreground font-mono">
                Order #{fromStage.order + 1} ({fromStage.probability}%)
              </span>
            </div>

            {/* Arrow */}
            <div className="px-3 flex items-center justify-center text-muted-foreground">
              <ArrowRightIcon className="w-5 h-5" />
            </div>

            {/* To Stage */}
            <div className="flex flex-col items-center gap-1.5 flex-1 text-center">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Target Stage</span>
              <Badge
                variant="outline"
                className="px-2.5 py-1 text-xs font-semibold"
                style={{
                  borderColor: `${toStage.color}50`,
                  backgroundColor: `${toStage.color}15`,
                  color: toStage.color,
                }}
              >
                {toStage.name}
              </Badge>
              <span className="text-[10px] text-muted-foreground font-mono">
                Order #{toStage.order + 1} ({toStage.probability}%)
              </span>
            </div>
          </div>

          {/* Sequential Movement Notice */}
          {!isSequential ? (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-red-600 dark:text-red-400">
              <ExclamationTriangleIcon className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed">
                <strong>Non-Sequential Move:</strong> Stages must be moved sequentially (one step forward or backward). You are trying to jump from stage #{fromStage.order + 1} to #{toStage.order + 1}.
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs">
              {isAdvancing ? (
                <span>
                  Advancing to <strong>{toStage.name}</strong> will increase win probability from <strong>{fromStage.probability}%</strong> to <strong>{toStage.probability}%</strong> and log a timeline event on the contact.
                </span>
              ) : (
                <span>
                  Moving back to <strong>{toStage.name}</strong> will adjust the stage timeline and log a stage reversion activity.
                </span>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!isSequential || isLoading}
            onClick={onConfirm}
            className="gap-1.5"
          >
            {isLoading ? (
              <>
                <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                Moving Deal...
              </>
            ) : (
              'Confirm Transition'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
