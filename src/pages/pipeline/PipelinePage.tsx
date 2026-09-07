import { useState, useEffect, useMemo } from 'react'
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import {
  useGetPipelinesQuery,
  useGetKanbanDataQuery,
  useLazyGetKanbanDataQuery,
  useCreateDealMutation,
  useUpdateDealMutation,
  useMoveDealStageMutation,
  useDeleteDealMutation,
  useCreatePipelineMutation,
  useLazyGetStageDealsQuery,
  useLazyGetMultipleStageDealsQuery,
} from '@/store/api/pipelineApi'
import type { Deal, PipelineStage, KanbanStage } from '@/types'
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
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { StatCard } from '@/components/shared/StatCard'
import { useCountUp } from '@/hooks/useCountUp'

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val)

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

  // On-demand Deals State (Saves server load on navigation)
  const [isAllDealsLoaded, setIsAllDealsLoaded] = useState(false)
  const [loadedStageIds, setLoadedStageIds] = useState<Set<string>>(new Set())
  const [stageDealsMap, setStageDealsMap] = useState<Record<string, Deal[]>>({})
  const [loadingStageId, setLoadingStageId] = useState<string | null>(null)

  // Reset loaded deals state when switching pipeline
  useEffect(() => {
    setIsAllDealsLoaded(false)
    setLoadedStageIds(new Set())
    setStageDealsMap({})
    setLoadingStageId(null)
  }, [selectedPipelineId])

  // Fast metadata query: Fetch stages and summary with deals excluded on initial load
  const {
    data: metadataKanban,
    isLoading: loadingMetadata,
    refetch: refetchMetadata,
  } = useGetKanbanDataQuery(
    { pipelineId: selectedPipelineId, includeDeals: false },
    { skip: !selectedPipelineId }
  )

  // Lazy query to fetch full deals or single-stage deals on demand
  const [triggerLoadKanban, { isFetching: isFetchingDeals }] = useLazyGetKanbanDataQuery()

  // Mutations
  const [createDeal, { isLoading: creatingDeal }] = useCreateDealMutation()
  const [updateDeal, { isLoading: updatingDeal }] = useUpdateDealMutation()
  const [moveDealStage, { isLoading: movingStage }] = useMoveDealStageMutation()
  const [deleteDeal] = useDeleteDealMutation()
  const [createPipeline, { isLoading: creatingPipeline }] = useCreatePipelineMutation()

  // Lazy queries for stage-level deal auto-loading
  const [triggerGetStageDeals] = useLazyGetStageDealsQuery()
  const [triggerGetMultipleStageDeals] = useLazyGetMultipleStageDealsQuery()

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

  // Handler: Load all deals on demand (Desktop & Tablet global button)
  const handleLoadAllDeals = async () => {
    if (!selectedPipelineId) return
    try {
      const res = await triggerLoadKanban({
        pipelineId: selectedPipelineId,
        includeDeals: true,
      }).unwrap()

      const newMap: Record<string, Deal[]> = {}
      const allStageIds = new Set<string>()

      res.stages.forEach((st) => {
        newMap[st.id] = st.deals || []
        allStageIds.add(st.id)
      })

      setStageDealsMap(newMap)
      setLoadedStageIds(allStageIds)
      setIsAllDealsLoaded(true)
      toast.success(`Loaded ${res.summary.totalDeals} deals across all stages`)
    } catch {
      toast.error('Failed to load deals')
    }
  }

  // Handler: Load deals for a specific stage on demand (Mobile & per-stage button)
  const handleLoadStageDeals = async (stageId: string) => {
    if (!selectedPipelineId) return
    setLoadingStageId(stageId)
    try {
      const res = await triggerLoadKanban({
        pipelineId: selectedPipelineId,
        stageId,
      }).unwrap()

      const targetStage = res.stages.find((s) => s.id === stageId)
      const deals = targetStage?.deals || []

      setStageDealsMap((prev) => ({
        ...prev,
        [stageId]: deals,
      }))
      setLoadedStageIds((prev) => new Set([...prev, stageId]))
      toast.success(`Loaded ${deals.length} deals for "${targetStage?.name || 'Stage'}"`)
    } catch {
      toast.error('Failed to load stage deals')
    } finally {
      setLoadingStageId(null)
    }
  }

  // Combine stages from metadata and loaded deals
  const boardStages: KanbanStage[] = useMemo(() => {
    if (!metadataKanban) return []

    return metadataKanban.stages.map((st) => {
      const isStageLoaded = loadedStageIds.has(st.id)
      const stageDeals = isStageLoaded ? stageDealsMap[st.id] || [] : []
      return {
        ...st,
        deals: stageDeals,
      }
    })
  }, [metadataKanban, loadedStageIds, stageDealsMap])

  // Set up pragmatic drag and drop monitor
  useEffect(() => {
    return monitorForElements({
      onDrop({ source, location }) {
        const target = location.current.dropTargets[0]
        if (!target || !activePipeline) return

        const dealId = source.data.dealId as string
        const targetStageId = target.data.stageId as string

        // Find the deal from current loaded stages map
        let sourceDeal: Deal | undefined
        let fromStage: PipelineStage | undefined

        for (const stage of boardStages) {
          const found = stage.deals.find((d) => d.id === dealId)
          if (found) {
            sourceDeal = found
            fromStage = stage
            break
          }
        }

        if (!sourceDeal || !fromStage) return
        if (fromStage.id === targetStageId) return

        const toStage = activePipeline.stages.find((s) => s.id === targetStageId)
        if (!toStage) return

        setPendingMove({
          deal: sourceDeal,
          fromStage,
          toStage,
        })
        setTransitionDialogOpen(true)
      },
    })
  }, [boardStages, activePipeline])

  // Execute transition
  const handleConfirmTransition = async () => {
    if (!pendingMove) return
    try {
      await moveDealStage({
        dealId: pendingMove.deal.id,
        stageId: pendingMove.toStage.id,
      }).unwrap()

      // Optimistically update local deals map if loaded
      const dealId = pendingMove.deal.id
      const fromId = pendingMove.fromStage.id
      const toId = pendingMove.toStage.id

      // Check if either stage is unloaded — auto-load both from backend
      const fromLoaded = loadedStageIds.has(fromId) || isAllDealsLoaded
      const toLoaded = loadedStageIds.has(toId) || isAllDealsLoaded

      if (!fromLoaded || !toLoaded) {
        // At least one stage is unloaded, fetch both from backend
        try {
          const stagesData = await triggerGetMultipleStageDeals({
            stageIds: [fromId, toId],
            pipelineId: selectedPipelineId,
          }).unwrap()

          setStageDealsMap((prev) => {
            const next = { ...prev }
            for (const sd of stagesData) {
              next[sd.id] = sd.deals || []
            }
            return next
          })
          setLoadedStageIds((prev) => {
            const next = new Set([...prev])
            for (const sd of stagesData) next.add(sd.id)
            return next
          })
        } catch {
          // Fallback: apply optimistic update
          setStageDealsMap((prev) => {
            const sourceList = (prev[fromId] || []).filter((d) => d.id !== dealId)
            const updatedDeal: Deal = {
              ...pendingMove.deal,
              stageId: toId,
              stageName: pendingMove.toStage.name,
            }
            const targetList = [updatedDeal, ...(prev[toId] || [])]
            return { ...prev, [fromId]: sourceList, [toId]: targetList }
          })
          setLoadedStageIds((prev) => new Set([...prev, fromId, toId]))
        }
      } else {
        // Both stages already loaded — apply optimistic update
        setStageDealsMap((prev) => {
          const sourceList = (prev[fromId] || []).filter((d) => d.id !== dealId)
          const updatedDeal: Deal = {
            ...pendingMove.deal,
            stageId: toId,
            stageName: pendingMove.toStage.name,
          }
          const targetList = [updatedDeal, ...(prev[toId] || [])]
          return {
            ...prev,
            [fromId]: sourceList,
            [toId]: targetList,
          }
        })
      }

      refetchMetadata()

      toast.success(
        `Moved ${pendingMove.deal.contactName} to "${pendingMove.toStage.name}"`
      )
      setTransitionDialogOpen(false)
      setPendingMove(null)
      if (selectedDeal?.id === pendingMove.deal.id) {
        setSelectedDeal((prev) =>
          prev ? { ...prev, stageId: toId, stageName: pendingMove.toStage.name } : null
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
        const updated = await updateDeal({
          id: editingDeal.id,
          data: {
            propertyAddress: formData.propertyAddress,
            dealValue: formData.dealValue,
            assignedAgentId: formData.assignedAgentId,
            priority: formData.priority,
            notes: formData.notes,
          },
        }).unwrap()

        setStageDealsMap((prev) => {
          const stId = editingDeal.stageId
          const list = (prev[stId] || []).map((d) => (d.id === editingDeal.id ? updated : d))
          return { ...prev, [stId]: list }
        })

        toast.success('Deal updated successfully')
      } else {
        const created = await createDeal(formData).unwrap()
        const stId = created.stageId

        // If this stage wasn't loaded yet, auto-load it from the backend
        if (!loadedStageIds.has(stId) && !isAllDealsLoaded) {
          try {
            const stageData = await triggerGetStageDeals({ stageId: stId, pipelineId: selectedPipelineId }).unwrap()
            setStageDealsMap((prev) => ({
              ...prev,
              [stId]: stageData.deals || [],
            }))
            setLoadedStageIds((prev) => new Set([...prev, stId]))
          } catch {
            // Fallback: just add the created deal optimistically
            setStageDealsMap((prev) => ({
              ...prev,
              [stId]: [created, ...(prev[stId] || [])],
            }))
            setLoadedStageIds((prev) => new Set([...prev, stId]))
          }
        } else {
          // Stage is already loaded, just add the deal optimistically
          setStageDealsMap((prev) => ({
            ...prev,
            [stId]: [created, ...(prev[stId] || [])],
          }))
        }
        toast.success('Deal created successfully')
      }
      refetchMetadata()
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
      setStageDealsMap((prev) => {
        const next: Record<string, Deal[]> = {}
        for (const [sId, list] of Object.entries(prev)) {
          next[sId] = list.filter((d) => d.id !== id)
        }
        return next
      })
      refetchMetadata()
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
    return boardStages.map((stage) => {
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
  }, [boardStages, searchQuery, priorityFilter])

  // Summary Metrics
  const summary = metadataKanban?.summary || { totalDeals: 0, totalValue: 0, weightedForecast: 0 }
  const closedWonStage = metadataKanban?.stages.find((s) => s.name.toLowerCase().includes('won'))
  const closedWonValue = closedWonStage?.totalValue || 0

  // Animated KPI metrics (Ease-out Quartic curve for high initial speed and gradual slowdown)
  const animatedTotalValue = useCountUp({ end: summary.totalValue, duration: 1600 })
  const animatedWeightedForecast = useCountUp({ end: summary.weightedForecast, duration: 1500 })
  const animatedTotalDeals = useCountUp({ end: summary.totalDeals, duration: 1200 })
  const animatedClosedWonValue = useCountUp({ end: closedWonValue, duration: 1400 })

  const forecastPercent = summary.totalValue > 0
    ? Math.round((summary.weightedForecast / summary.totalValue) * 100)
    : 0

  if (loadingPipelines || loadingMetadata) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 gap-y-6 pt-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-5 flex flex-col h-[calc(100vh-6.5rem)]">
      {/* Top Header & Metrics Bar */}
      <div className="space-y-4 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Pipeline Selector & Settings */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={selectedPipelineId}
              onValueChange={(val) => val && setSelectedPipelineId(val)}
            >
              <SelectTrigger className="w-56 h-10 font-bold text-xs bg-white dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white shadow-xs">
                <SelectValue placeholder="Select Pipeline">
                  {activePipeline ? `${activePipeline.name} ${activePipeline.isDefault ? '⭐' : ''}` : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764]">
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
              className="h-10 text-xs font-semibold gap-1.5 border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white hover:bg-slate-100 dark:hover:bg-[#202B2F]"
              title="Configure stages, colors, and win probabilities"
            >
              <MaterialIcon name="tune" size={16} className="text-[#618764] dark:text-[#9CB080]" />
              <span className="hidden sm:inline">Settings</span>
            </Button>

            <Button
              size="sm"
              variant="ghost"
              disabled={creatingPipeline}
              onClick={handleCreateNewPipeline}
              className="h-10 text-xs text-[#75887E] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white gap-1"
            >
              <MaterialIcon name="add" size={16} />
              <span className="hidden sm:inline">New Pipeline</span>
            </Button>
          </div>

          {/* Right: Actions, Load Deals & Tools */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Prominent On-Demand Deal Loading Button */}
            <Button
              size="sm"
              onClick={handleLoadAllDeals}
              disabled={isFetchingDeals}
              variant={isAllDealsLoaded ? 'outline' : 'default'}
              className={
                isAllDealsLoaded
                  ? 'h-10 text-xs font-bold gap-1.5 border-[#618764] text-[#2B5748] dark:text-[#9CB080] hover:bg-[#EDF2EB] dark:hover:bg-[#202B2F]'
                  : 'h-10 text-xs font-bold gap-1.5 bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] shadow-xs'
              }
              title="Loads deals on demand to save server load on navigation"
            >
              {isFetchingDeals ? (
                <>
                  <MaterialIcon name="progress_activity" size={16} className="animate-spin" />
                  <span>Loading Deals...</span>
                </>
              ) : isAllDealsLoaded ? (
                <>
                  <MaterialIcon name="sync" size={16} />
                  <span>Reload Deals</span>
                </>
              ) : (
                <>
                  <MaterialIcon name="download" size={16} />
                  <span>Load Deals</span>
                </>
              )}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setCalcDefaultPrice(
                  summary.totalValue
                    ? Math.round(summary.totalValue / (summary.totalDeals || 1))
                    : 650000
                )
                setCalculatorOpen(true)
              }}
              className="h-10 text-xs font-semibold gap-1.5 border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white"
            >
              <MaterialIcon name="calculate" size={16} className="text-[#618764] dark:text-[#9CB080]" />
              <span className="hidden sm:inline">Split Calc</span>
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setEditingDeal(null)
                setDealModalOpen(true)
              }}
              className="h-10 text-xs font-bold gap-1.5 bg-[#2B5748] hover:bg-[#23473B] text-white shadow-xs"
            >
              <MaterialIcon name="add" size={16} />
              <span>Add Deal</span>
            </Button>
          </div>
        </div>

        {/* ═══════ 4 Financial & Pipeline KPI Cards ═══════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 gap-y-6 pt-3">
          <StatCard
            title="Pipeline Value"
            value={formatCurrency(animatedTotalValue)}
            icon={<MaterialIcon name="payments" size={20} />}
            trend={{ value: 14.5, isPositive: true }}
            subtitle="vs last month"
          />
          <StatCard
            title="Forecast"
            value={formatCurrency(animatedWeightedForecast)}
            icon={<MaterialIcon name="trending_up" size={20} />}
            trend={{ value: forecastPercent > 0 ? forecastPercent : 15.0, isPositive: true }}
            subtitle="pipeline close rate"
          />
          <StatCard
            title="Deal Volume"
            value={`${animatedTotalDeals} Deals`}
            icon={<MaterialIcon name="work" size={20} />}
            trend={{ value: 8.5, isPositive: true }}
            subtitle="active in pipeline"
          />
          <StatCard
            title="Total Revenue"
            value={formatCurrency(animatedClosedWonValue)}
            icon={<MaterialIcon name="verified" size={20} />}
            trend={{ value: 18.2, isPositive: true }}
            subtitle="converted & closed"
          />
        </div>

        {/* Filter & View Switcher Bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#75887E] dark:text-[#A0B2A6]">
                <MaterialIcon name="search" size={16} />
              </span>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by contact name or address..."
                className="pl-9 h-9 text-xs border-[#D8E2D6] dark:border-[#618764] bg-white dark:bg-[#202B2F]"
              />
            </div>

            <Select value={priorityFilter} onValueChange={(val) => val && setPriorityFilter(val)}>
              <SelectTrigger className="w-32 h-9 text-xs border-[#D8E2D6] dark:border-[#618764] bg-white dark:bg-[#202B2F]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764]">
                <SelectItem value="all" className="text-xs">All Priorities</SelectItem>
                <SelectItem value="urgent" className="text-xs">Urgent</SelectItem>
                <SelectItem value="high" className="text-xs">High</SelectItem>
                <SelectItem value="medium" className="text-xs">Medium</SelectItem>
                <SelectItem value="low" className="text-xs">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-[#EDF2EB] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/60">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'kanban'
                ? 'bg-white dark:bg-[#2B5748] text-[#273338] dark:text-white shadow-xs font-bold'
                : 'text-[#75887E] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white'
                }`}
              title="Kanban Board"
            >
              <MaterialIcon name="view_kanban" size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list'
                ? 'bg-white dark:bg-[#2B5748] text-[#273338] dark:text-white shadow-xs font-bold'
                : 'text-[#75887E] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white'
                }`}
              title="List View"
            >
              <MaterialIcon name="view_list" size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area: Responsive across Desktop, Tablet & Mobile */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'kanban' ? (
          <>
            {/* DESKTOP LAYOUT (lg:): Keep current UI/UX with smooth horizontal columns */}
            <div className="hidden lg:flex gap-4 overflow-x-auto pb-4 h-full scrollbar-thin">
              {filteredStages.map((stage) => {
                const isLoaded = loadedStageIds.has(stage.id) || isAllDealsLoaded
                return (
                  <PipelineColumn
                    key={stage.id}
                    stage={stage}
                    deals={stage.deals}
                    isLoaded={isLoaded}
                    isLoadingDeals={loadingStageId === stage.id || isFetchingDeals}
                    onSelectDeal={(deal) => setSelectedDeal(deal)}
                    onLoadStageDeals={() => handleLoadStageDeals(stage.id)}
                  />
                )
              })}
            </div>

            {/* TABLET LAYOUT (md to lg): Responsive grid with max 2 stages in one row */}
            <div className="hidden md:grid md:grid-cols-2 lg:hidden gap-4 overflow-y-auto pb-6 h-full">
              {filteredStages.map((stage) => {
                const isLoaded = loadedStageIds.has(stage.id) || isAllDealsLoaded
                return (
                  <PipelineColumn
                    key={stage.id}
                    stage={stage}
                    deals={stage.deals}
                    isLoaded={isLoaded}
                    isLoadingDeals={loadingStageId === stage.id || isFetchingDeals}
                    onSelectDeal={(deal) => setSelectedDeal(deal)}
                    onLoadStageDeals={() => handleLoadStageDeals(stage.id)}
                  />
                )
              })}
            </div>

            {/* MOBILE LAYOUT (< md): Stack stages on top of each other with dedicated load deals */}
            <div className="flex flex-col md:hidden gap-4 overflow-y-auto pb-6 h-full">
              {filteredStages.map((stage) => {
                const isLoaded = loadedStageIds.has(stage.id) || isAllDealsLoaded
                return (
                  <PipelineColumn
                    key={stage.id}
                    stage={stage}
                    deals={stage.deals}
                    isLoaded={isLoaded}
                    isLoadingDeals={loadingStageId === stage.id || isFetchingDeals}
                    onSelectDeal={(deal) => setSelectedDeal(deal)}
                    onLoadStageDeals={() => handleLoadStageDeals(stage.id)}
                    isMobile={true}
                  />
                )
              })}
            </div>
          </>
        ) : (
          /* List View */
          <div className="h-full overflow-y-auto rounded-2xl border border-[#D8E2D6] dark:border-[#618764]/70 bg-white dark:bg-[#202B2F] p-4">
            {!isAllDealsLoaded && Object.values(stageDealsMap).flat().length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#EDF2EB] dark:bg-[#2B5748] flex items-center justify-center text-[#2B5748] dark:text-[#9CB080]">
                  <MaterialIcon name="table_rows" size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#273338] dark:text-white">Deals are not loaded</h3>
                  <p className="text-xs text-[#75887E] dark:text-[#A0B2A6] mt-0.5 max-w-sm">
                    Deals are kept on-demand to optimize server resources upon navigation. Click below to load all records into the table.
                  </p>
                </div>
                <Button
                  onClick={handleLoadAllDeals}
                  disabled={isFetchingDeals}
                  className="bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] font-bold text-xs gap-1.5"
                >
                  <MaterialIcon name="download" size={16} />
                  <span>Load Deals ({summary.totalDeals})</span>
                </Button>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#D8E2D6] dark:border-[#618764]/60 text-[#75887E] dark:text-[#A0B2A6] font-semibold">
                    <th className="pb-3">Contact</th>
                    <th className="pb-3">Property</th>
                    <th className="pb-3">Stage</th>
                    <th className="pb-3">Deal Value</th>
                    <th className="pb-3">Priority</th>
                    <th className="pb-3">Agent</th>
                    <th className="pb-3">Days in Stage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8E2D6] dark:divide-[#618764]/40">
                  {filteredStages
                    .flatMap((s) => s.deals)
                    .map((deal) => (
                      <tr
                        key={deal.id}
                        onClick={() => setSelectedDeal(deal)}
                        className="hover:bg-[#F5F7F4] dark:hover:bg-[#2B5748]/30 cursor-pointer transition-colors"
                      >
                        <td className="py-3 font-bold text-[#273338] dark:text-white">{deal.contactName}</td>
                        <td className="py-3 text-[#75887E] dark:text-[#A0B2A6]">{deal.propertyAddress}</td>
                        <td className="py-3">
                          <Badge
                            variant="outline"
                            className="text-[10px] border-[#618764] text-[#2B5748] dark:text-[#9CB080] bg-[#618764]/10"
                          >
                            {deal.stageName || deal.stageId}
                          </Badge>
                        </td>
                        <td className="py-3 font-bold font-mono text-[#273338] dark:text-white">
                          ${deal.dealValue.toLocaleString()}
                        </td>
                        <td className="py-3">
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase font-bold border-[#618764]/40 text-[#2B5748] dark:text-[#E2ECE4]"
                          >
                            {deal.priority}
                          </Badge>
                        </td>
                        <td className="py-3 text-[#75887E] dark:text-[#A0B2A6]">{deal.assignedAgentName}</td>
                        <td className="py-3 font-mono text-[#75887E] dark:text-[#A0B2A6]">{deal.daysInStage}d</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
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
