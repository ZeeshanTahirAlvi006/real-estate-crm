import React, { useState, useEffect } from 'react'
import type { QualificationCriteria } from '@/types/communication'
import {
  useCreateQualificationCriteriaMutation,
  useDeleteQualificationCriteriaMutation,
} from '@/store/api/communicationApi'
import {
  SparklesIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline'
import { toast } from 'sonner'

interface QualificationConfigProps {
  criteria: QualificationCriteria[]
  onSaveCriteria: (newCriteria: QualificationCriteria[]) => void
}

export const QualificationConfig: React.FC<QualificationConfigProps> = ({
  criteria,
  onSaveCriteria,
}) => {
  const [createCriteria, { isLoading: isCreating }] = useCreateQualificationCriteriaMutation()
  const [deleteCriteria] = useDeleteQualificationCriteriaMutation()

  const [list, setList] = useState<QualificationCriteria[]>(criteria)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [newRule, setNewRule] = useState({
    category: 'budget',
    label: '',
    isRequired: true,
    promptDirective: '',
    optionsString: '',
    order: 0,
  })

  useEffect(() => {
    setList(criteria)
  }, [criteria])

  const toggleRequired = (id: string) => {
    const updated = list.map((item) =>
      item.id === id ? { ...item, isRequired: !item.isRequired } : item
    )
    setList(updated)
    onSaveCriteria(updated)
    toast.success('Qualification rule updated')
  }

  const handleUpdateDirective = (id: string, directive: string) => {
    const updated = list.map((item) =>
      item.id === id ? { ...item, promptDirective: directive } : item
    )
    setList(updated)
  }

  const handleSaveAll = () => {
    onSaveCriteria(list)
    toast.success('AI ISA Qualification Script saved successfully')
  }

  const handleDelete = async (id: string, label: string) => {
    if (!window.confirm(`Delete qualification question "${label}"?`)) return
    try {
      await deleteCriteria(id).unwrap()
      toast.success('Qualification rule deleted')
    } catch {
      toast.error('Failed to delete rule')
    }
  }

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const options = newRule.optionsString
        ? newRule.optionsString.split(',').map((s) => s.trim()).filter(Boolean)
        : []

      await createCriteria({
        category: newRule.category,
        label: newRule.label,
        isRequired: newRule.isRequired,
        promptDirective: newRule.promptDirective,
        options,
        order: list.length,
      }).unwrap()

      toast.success(`Rule "${newRule.label}" created successfully`)
      setIsModalOpen(false)
      setNewRule({
        category: 'budget',
        label: '',
        isRequired: true,
        promptDirective: '',
        optionsString: '',
        order: 0,
      })
    } catch {
      toast.error('Failed to create qualification rule')
    }
  }

  return (
    <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-sm space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-base text-foreground">
              AI ISA Qualification Criteria & Persona Directives
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure the required checklist questions the AI ISA must confirm before booking an agent showing or live warm transfer.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl border border-border/70 hover:bg-muted/70 text-foreground font-bold text-xs shadow-sm transition-all hover:scale-[1.02] flex items-center gap-1.5"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add Question</span>
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-md transition-all hover:scale-[1.02] flex items-center gap-1.5"
          >
            <CheckBadgeIcon className="w-4 h-4" />
            <span>Save All Directives</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {list.map((item, idx) => (
          <div
            key={item.id}
            className="p-5 rounded-2xl bg-muted/30 border border-border/70 space-y-3 transition-all hover:border-primary/40"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="h-6 w-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                  {idx + 1}
                </span>
                <div>
                  <span className="font-bold text-sm text-foreground">{item.label}</span>
                  <span className="text-[11px] text-muted-foreground ml-2 uppercase font-semibold">
                    ({item.category.replace('_', ' ')})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <span>Mandatory Qualifying Field</span>
                  <input
                    type="checkbox"
                    checked={item.isRequired}
                    onChange={() => toggleRequired(item.id)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => handleDelete(item.id, item.label)}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all"
                  title="Delete Question"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* AI Prompt Directive */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                AI Behavior & Conversational Directive:
              </span>
              <textarea
                value={item.promptDirective}
                onChange={(e) => handleUpdateDirective(item.id, e.target.value)}
                rows={2}
                className="w-full text-xs rounded-xl bg-background border border-border/70 p-3 focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
              />
            </div>

            {/* Options pills if available */}
            {item.options && item.options.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-muted-foreground mr-1">Pre-set Options:</span>
                {item.options.map((opt, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-background border border-border/50 text-muted-foreground"
                  >
                    {opt}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal: Add Qualification Question */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-xl max-w-lg w-full space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <PlusIcon className="w-5 h-5 text-primary" />
                <h4 className="font-bold text-base text-foreground">
                  Add Qualification Question
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Category
                  </label>
                  <select
                    value={newRule.category}
                    onChange={(e) => setNewRule({ ...newRule, category: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-background border border-border/70 focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="budget">Budget & Price</option>
                    <option value="timeline">Purchase Timeline</option>
                    <option value="pre_approval">Pre-Approval Status</option>
                    <option value="location">Target Location</option>
                    <option value="home_to_sell">Home Contingency</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Question Label
                  </label>
                  <input
                    type="text"
                    required
                    value={newRule.label}
                    onChange={(e) => setNewRule({ ...newRule, label: e.target.value })}
                    placeholder="e.g. Down Payment Readiness"
                    className="w-full p-2.5 rounded-xl bg-background border border-border/70 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  AI Behavioral Directive
                </label>
                <textarea
                  rows={2}
                  required
                  value={newRule.promptDirective}
                  onChange={(e) => setNewRule({ ...newRule, promptDirective: e.target.value })}
                  placeholder="e.g. Ask how much funds they have prepared for the initial earnest money deposit."
                  className="w-full p-2.5 rounded-xl bg-background border border-border/70 focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                />
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Pre-set Options (Comma separated)
                </label>
                <input
                  type="text"
                  value={newRule.optionsString}
                  onChange={(e) => setNewRule({ ...newRule, optionsString: e.target.value })}
                  placeholder="e.g. 5% Down, 10% Down, 20%+ Down, Cash"
                  className="w-full p-2.5 rounded-xl bg-background border border-border/70 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isRequiredNew"
                  checked={newRule.isRequired}
                  onChange={(e) => setNewRule({ ...newRule, isRequired: e.target.checked })}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="isRequiredNew" className="font-medium text-foreground cursor-pointer">
                  Mandatory checklist requirement before agent handoff
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border/70 hover:bg-muted font-semibold text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md disabled:opacity-50"
                >
                  {isCreating ? 'Adding...' : 'Add Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
