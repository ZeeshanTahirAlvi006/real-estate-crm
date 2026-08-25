import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { PlusIcon } from '@heroicons/react/24/outline'
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useGetPipelineQuery,
  useGetDealsQuery,
  useUpdateDealStageMutation,
  useCreateDealMutation,
  useDeleteDealMutation,
} from '@/store/api/pipelineApi'
import { PipelineColumn } from './components/PipelineColumn'
import { DealModal } from './components/DealModal'
import { DealDetailDrawer } from './components/DealDetailDrawer'
import { CommissionCalculatorModal } from './components/CommissionCalculatorModal'
import type { Deal } from '@/types'

export function PipelinePage() {
  const { data: pipeline, isLoading: pipeLoading } = useGetPipelineQuery()
  const { data: allDeals, isLoading: dealsLoading } = useGetDealsQuery()
  const [updateStage] = useUpdateDealStageMutation()
  const [createDealMutation, { isLoading: isCreatingDeal }] = useCreateDealMutation()
  const [deleteDealMutation] = useDeleteDealMutation()

  const [localDeals, setLocalDeals] = useState<Deal[]>([])
  const [isAddDealOpen, setIsAddDealOpen] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [calculatorPrice, setCalculatorPrice] = useState<number | null>(null)

  useEffect(() => {
    if (allDeals) setLocalDeals(allDeals)
  }, [allDeals])

  const handleDrop = useCallback(async (dealId: string, newStageId: string) => {
    const deal = localDeals.find(d => d.id === dealId)
    if (!deal || deal.stageId === newStageId) return

    // Optimistic update
    setLocalDeals(prev => prev.map(d => d.id === dealId ? { ...d, stageId: newStageId } : d))

    try {
      await updateStage({ dealId, newStageId }).unwrap()
      const stageName = pipeline?.stages.find(s => s.id === newStageId)?.name
      toast.success(`Deal moved to ${stageName}`)
    } catch {
      // Revert
      setLocalDeals(prev => prev.map(d => d.id === dealId ? { ...d, stageId: deal.stageId } : d))
      toast.error('Failed to move deal')
    }
  }, [localDeals, pipeline, updateStage])

  const handleCreateDealSubmit = async (dealData: Partial<Deal>) => {
    try {
      const created = await createDealMutation(dealData).unwrap()
      setLocalDeals(prev => [created, ...prev])
      toast.success(`Deal created for ${dealData.propertyAddress || 'client'}`)
      setIsAddDealOpen(false)
    } catch {
      toast.error('Failed to create deal')
    }
  }

  const handleDeleteDeal = async (dealId: string) => {
    try {
      await deleteDealMutation(dealId).unwrap()
      setLocalDeals(prev => prev.filter(d => d.id !== dealId))
      setSelectedDeal(null)
      toast.success('Deal deleted successfully')
    } catch {
      toast.error('Failed to delete deal')
    }
  }

  // Set up the global drag monitor
  const monitorCleanup = useRef<(() => void) | null>(null)
  useEffect(() => {
    monitorCleanup.current = monitorForElements({
      onDrop({ source, location }) {
        const dest = location.current.dropTargets[0]
        if (!dest) return
        const dealId = source.data.dealId as string
        const stageId = dest.data.stageId as string
        if (dealId && stageId) handleDrop(dealId, stageId)
      },
    })
    return () => monitorCleanup.current?.()
  }, [handleDrop])

  if (pipeLoading || dealsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-125 w-72 rounded-xl" />)}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pipeline"
        description={`${pipeline?.name || 'Sales Pipeline'} — ${localDeals.length} deals`}
        actions={
          <Button onClick={() => setIsAddDealOpen(true)} className="shadow-xs font-semibold">
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Deal
          </Button>
        }
      />

      <div className="flex gap-4 overflow-x-auto pb-4">
        {pipeline?.stages.filter(s => s.id !== 'closed_lost').map(stage => (
          <PipelineColumn
            key={stage.id}
            stage={stage}
            deals={localDeals.filter(d => d.stageId === stage.id)}
            onSelectDeal={(deal) => setSelectedDeal(deal)}
          />
        ))}
      </div>

      {/* Add Deal Modal */}
      <DealModal
        open={isAddDealOpen}
        onOpenChange={setIsAddDealOpen}
        onSubmit={handleCreateDealSubmit}
        isLoading={isCreatingDeal}
      />

      {/* Deal Detail Drawer */}
      <DealDetailDrawer
        deal={selectedDeal}
        open={!!selectedDeal}
        onClose={() => setSelectedDeal(null)}
        onDeleteDeal={handleDeleteDeal}
        onOpenCalculator={(price) => setCalculatorPrice(price)}
      />

      {/* Commission Calculator Modal */}
      {calculatorPrice !== null && (
        <CommissionCalculatorModal
          open={calculatorPrice !== null}
          onOpenChange={(open) => !open && setCalculatorPrice(null)}
          defaultPrice={calculatorPrice}
        />
      )}
    </div>
  )
}
