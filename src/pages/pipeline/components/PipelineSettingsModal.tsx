import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  PlusIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  CheckIcon,
  ArrowPathIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import {
  useUpdatePipelineMutation,
  useAddStageMutation,
  useUpdateStageMutation,
  useReorderStagesMutation,
  useDeleteStageMutation,
  useDeletePipelineMutation,
} from '@/store/api/pipelineApi'
import type { Pipeline } from '@/types'
import { toast } from 'sonner'

interface PipelineSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pipeline: Pipeline | null
  onPipelineDeleted?: () => void
}

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#0ea5e9', // Sky
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#22c55e', // Green
  '#f59e0b', // Amber
  '#f97316', // Orange
  '#ef4444', // Red
  '#64748b', // Slate
]

export const PipelineSettingsModal: React.FC<PipelineSettingsModalProps> = ({
  open,
  onOpenChange,
  pipeline,
  onPipelineDeleted,
}) => {
  if (!pipeline) return null

  const [pipelineName, setPipelineName] = useState(pipeline.name)
  const [editingStageId, setEditingStageId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingColor, setEditingColor] = useState('#6366f1')
  const [editingProbability, setEditingProbability] = useState(50)

  // New stage form state
  const [isAddingStage, setIsAddingStage] = useState(false)
  const [newStageName, setNewStageName] = useState('')
  const [newStageColor, setNewStageColor] = useState('#6366f1')
  const [newStageProbability, setNewStageProbability] = useState(50)

  const [updatePipeline, { isLoading: updatingPipeline }] = useUpdatePipelineMutation()
  const [addStage, { isLoading: addingStage }] = useAddStageMutation()
  const [updateStage, { isLoading: updatingStage }] = useUpdateStageMutation()
  const [reorderStages, { isLoading: reorderingStages }] = useReorderStagesMutation()
  const [deleteStage, { isLoading: deletingStage }] = useDeleteStageMutation()
  const [deletePipeline, { isLoading: deletingPipeline }] = useDeletePipelineMutation()

  const sortedStages = [...pipeline.stages].sort((a, b) => a.order - b.order)

  const handleRenamePipeline = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pipelineName.trim()) return
    try {
      await updatePipeline({ id: pipeline.id, name: pipelineName.trim() }).unwrap()
      toast.success('Pipeline renamed successfully')
    } catch {
      toast.error('Failed to rename pipeline')
    }
  }

  const handleStartEditStage = (stage: (typeof sortedStages)[0]) => {
    setEditingStageId(stage.id)
    setEditingName(stage.name)
    setEditingColor(stage.color)
    setEditingProbability(stage.probability)
  }

  const handleSaveStageEdit = async (stageId: string) => {
    if (!editingName.trim()) return
    try {
      await updateStage({
        pipelineId: pipeline.id,
        stageId,
        data: {
          name: editingName.trim(),
          color: editingColor,
          probability: Number(editingProbability),
        },
      }).unwrap()
      setEditingStageId(null)
      toast.success('Stage updated successfully')
    } catch {
      toast.error('Failed to update stage')
    }
  }

  const handleCreateStage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStageName.trim()) return
    try {
      await addStage({
        pipelineId: pipeline.id,
        name: newStageName.trim(),
        color: newStageColor,
        probability: Number(newStageProbability),
      }).unwrap()
      setNewStageName('')
      setIsAddingStage(false)
      toast.success('New stage added to pipeline')
    } catch {
      toast.error('Failed to add stage')
    }
  }

  const handleMoveStage = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= sortedStages.length) return

    const newStages = [...sortedStages]
    const temp = newStages[index]
    newStages[index] = newStages[targetIndex]
    newStages[targetIndex] = temp

    const orderings = newStages.map((s, i) => ({ stageId: s.id, order: i }))
    try {
      await reorderStages({ pipelineId: pipeline.id, orderings }).unwrap()
      toast.success('Stage order updated')
    } catch {
      toast.error('Failed to reorder stages')
    }
  }

  const handleDeleteStage = async (stageId: string, stageName: string) => {
    if (sortedStages.length <= 1) {
      toast.error('A pipeline must have at least one stage')
      return
    }
    if (!window.confirm(`Are you sure you want to delete stage "${stageName}"? Active deals must be moved first.`)) {
      return
    }
    try {
      await deleteStage({ pipelineId: pipeline.id, stageId }).unwrap()
      toast.success(`Stage "${stageName}" removed`)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to delete stage. Ensure no active deals exist.')
    }
  }

  const handleDeletePipeline = async () => {
    if (!window.confirm(`Delete pipeline "${pipeline.name}"? This cannot be undone.`)) {
      return
    }
    try {
      await deletePipeline(pipeline.id).unwrap()
      toast.success('Pipeline deleted successfully')
      onOpenChange(false)
      onPipelineDeleted?.()
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to delete pipeline. Move or delete active deals first.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto border-border/80 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center justify-between">
            <span>Pipeline & Stage Customization</span>
            {pipeline.isDefault && (
              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                Default Pipeline
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Configure stages, deal win probability, colors, and sequential order for this pipeline.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Pipeline Name */}
          <form onSubmit={handleRenamePipeline} className="space-y-2">
            <Label className="text-xs font-semibold">Pipeline Name</Label>
            <div className="flex gap-2">
              <Input
                value={pipelineName}
                onChange={(e) => setPipelineName(e.target.value)}
                placeholder="e.g., Buyer Pipeline"
                className="h-9 text-sm"
              />
              <Button
                type="submit"
                size="sm"
                variant="secondary"
                disabled={updatingPipeline || pipelineName === pipeline.name}
                className="h-9 text-xs font-semibold shrink-0"
              >
                Save Name
              </Button>
            </div>
          </form>

          <Separator />

          {/* Stages List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Sequential Stages ({sortedStages.length})
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Deals move step-by-step through these stages in order.
                </p>
              </div>
              {!isAddingStage && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddingStage(true)}
                  className="h-8 text-xs gap-1 border-dashed"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  Add Stage
                </Button>
              )}
            </div>

            {/* Stages Stack */}
            <div className="space-y-2">
              {sortedStages.map((stage, idx) => {
                const isEditing = editingStageId === stage.id

                if (isEditing) {
                  return (
                    <div
                      key={stage.id}
                      className="p-3 rounded-xl border border-primary/40 bg-primary/5 space-y-3 animate-in fade-in"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[11px]">Stage Name</Label>
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px]">Win Probability ({editingProbability}%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={editingProbability}
                            onChange={(e) => setEditingProbability(Number(e.target.value))}
                            className="h-8 text-xs font-mono"
                          />
                        </div>
                      </div>

                      {/* Color presets */}
                      <div className="space-y-1.5">
                        <Label className="text-[11px]">Stage Accent Color</Label>
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {PRESET_COLORS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setEditingColor(c)}
                              className={`w-6 h-6 rounded-full border-2 transition-all ${
                                editingColor === c ? 'scale-110 border-foreground shadow-sm' : 'border-transparent'
                              }`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingStageId(null)}
                          className="h-7 text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          disabled={updatingStage}
                          onClick={() => handleSaveStageEdit(stage.id)}
                          className="h-7 text-xs gap-1"
                        >
                          <CheckIcon className="w-3.5 h-3.5" />
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  )
                }

                return (
                  <div
                    key={stage.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-border/70 bg-card hover:border-border transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Step Number & Color Pill */}
                      <div
                        className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: stage.color }}
                      />
                      <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-foreground truncate">
                        {stage.name}
                      </span>
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 font-mono text-muted-foreground"
                      >
                        {stage.probability}% Win Prob
                      </Badge>
                      <span className="text-[10px] text-muted-foreground hidden sm:inline">
                        {stage.dealCount || 0} deals
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Reorder Buttons */}
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={idx === 0 || reorderingStages}
                        onClick={() => handleMoveStage(idx, 'up')}
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        title="Move Up"
                      >
                        <ChevronUpIcon className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={idx === sortedStages.length - 1 || reorderingStages}
                        onClick={() => handleMoveStage(idx, 'down')}
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        title="Move Down"
                      >
                        <ChevronDownIcon className="w-3.5 h-3.5" />
                      </Button>

                      {/* Edit */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleStartEditStage(stage)}
                        className="h-7 px-2 text-xs"
                      >
                        Edit
                      </Button>

                      {/* Delete */}
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={sortedStages.length <= 1 || deletingStage}
                        onClick={() => handleDeleteStage(stage.id, stage.name)}
                        className="h-7 w-7 text-muted-foreground hover:text-red-500"
                        title="Delete Stage"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Add Stage Inline Form */}
            {isAddingStage && (
              <form
                onSubmit={handleCreateStage}
                className="p-3.5 rounded-xl border border-primary/40 bg-card space-y-3 animate-in fade-in"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                  <SparklesIcon className="w-4 h-4" />
                  <span>Add New Sequential Stage (Step #{sortedStages.length + 1})</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Stage Name</Label>
                    <Input
                      required
                      value={newStageName}
                      onChange={(e) => setNewStageName(e.target.value)}
                      placeholder="e.g., Appraisal Ordered"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Win Probability ({newStageProbability}%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={newStageProbability}
                      onChange={(e) => setNewStageProbability(Number(e.target.value))}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Color presets */}
                <div className="space-y-1.5">
                  <Label className="text-[11px]">Stage Color</Label>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewStageColor(c)}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${
                          newStageColor === c ? 'scale-110 border-foreground shadow-sm' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsAddingStage(false)}
                    className="h-7 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={addingStage || !newStageName.trim()}
                    className="h-7 text-xs gap-1"
                  >
                    {addingStage ? <ArrowPathIcon className="w-3 h-3 animate-spin" /> : <PlusIcon className="w-3 h-3" />}
                    Add Stage
                  </Button>
                </div>
              </form>
            )}
          </div>

          <Separator />

          {/* Danger Zone: Delete Pipeline */}
          <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-red-600 dark:text-red-400">Danger Zone</span>
              <p className="text-[11px] text-muted-foreground">
                Delete this entire pipeline and its stage configurations.
              </p>
            </div>
            <Button
              size="sm"
              variant="destructive"
              disabled={deletingPipeline}
              onClick={handleDeletePipeline}
              className="h-8 text-xs font-semibold gap-1 shrink-0"
            >
              <TrashIcon className="w-3.5 h-3.5" />
              Delete Pipeline
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
