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
import { MaterialIcon } from '@/components/ui/MaterialIcon'
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
      <DialogContent className="sm:max-w-md border-[#D8E2D6] dark:border-[#618764] bg-white dark:bg-[#202B2F] shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-[#273338] dark:text-white">
            <MaterialIcon name="sync_alt" size={20} className="text-[#9CB080]" />
            <span>Confirm Stage Transition</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-[#75887E] dark:text-[#A0B2A6]">
            Moving deal for <strong className="text-[#273338] dark:text-white font-semibold">{deal.contactName}</strong> ({deal.propertyAddress})
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Stage Transition Visual */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F5F7F4] dark:bg-[#273338] border border-[#D8E2D6] dark:border-[#618764]/50">
            {/* From Stage */}
            <div className="flex flex-col items-center gap-1.5 flex-1 text-center">
              <span className="text-[10px] uppercase font-bold text-[#75887E] dark:text-[#A0B2A6] tracking-wider">Current Stage</span>
              <Badge
                variant="outline"
                className="px-2.5 py-1 text-xs font-semibold border-[#618764] text-[#2B5748] dark:text-[#9CB080] bg-[#618764]/10"
              >
                {fromStage.name}
              </Badge>
              <span className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] font-mono">
                Order #{fromStage.order + 1} ({fromStage.probability}%)
              </span>
            </div>

            {/* Arrow */}
            <div className="px-3 flex items-center justify-center text-[#618764] dark:text-[#9CB080]">
              <MaterialIcon name="arrow_forward" size={20} />
            </div>

            {/* To Stage */}
            <div className="flex flex-col items-center gap-1.5 flex-1 text-center">
              <span className="text-[10px] uppercase font-bold text-[#75887E] dark:text-[#A0B2A6] tracking-wider">Target Stage</span>
              <Badge
                variant="outline"
                className="px-2.5 py-1 text-xs font-semibold border-[#9CB080] text-[#273338] dark:text-white bg-[#9CB080]/20"
              >
                {toStage.name}
              </Badge>
              <span className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] font-mono">
                Order #{toStage.order + 1} ({toStage.probability}%)
              </span>
            </div>
          </div>

          {/* Sequential Movement Notice */}
          {!isSequential ? (
            <div className="p-3 rounded-xl bg-[#202B2F] border border-[#618764] flex items-start gap-2.5 text-[#E2ECE4]">
              <MaterialIcon name="warning" size={18} className="text-[#9CB080] shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed">
                <strong className="text-white">Non-Sequential Move:</strong> Stages must be moved sequentially (one step forward or backward). You are trying to jump from stage #{fromStage.order + 1} to #{toStage.order + 1}.
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-[#EDF2EB] dark:bg-[#2B5748]/40 border border-[#D8E2D6] dark:border-[#618764]/50 text-[#273338] dark:text-[#E2ECE4] text-xs">
              {isAdvancing ? (
                <span>
                  Advancing to <strong className="text-[#2B5748] dark:text-[#9CB080]">{toStage.name}</strong> will increase win probability from <strong>{fromStage.probability}%</strong> to <strong>{toStage.probability}%</strong>.
                </span>
              ) : (
                <span>
                  Moving back to <strong className="text-[#2B5748] dark:text-[#9CB080]">{toStage.name}</strong> will adjust the stage timeline and log a stage reversion activity.
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
            className="border-[#D8E2D6] dark:border-[#618764]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!isSequential || isLoading}
            onClick={onConfirm}
            className="gap-1.5 bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] font-bold"
          >
            {isLoading ? (
              <>
                <MaterialIcon name="progress_activity" size={14} className="animate-spin" />
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
