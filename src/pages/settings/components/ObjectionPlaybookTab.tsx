import React, { useState } from 'react'
import {
  useGetPlaybooksQuery,
  useSavePlaybookMutation,
  useDeletePlaybookMutation,
  useGenerateRebuttalMutation,
  type ObjectionCategory,
} from '@/store/api/objectionsApi'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

const CATEGORIES: { key: ObjectionCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All Playbooks' },
  { key: 'interest_rates', label: 'Interest Rates' },
  { key: 'market_crash', label: 'Market Crash' },
  { key: 'commission_fees', label: 'Commission Fees' },
  { key: 'lowball_offers', label: 'Lowball Offers' },
  { key: 'timing_delay', label: 'Timing Delay' },
]

export const ObjectionPlaybookTab: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<ObjectionCategory | 'all'>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // Interactive Live Sandbox State
  const [sandboxText, setSandboxText] = useState('')
  const [sandboxCategory, setSandboxCategory] = useState<ObjectionCategory>('interest_rates')
  const [sandboxResult, setSandboxResult] = useState<any>(null)

  const { data: playbooksResponse, isLoading } = useGetPlaybooksQuery(
    selectedCategory === 'all' ? undefined : { category: selectedCategory }
  )
  const [savePlaybook, { isLoading: isSaving }] = useSavePlaybookMutation()
  const [deletePlaybook] = useDeletePlaybookMutation()
  const [generateRebuttal, { isLoading: isGenerating }] = useGenerateRebuttalMutation()

  // New Custom Playbook Form State
  const [newCategory, setNewCategory] = useState<ObjectionCategory>('interest_rates')
  const [newTitle, setNewTitle] = useState('')
  const [newKeywords, setNewKeywords] = useState('')
  const [newAnalytical, setNewAnalytical] = useState('')
  const [newEmpathetic, setNewEmpathetic] = useState('')
  const [newUrgency, setNewUrgency] = useState('')

  const playbooks = playbooksResponse?.data || []

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleRunSandbox = async () => {
    if (!sandboxText.trim()) return
    try {
      const res = await generateRebuttal({
        messageText: sandboxText.trim(),
        category: sandboxCategory,
      }).unwrap()

      if (res.success && res.data) {
        setSandboxResult(res.data)
      }
    } catch {
      // Handled
    }
  }

  const handleSaveCustomPlaybook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !newAnalytical.trim() || !newEmpathetic.trim() || !newUrgency.trim()) return

    try {
      await savePlaybook({
        category: newCategory,
        title: newTitle.trim(),
        triggerKeywords: newKeywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
        angles: {
          analytical: { script: newAnalytical.trim() },
          empathetic: { script: newEmpathetic.trim() },
          urgency: { script: newUrgency.trim() },
        },
      }).unwrap()

      setIsAddModalOpen(false)
      setNewTitle('')
      setNewKeywords('')
      setNewAnalytical('')
      setNewEmpathetic('')
      setNewUrgency('')
    } catch {
      // Handled
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#2B5748] border border-[#D8E2D6] dark:border-[#618764] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#9CB080]/20 text-[#273338] dark:text-[#9CB080] flex items-center justify-center">
            <MaterialIcon name="menu_book" size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#273338] dark:text-white">Objection Playbooks</h2>
            <p className="text-xs text-[#75887E] dark:text-[#A0B2A6] mt-0.5">
              Script objection handling
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="px-3.5 py-2 rounded-lg bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
        >
          <MaterialIcon name="add" size={16} />
          <span>Add Playbook</span>
        </button>
      </div>

      {/* Interactive Sandbox Test Bench */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#2B5748] border border-[#D8E2D6] dark:border-[#618764] space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MaterialIcon name="auto_awesome" size={18} className="text-[#2B5748] dark:text-[#9CB080]" />
            <h3 className="text-sm font-bold text-[#273338] dark:text-white">Live Sandbox</h3>
          </div>
          <span className="text-[11px] text-[#75887E] dark:text-[#A0B2A6]">Test objection parsing</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-3">
            <input
              type="text"
              value={sandboxText}
              onChange={(e) => setSandboxText(e.target.value)}
              placeholder="Test a client objection..."
              className="w-full px-3.5 py-2 rounded-lg bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-xs text-[#273338] dark:text-white placeholder-[#75887E] focus:outline-none focus:border-[#9CB080]"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sandboxCategory}
              onChange={(e) => setSandboxCategory(e.target.value as ObjectionCategory)}
              className="w-full px-3 py-2 rounded-lg bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-xs text-[#273338] dark:text-white focus:outline-none"
            >
              <option value="interest_rates">Interest Rates</option>
              <option value="market_crash">Market Crash</option>
              <option value="commission_fees">Commission Fees</option>
              <option value="lowball_offers">Lowball Offers</option>
              <option value="timing_delay">Timing Delay</option>
            </select>

            <button
              type="button"
              onClick={handleRunSandbox}
              disabled={isGenerating || !sandboxText.trim()}
              className="px-4 py-2 rounded-lg bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] text-xs font-bold transition-all disabled:opacity-50 shrink-0 cursor-pointer"
            >
              {isGenerating ? 'Testing...' : 'Test'}
            </button>
          </div>
        </div>

        {/* Sandbox Output Preview */}
        {sandboxResult && (
          <div className="p-4 rounded-xl bg-[#EDF2EB] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#2B5748] dark:text-[#9CB080] flex items-center gap-1.5">
                <MaterialIcon name="verified_user" size={16} />
                Fair Housing Approved • {sandboxResult.categoryLabel}
              </span>
              <span className="text-[#75887E] dark:text-[#A0B2A6]">
                Confidence: {Math.round(sandboxResult.confidence * 100)}%
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-white dark:bg-[#273338] border border-[#D8E2D6] dark:border-[#618764] space-y-2">
                <div className="flex items-center gap-1 text-[#273338] dark:text-white text-xs font-semibold">
                  <MaterialIcon name="analytics" size={16} className="text-[#9CB080]" />
                  <span>Analytical Angle</span>
                </div>
                <p className="text-xs text-[#4A5D54] dark:text-[#E2ECE4] leading-relaxed line-clamp-4">
                  "{sandboxResult.rebuttals.analytical.script}"
                </p>
                <button
                  type="button"
                  onClick={() => handleCopy(sandboxResult.rebuttals.analytical.script, 'sb-analytical')}
                  className="text-[10px] text-[#2B5748] dark:text-[#9CB080] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <MaterialIcon name="content_copy" size={14} />
                  {copiedId === 'sb-analytical' ? 'Copied!' : 'Copy Script'}
                </button>
              </div>

              <div className="p-3 rounded-lg bg-white dark:bg-[#273338] border border-[#D8E2D6] dark:border-[#618764] space-y-2">
                <div className="flex items-center gap-1 text-[#273338] dark:text-white text-xs font-semibold">
                  <MaterialIcon name="favorite" size={16} className="text-[#9CB080]" />
                  <span>Empathetic Angle</span>
                </div>
                <p className="text-xs text-[#4A5D54] dark:text-[#E2ECE4] leading-relaxed line-clamp-4">
                  "{sandboxResult.rebuttals.empathetic.script}"
                </p>
                <button
                  type="button"
                  onClick={() => handleCopy(sandboxResult.rebuttals.empathetic.script, 'sb-empathetic')}
                  className="text-[10px] text-[#2B5748] dark:text-[#9CB080] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <MaterialIcon name="content_copy" size={14} />
                  {copiedId === 'sb-empathetic' ? 'Copied!' : 'Copy Script'}
                </button>
              </div>

              <div className="p-3 rounded-lg bg-white dark:bg-[#273338] border border-[#D8E2D6] dark:border-[#618764] space-y-2">
                <div className="flex items-center gap-1 text-[#273338] dark:text-white text-xs font-semibold">
                  <MaterialIcon name="schedule" size={16} className="text-[#9CB080]" />
                  <span>Urgency Angle</span>
                </div>
                <p className="text-xs text-[#4A5D54] dark:text-[#E2ECE4] leading-relaxed line-clamp-4">
                  "{sandboxResult.rebuttals.urgency.script}"
                </p>
                <button
                  type="button"
                  onClick={() => handleCopy(sandboxResult.rebuttals.urgency.script, 'sb-urgency')}
                  className="text-[10px] text-[#2B5748] dark:text-[#9CB080] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <MaterialIcon name="content_copy" size={14} />
                  {copiedId === 'sb-urgency' ? 'Copied!' : 'Copy Script'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => setSelectedCategory(cat.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === cat.key
                ? 'bg-[#9CB080] text-[#273338] font-bold shadow-xs'
                : 'bg-white dark:bg-[#2B5748] text-[#4A5D54] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white border border-[#D8E2D6] dark:border-[#618764]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Playbooks Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-[#75887E] dark:text-[#A0B2A6] text-xs">Loading playbooks...</div>
      ) : playbooks.length === 0 ? (
        <div className="p-8 text-center text-[#75887E] dark:text-[#A0B2A6] text-xs bg-white dark:bg-[#2B5748] rounded-xl border border-[#D8E2D6] dark:border-[#618764]">
          No playbooks found in this category.
        </div>
      ) : (
        <div className="space-y-4">
          {playbooks.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-xl bg-white dark:bg-[#2B5748] border border-[#D8E2D6] dark:border-[#618764] space-y-3 shadow-xs"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-0.5 rounded-md bg-[#EDF2EB] dark:bg-[#202B2F] text-[#273338] dark:text-white font-mono font-medium border border-[#D8E2D6] dark:border-[#618764]">
                      {item.categoryLabel}
                    </span>
                    {item.isCustom ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#9CB080]/20 text-[#273338] dark:text-[#9CB080] border border-[#9CB080]/40 font-semibold">
                        Custom Override
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#EDF2EB] dark:bg-[#202B2F] text-[#75887E] dark:text-[#A0B2A6]">
                        Default Playbook
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-[#273338] dark:text-white">{item.title}</h3>
                </div>

                {item.isCustom && (
                  <button
                    type="button"
                    onClick={() => deletePlaybook(item.id)}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Delete script"
                  >
                    <MaterialIcon name="delete" size={16} />
                  </button>
                )}
              </div>

              {/* Trigger Keywords */}
              {item.triggerKeywords.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-[#75887E] dark:text-[#A0B2A6] font-medium">Triggers:</span>
                  {item.triggerKeywords.map((kw, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-[#F5F7F4] dark:bg-[#202B2F] text-[#4A5D54] dark:text-[#E2ECE4] border border-[#D8E2D6] dark:border-[#618764]"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}

              {/* 3 Angles Display */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-[#D8E2D6] dark:border-[#618764]/40">
                {/* Analytical */}
                <div className="p-3.5 rounded-lg bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] space-y-2 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[#273338] dark:text-white text-xs font-semibold">
                      <MaterialIcon name="analytics" size={16} className="text-[#9CB080]" />
                      <span>Analytical Angle</span>
                    </div>
                    <p className="text-xs text-[#4A5D54] dark:text-[#E2ECE4] leading-relaxed whitespace-pre-line">
                      "{item.angles.analytical.script}"
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#D8E2D6] dark:border-[#618764]/40 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleCopy(item.angles.analytical.script, `${item.id}-ana`)}
                      className="text-[11px] text-[#2B5748] dark:text-[#9CB080] hover:underline flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedId === `${item.id}-ana` ? (
                        <>
                          <MaterialIcon name="check" size={14} className="text-[#9CB080]" />
                          <span className="font-medium">Copied</span>
                        </>
                      ) : (
                        <>
                          <MaterialIcon name="content_copy" size={14} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Empathetic */}
                <div className="p-3.5 rounded-lg bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] space-y-2 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[#273338] dark:text-white text-xs font-semibold">
                      <MaterialIcon name="favorite" size={16} className="text-[#9CB080]" />
                      <span>Empathetic Angle</span>
                    </div>
                    <p className="text-xs text-[#4A5D54] dark:text-[#E2ECE4] leading-relaxed whitespace-pre-line">
                      "{item.angles.empathetic.script}"
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#D8E2D6] dark:border-[#618764]/40 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleCopy(item.angles.empathetic.script, `${item.id}-emp`)}
                      className="text-[11px] text-[#2B5748] dark:text-[#9CB080] hover:underline flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedId === `${item.id}-emp` ? (
                        <>
                          <MaterialIcon name="check" size={14} className="text-[#9CB080]" />
                          <span className="font-medium">Copied</span>
                        </>
                      ) : (
                        <>
                          <MaterialIcon name="content_copy" size={14} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Urgency */}
                <div className="p-3.5 rounded-lg bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] space-y-2 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[#273338] dark:text-white text-xs font-semibold">
                      <MaterialIcon name="schedule" size={16} className="text-[#9CB080]" />
                      <span>Urgency Angle</span>
                    </div>
                    <p className="text-xs text-[#4A5D54] dark:text-[#E2ECE4] leading-relaxed whitespace-pre-line">
                      "{item.angles.urgency.script}"
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#D8E2D6] dark:border-[#618764]/40 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleCopy(item.angles.urgency.script, `${item.id}-urg`)}
                      className="text-[11px] text-[#2B5748] dark:text-[#9CB080] hover:underline flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedId === `${item.id}-urg` ? (
                        <>
                          <MaterialIcon name="check" size={14} className="text-[#9CB080]" />
                          <span className="font-medium">Copied</span>
                        </>
                      ) : (
                        <>
                          <MaterialIcon name="content_copy" size={14} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Custom Playbook Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#2B5748] border border-[#D8E2D6] dark:border-[#618764] rounded-xl w-full max-w-2xl p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/60">
              <h3 className="text-base font-bold text-[#273338] dark:text-white">Create Playbook</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#75887E] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCustomPlaybook} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#4A5D54] dark:text-[#E2ECE4]">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as ObjectionCategory)}
                    className="w-full px-3 py-2 rounded-lg bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-xs text-[#273338] dark:text-white"
                  >
                    <option value="interest_rates">Interest Rates</option>
                    <option value="market_crash">Market Crash</option>
                    <option value="commission_fees">Commission Fees</option>
                    <option value="lowball_offers">Lowball Offers</option>
                    <option value="timing_delay">Timing Delay</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#4A5D54] dark:text-[#E2ECE4]">Script Title</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. 2-1 Buydown Script"
                    className="w-full px-3 py-2 rounded-lg bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-xs text-[#273338] dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#4A5D54] dark:text-[#E2ECE4]">Trigger Keywords</label>
                <input
                  type="text"
                  value={newKeywords}
                  onChange={(e) => setNewKeywords(e.target.value)}
                  placeholder="e.g. rate, high payments, 7%"
                  className="w-full px-3 py-2 rounded-lg bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-xs text-[#273338] dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#273338] dark:text-white flex items-center gap-1">
                  <MaterialIcon name="analytics" size={16} className="text-[#9CB080]" />
                  <span>1. Analytical Angle</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={newAnalytical}
                  onChange={(e) => setNewAnalytical(e.target.value)}
                  placeholder="Data-backed response focusing on numbers and equity..."
                  className="w-full p-2.5 rounded-lg bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-xs text-[#273338] dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#273338] dark:text-white flex items-center gap-1">
                  <MaterialIcon name="favorite" size={16} className="text-[#9CB080]" />
                  <span>2. Empathetic Angle</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={newEmpathetic}
                  onChange={(e) => setNewEmpathetic(e.target.value)}
                  placeholder="Rapport response validating emotions..."
                  className="w-full p-2.5 rounded-lg bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-xs text-[#273338] dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#273338] dark:text-white flex items-center gap-1">
                  <MaterialIcon name="schedule" size={16} className="text-[#9CB080]" />
                  <span>3. Urgency Angle</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={newUrgency}
                  onChange={(e) => setNewUrgency(e.target.value)}
                  placeholder="Opportunity response on cost of waiting..."
                  className="w-full p-2.5 rounded-lg bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-xs text-[#273338] dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D8E2D6] dark:border-[#618764]/60">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs text-[#75887E] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? 'Saving...' : 'Save Playbook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
