import { useState, useEffect, useMemo } from 'react'
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import {
  useGetPipelinesQuery,
  useGetKanbanDataQuery,
  useCreateDealMutation,
  useUpdateDealMutation,
  useMoveDealStageMutation,
  useDeleteDealMutation,
  useCreatePipelineMutation,
} from '@/store/api/pipelineApi'
import type { Deal, PipelineStage } from '@/types'
import { PipelineColumn } from './components/PipelineColumn'
import { DealModal } from './components/DealModal'
import { DealDetailDrawer } from './components/DealDetailDrawer'
import { StageTransitionDialog } from './components/StageTransitionDialog'
import { PipelineSettingsModal } from './components/PipelineSettingsModal'
import { CommissionCalculatorModal } from './components/CommissionCalculatorModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  PlusIcon,
  Cog6ToothIcon,
  CalculatorIcon,
  MagnifyingGlassIcon,
  CurrencyDollarIcon,
  BriefcaseIcon,
  SparklesIcon,
  CheckBadgeIcon,
  ViewColumnsIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline'
import { toast } from 'sonner'

export function PipelinePage() {
  const { data: pipelines = [], isLoading: loadingPipelines } = useGetPipelinesQuery()
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('')

  // Set default pipeline
  useEffect(() => {
    if (!selectedPipelineId && pipelines.length > 0) {
      const defaultPipe = pipelines.find((p) => p.isDefault) || pipelines[0]
      setSelectedPipelineId(defaultPipe.id)
    }
  }, [pipelines, selectedPipelineId])

  // Get active pipeline
  const activePipeline = useMemo(
    () => pipelines.find((p) => p.id === selectedPipelineId) || pipelines[0] || null,
    [pipelines, selectedPipelineId]
  )

  // Query kanban data for active pipeline
  const {
    data: kanbanData,
    isLoading: loadingKanban,
  } = useGetKanbanDataQuery(selectedPipelineId, {
    skip: !selectedPipelineId,
  })

  // Mutations
  const [createDeal, { isLoading: creatingDeal }] = useCreateDealMutation()
  const [updateDeal, { isLoading: updatingDeal }] = useUpdateDealMutation()
  const [moveDealStage, { isLoading: movingStage }] = useMoveDealStageMutation()
  const [deleteDeal] = useDeleteDealMutation()
  const [createPipeline, { isLoading: creatingPipeline }] = useCreatePipelineMutation()

  // UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')

  // Modals state
  const [dealModalOpen, setDealModalOpen] = useState(false)
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null)
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [calculatorOpen, setCalculatorOpen] = useState(false)
  const [calcDefaultPrice, setCalcDefaultPrice] = useState(650000)

  // Drag-and-drop stage transition dialog state
  const [transitionDialogOpen, setTransitionDialogOpen] = useState(false)
  const [pendingMove, setPendingMove] = useState<{
    deal: Deal
    fromStage: PipelineStage
    toStage: PipelineStage
  } | null>(null)

  // Set up pragmatic drag and drop monitor
  useEffect(() => {
    return monitorForElements({
      onDrop({ source, location }) {
        const target = location.current.dropTargets[0]
        if (!target || !kanbanData || !activePipeline) return

        const dealId = source.data.dealId as string
        const targetStageId = target.data.stageId as string

        // Find the deal
        let sourceDeal: Deal | undefined
        let fromStage: PipelineStage | undefined
        for (const stage of kanbanData.stages) {
          const found = stage.deals.find((d) => d.id === dealId)
          if (found) {
            sourceDeal = found
            fromStage = stage
            break
          }
        }

        if (!sourceDeal || !fromStage) return
        if (fromStage.id === targetStageId) return // dropped on same column

        const toStage = activePipeline.stages.find((s) => s.id === targetStageId)
        if (!toStage) return

        // Open transition confirmation dialog
        setPendingMove({
          deal: sourceDeal,
          fromStage,
          toStage,
        })
        setTransitionDialogOpen(true)
      },
    })
  }, [kanbanData, activePipeline])

  // Execute transition
  const handleConfirmTransition = async () => {
    if (!pendingMove) return
    try {
      await moveDealStage({
        dealId: pendingMove.deal.id,
        stageId: pendingMove.toStage.id,
      }).unwrap()
      toast.success(
        `Moved ${pendingMove.deal.contactName} to "${pendingMove.toStage.name}"`
      )
      setTransitionDialogOpen(false)
      setPendingMove(null)
      if (selectedDeal?.id === pendingMove.deal.id) {
        setSelectedDeal((prev) =>
          prev ? { ...prev, stageId: pendingMove.toStage.id, stageName: pendingMove.toStage.name } : null
        )
      }
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to move deal')
    }
  }

  // Create or update deal submit handler
  const handleDealSubmit = async (formData: any) => {
    try {
      if (editingDeal) {
        await updateDeal({
          id: editingDeal.id,
          data: {
            propertyAddress: formData.propertyAddress,
            dealValue: formData.dealValue,
            assignedAgentId: formData.assignedAgentId,
            priority: formData.priority,
            notes: formData.notes,
          },
        }).unwrap()
        toast.success('Deal updated successfully')
      } else {
        await createDeal(formData).unwrap()
        toast.success('Deal created successfully')
      }
      setDealModalOpen(false)
      setEditingDeal(null)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to save deal')
    }
  }

  // Delete deal handler
  const handleDeleteDeal = async (id: string) => {
    try {
      await deleteDeal(id).unwrap()
      toast.success('Deal archived successfully')
      if (selectedDeal?.id === id) setSelectedDeal(null)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to delete deal')
    }
  }

  // Create quick new pipeline
  const handleCreateNewPipeline = async () => {
    const name = window.prompt('Enter name for new pipeline (e.g., Commercial Deals):')
    if (!name?.trim()) return
    try {
      const created = await createPipeline({ name: name.trim() }).unwrap()
      toast.success(`Pipeline "${name}" created`)
      setSelectedPipelineId(created.id)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to create pipeline')
    }
  }

  // Filter deals based on search and priority
  const filteredStages = useMemo(() => {
    if (!kanbanData) return []
    return kanbanData.stages.map((stage) => {
      let deals = stage.deals
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        deals = deals.filter(
          (d) =>
            d.contactName.toLowerCase().includes(q) ||
            d.propertyAddress.toLowerCase().includes(q)
        )
      }
      if (priorityFilter !== 'all') {
        deals = deals.filter((d) => d.priority === priorityFilter)
      }
      return {
        ...stage,
        deals,
      }
    })
  }, [kanbanData, searchQuery, priorityFilter])

  // Summary Metrics
  const summary = kanbanData?.summary || { totalDeals: 0, totalValue: 0, weightedForecast: 0 }
  const closedWonStage = kanbanData?.stages.find((s) => s.name.toLowerCase().includes('won'))
  const closedWonValue = closedWonStage?.totalValue || 0

  if (loadingPipelines) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6.5rem)]">
      {/* Top Header & Metrics Bar */}
      <div className="space-y-4 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Pipeline Selector & Settings */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <Select
              value={selectedPipelineId}
              onValueChange={(val) => val && setSelectedPipelineId(val)}
            >
              <SelectTrigger className="w-60 h-10 font-bold text-sm bg-card border-border shadow-xs">
                <SelectValue placeholder="Select Pipeline">
                  {activePipeline ? `${activePipeline.name} ${activePipeline.isDefault ? '⭐' : ''}` : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {pipelines.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs font-semibold">
                    {p.name} {p.isDefault ? '⭐' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setSettingsModalOpen(true)}
              className="h-10 text-xs font-semibold gap-1.5 shadow-xs"
              title="Configure stages, colors, and win probabilities"
            >
              <Cog6ToothIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Pipeline Settings</span>
            </Button>

            <Button
              size="sm"
              variant="ghost"
              disabled={creatingPipeline}
              onClick={handleCreateNewPipeline}
              className="h-10 text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              New Pipeline
            </Button>
          </div>

          {/* Right: Actions & Tools */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setCalcDefaultPrice(summary.totalValue ? Math.round(summary.totalValue / (summary.totalDeals || 1)) : 650000)
                setCalculatorOpen(true)
              }}
              className="h-10 text-xs font-semibold gap-1.5 shadow-xs"
            >
              <CalculatorIcon className="w-4 h-4 text-emerald-500" />
              <span className="hidden sm:inline">Commission Split</span>
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setEditingDeal(null)
                setDealModalOpen(true)
              }}
              className="h-10 text-xs font-bold gap-1.5 shadow-md bg-primary hover:bg-primary/90"
            >
              <PlusIcon className="w-4 h-4" />
              Add Deal
            </Button>
          </div>
        </div>

        {/* 4 Financial & Pipeline KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
              <CurrencyDollarIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-muted-foreground block">
                Total Pipeline Value
              </span>
              <span className="text-lg font-black text-foreground font-mono">
                ${(summary.totalValue / 1000).toLocaleString()}K
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 shrink-0">
              <SparklesIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-muted-foreground block">
                Weighted Revenue Forecast
              </span>
              <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 font-mono">
                ${(summary.weightedForecast / 1000).toLocaleString()}K
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-chart-3/10 text-chart-3 shrink-0">
              <BriefcaseIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-muted-foreground block">
                Active Deal Volume
              </span>
              <span className="text-lg font-black text-foreground font-mono">
                {summary.totalDeals} Deals
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
              <CheckBadgeIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-muted-foreground block">
                Closed Won Revenue
              </span>
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                ${(closedWonValue / 1000).toLocaleString()}K
              </span>
            </div>
          </div>
        </div>

        {/* Filter & View Switcher Bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by contact name or address..."
                className="pl-9 h-9 text-xs"
              />
            </div>

            <Select value={priorityFilter} onValueChange={(val) => val && setPriorityFilter(val)}>
              <SelectTrigger className="w-32 h-9 text-xs">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Priorities</SelectItem>
                <SelectItem value="urgent" className="text-xs">Urgent</SelectItem>
                <SelectItem value="high" className="text-xs">High</SelectItem>
                <SelectItem value="medium" className="text-xs">Medium</SelectItem>
                <SelectItem value="low" className="text-xs">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-muted/60 border border-border/60">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'kanban' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Kanban Board"
            >
              <ViewColumnsIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'list' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="List View"
            >
              <TableCellsIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area: Kanban Columns or List View */}
      <div className="flex-1 overflow-hidden">
        {loadingKanban ? (
          <div className="flex gap-4 overflow-x-auto pb-4 h-full">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="w-80 h-full rounded-2xl shrink-0" />
            ))}
          </div>
        ) : viewMode === 'kanban' ? (
          <div className="flex gap-4 overflow-x-auto pb-4 h-full scrollbar-thin scrollbar-thumb-border">
            {filteredStages.map((stage) => (
              <PipelineColumn
                key={stage.id}
                stage={stage}
                deals={stage.deals}
                onSelectDeal={(deal) => setSelectedDeal(deal)}
              />
            ))}
          </div>
        ) : (
          /* List View */
          <div className="h-full overflow-y-auto rounded-2xl border border-border/80 bg-card p-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-semibold">
                  <th className="pb-3">Contact</th>
                  <th className="pb-3">Property</th>
                  <th className="pb-3">Stage</th>
                  <th className="pb-3">Deal Value</th>
                  <th className="pb-3">Priority</th>
                  <th className="pb-3">Agent</th>
                  <th className="pb-3">Days in Stage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredStages.flatMap((s) => s.deals).map((deal) => (
                  <tr
                    key={deal.id}
                    onClick={() => setSelectedDeal(deal)}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td className="py-3 font-semibold text-foreground">{deal.contactName}</td>
                    <td className="py-3 text-muted-foreground">{deal.propertyAddress}</td>
                    <td className="py-3">
                      <Badge variant="outline" className="text-[10px]">
                        {deal.stageName || deal.stageId}
                      </Badge>
                    </td>
                    <td className="py-3 font-bold font-mono text-foreground">
                      ${deal.dealValue.toLocaleString()}
                    </td>
                    <td className="py-3">
                      <Badge variant="secondary" className="text-[10px] uppercase">
                        {deal.priority}
                      </Badge>
                    </td>
                    <td className="py-3 text-muted-foreground">{deal.assignedAgentName}</td>
                    <td className="py-3 font-mono">{deal.daysInStage}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deal Detail Drawer */}
      <DealDetailDrawer
        open={!!selectedDeal}
        onClose={() => setSelectedDeal(null)}
        deal={selectedDeal}
        pipeline={activePipeline}
        onDeleteDeal={handleDeleteDeal}
        onEditDeal={(deal) => {
          setEditingDeal(deal)
          setDealModalOpen(true)
        }}
        onRequestStageMove={(deal, targetStage) => {
          if (!activePipeline) return
          const currentStage = activePipeline.stages.find((s) => s.id === deal.stageId)
          if (!currentStage) return
          setPendingMove({ deal, fromStage: currentStage, toStage: targetStage })
          setTransitionDialogOpen(true)
        }}
        onOpenCalculator={(price) => {
          setCalcDefaultPrice(price)
          setCalculatorOpen(true)
        }}
      />

      {/* Deal Create / Edit Modal */}
      <DealModal
        open={dealModalOpen}
        onOpenChange={(open) => {
          setDealModalOpen(open)
          if (!open) setEditingDeal(null)
        }}
        onSubmit={handleDealSubmit}
        initialData={editingDeal}
        currentPipelineId={selectedPipelineId}
        isLoading={creatingDeal || updatingDeal}
      />

      {/* Sequential Stage Transition Confirmation Dialog */}
      <StageTransitionDialog
        open={transitionDialogOpen}
        onOpenChange={(open) => {
          setTransitionDialogOpen(open)
          if (!open) setPendingMove(null)
        }}
        deal={pendingMove?.deal || null}
        fromStage={pendingMove?.fromStage || null}
        toStage={pendingMove?.toStage || null}
        onConfirm={handleConfirmTransition}
        isLoading={movingStage}
      />

      {/* Pipeline & Stage Customization Modal */}
      <PipelineSettingsModal
        open={settingsModalOpen}
        onOpenChange={setSettingsModalOpen}
        pipeline={activePipeline}
        onPipelineDeleted={() => {
          if (pipelines.length > 1) {
            const next = pipelines.find((p) => p.id !== selectedPipelineId)
            if (next) setSelectedPipelineId(next.id)
          }
        }}
      />

      {/* Commission Split Calculator Modal */}
      <CommissionCalculatorModal
        open={calculatorOpen}
        onOpenChange={setCalculatorOpen}
        defaultPrice={calcDefaultPrice}
      />
    </div>
  )
}
