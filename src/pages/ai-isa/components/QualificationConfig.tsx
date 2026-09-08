import React, { useState, useEffect } from 'react'
import type { QualificationCriteria } from '@/types/communication'
import {
  useCreateQualificationCriteriaMutation,
  useDeleteQualificationCriteriaMutation,
} from '@/store/api/communicationApi'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
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
    toast.success('Rule updated')
  }

  const handleUpdateDirective = (id: string, directive: string) => {
    const updated = list.map((item) =>
      item.id === id ? { ...item, promptDirective: directive } : item
    )
    setList(updated)
  }

  const handleSaveAll = () => {
    onSaveCriteria(list)
    toast.success('Rules saved')
  }

  const handleDelete = async (id: string, label: string) => {
    if (!window.confirm(`Delete rule "${label}"?`)) return
    try {
      await deleteCriteria(id).unwrap()
      toast.success('Rule deleted')
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

      toast.success(`Rule created`)
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
      toast.error('Failed to create rule')
    }
  }

  return (
    <div className="bg-white dark:bg-[#254238] border border-[#D8E2D6] dark:border-[#618764] rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#D8E2D6] dark:border-[#618764]/40">
        <div>
          <div className="flex items-center gap-2">
            <MaterialIcon name="tune" size={20} className="text-[#2B5748] dark:text-[#9CB080]" />
            <h3 className="font-bold text-base text-[#273338] dark:text-white">
              Qualification Rules
            </h3>
          </div>
          <p className="text-xs text-[#4A5D54] dark:text-[#A0B2A6] mt-0.5">
            Configure questions the AI ISA must verify before booking agent tours
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl border border-[#D8E2D6] dark:border-[#618764] hover:bg-[#EDF2EB] dark:hover:bg-[#202B2F] text-[#273338] dark:text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <MaterialIcon name="add" size={16} />
            <span>Add Rule</span>
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            className="px-5 py-2.5 rounded-xl bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <MaterialIcon name="save" size={16} />
            <span>Save Rules</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {list.map((item, idx) => (
          <div
            key={item.id}
            className="p-4 sm:p-5 rounded-xl bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/50 space-y-3 transition-all"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="h-6 w-6 rounded-full bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#2B5748] dark:text-[#9CB080] font-bold text-xs flex items-center justify-center border border-[#D8E2D6] dark:border-[#618764]/40">
                  {idx + 1}
                </span>
                <div>
                  <span className="font-bold text-sm text-[#273338] dark:text-white">{item.label}</span>
                  <span className="text-[11px] text-[#75887E] dark:text-[#A0B2A6] ml-2 uppercase font-semibold">
                    ({item.category.replace('_', ' ')})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-[#4A5D54] dark:text-[#A0B2A6] cursor-pointer">
                  <span>Mandatory</span>
                  <input
                    type="checkbox"
                    checked={item.isRequired}
                    onChange={() => toggleRequired(item.id)}
                    className="h-4 w-4 rounded border-[#D8E2D6] dark:border-[#618764] text-[#2B5748] focus:ring-[#9CB080]"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => handleDelete(item.id, item.label)}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-[#75887E] dark:text-[#A0B2A6] hover:text-red-500 transition-all cursor-pointer"
                  title="Delete Rule"
                >
                  <MaterialIcon name="delete" size={16} />
                </button>
              </div>
            </div>

            {/* AI Prompt Directive */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#75887E] dark:text-[#A0B2A6]">
                Directive:
              </span>
              <textarea
                value={item.promptDirective}
                onChange={(e) => handleUpdateDirective(item.id, e.target.value)}
                rows={2}
                className="w-full text-xs rounded-lg bg-white dark:bg-[#1A2E26] border border-[#D8E2D6] dark:border-[#618764] p-3 text-[#273338] dark:text-white focus:outline-none focus:border-[#9CB080] leading-relaxed"
              />
            </div>

            {/* Options pills if available */}
            {item.options && item.options.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] mr-1">Options:</span>
                {item.options.map((opt, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-[#1A2E26] border border-[#D8E2D6] dark:border-[#618764]/40 text-[#4A5D54] dark:text-[#A0B2A6]"
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#254238] border border-[#D8E2D6] dark:border-[#618764] rounded-2xl p-6 shadow-xl max-w-lg w-full space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/40">
              <div className="flex items-center gap-2">
                <MaterialIcon name="add" size={20} className="text-[#2B5748] dark:text-[#9CB080]" />
                <h4 className="font-bold text-base text-[#273338] dark:text-white">
                  Add Rule
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[#EDF2EB] dark:hover:bg-[#202B2F] text-[#75887E] dark:text-[#A0B2A6] cursor-pointer"
              >
                <MaterialIcon name="close" size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold uppercase tracking-wider text-[#4A5D54] dark:text-[#A0B2A6] block mb-1">
                    Category
                  </label>
                  <select
                    value={newRule.category}
                    onChange={(e) => setNewRule({ ...newRule, category: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white focus:outline-none focus:border-[#9CB080]"
                  >
                    <option value="budget">Budget</option>
                    <option value="timeline">Timeline</option>
                    <option value="pre_approval">Pre-Approval</option>
                    <option value="location">Location</option>
                    <option value="home_to_sell">Home Contingency</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold uppercase tracking-wider text-[#4A5D54] dark:text-[#A0B2A6] block mb-1">
                    Label
                  </label>
                  <input
                    type="text"
                    required
                    value={newRule.label}
                    onChange={(e) => setNewRule({ ...newRule, label: e.target.value })}
                    placeholder="e.g. Down Payment"
                    className="w-full p-2.5 rounded-xl bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white focus:outline-none focus:border-[#9CB080]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-[#4A5D54] dark:text-[#A0B2A6] block mb-1">
                  Directive
                </label>
                <textarea
                  rows={2}
                  required
                  value={newRule.promptDirective}
                  onChange={(e) => setNewRule({ ...newRule, promptDirective: e.target.value })}
                  placeholder="e.g. Verify down payment readiness."
                  className="w-full p-2.5 rounded-xl bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white focus:outline-none focus:border-[#9CB080] leading-relaxed"
                />
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-[#4A5D54] dark:text-[#A0B2A6] block mb-1">
                  Options (Comma separated)
                </label>
                <input
                  type="text"
                  value={newRule.optionsString}
                  onChange={(e) => setNewRule({ ...newRule, optionsString: e.target.value })}
                  placeholder="e.g. 5% Down, 10% Down, Cash"
                  className="w-full p-2.5 rounded-xl bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white focus:outline-none focus:border-[#9CB080]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isRequiredNew"
                  checked={newRule.isRequired}
                  onChange={(e) => setNewRule({ ...newRule, isRequired: e.target.checked })}
                  className="h-4 w-4 rounded border-[#D8E2D6] text-[#2B5748] focus:ring-[#9CB080]"
                />
                <label htmlFor="isRequiredNew" className="font-medium text-[#273338] dark:text-white cursor-pointer">
                  Mandatory qualification requirement
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#D8E2D6] dark:border-[#618764]/40">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#D8E2D6] dark:border-[#618764] hover:bg-[#EDF2EB] dark:hover:bg-[#202B2F] font-semibold text-[#4A5D54] dark:text-[#A0B2A6] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 rounded-xl bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] font-bold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isCreating ? 'Adding...' : 'Add Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

