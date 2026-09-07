import React, { useState } from 'react'
import {
  useGetPlaybooksQuery,
  useSavePlaybookMutation,
  useDeletePlaybookMutation,
  useGenerateRebuttalMutation,
  type ObjectionCategory,
} from '@/store/api/objectionsApi'
import {
  SparklesIcon,
  PlusIcon,
  DocumentDuplicateIcon,
  CheckIcon,
  TrashIcon,
  ChartBarIcon,
  HeartIcon,
  ClockIcon,
  ShieldCheckIcon,
  BoltIcon,
} from '@heroicons/react/24/outline'

const CATEGORIES: { key: ObjectionCategory | 'all'; label: string; color: string }[] = [
  { key: 'all', label: 'All Playbooks', color: 'text-slate-200' },
  { key: 'interest_rates', label: 'Interest Rates', color: 'text-amber-400' },
  { key: 'market_crash', label: 'Market Crash', color: 'text-rose-400' },
  { key: 'commission_fees', label: 'Commission Fees', color: 'text-purple-400' },
  { key: 'lowball_offers', label: 'Lowball Offers', color: 'text-orange-400' },
  { key: 'timing_delay', label: 'Timing Delay', color: 'text-blue-400' },
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
      <div className="p-6 rounded-2xl bg-linear-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <BoltIcon className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white">Scripts & Objection Playbook Copilot</h2>
          </div>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Empower agents with battle-tested real estate scripts across 3 dynamic angles (Analytical, Empathetic, Urgency) with automated Title VIII Fair Housing safety compliance.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950 flex items-center gap-2 transition-all shrink-0"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Add Custom Script Override</span>
        </button>
      </div>

      {/* Interactive Sandbox Test Bench */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SparklesIcon className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Live Rebuttal Generator Sandbox</h3>
          </div>
          <span className="text-[11px] text-slate-400">Test objection parsing with dual AI + playbook fallback</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-3">
            <input
              type="text"
              value={sandboxText}
              onChange={(e) => setSandboxText(e.target.value)}
              placeholder="Test a client objection (e.g., 'We want to wait until interest rates drop below 5% before buying')..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sandboxCategory}
              onChange={(e) => setSandboxCategory(e.target.value as ObjectionCategory)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
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
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all disabled:opacity-50 shrink-0"
            >
              {isGenerating ? 'Generating...' : 'Test'}
            </button>
          </div>
        </div>

        {/* Sandbox Output Preview */}
        {sandboxResult && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <ShieldCheckIcon className="w-4 h-4" />
                Fair Housing Approved • {sandboxResult.categoryLabel}
              </span>
              <span className="text-slate-400">
                Confidence: {Math.round(sandboxResult.confidence * 100)}%
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-2">
                <div className="flex items-center gap-1 text-blue-400 text-xs font-semibold">
                  <ChartBarIcon className="w-3.5 h-3.5" />
                  <span>Analytical Angle</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed line-clamp-4">
                  "{sandboxResult.rebuttals.analytical.script}"
                </p>
                <button
                  type="button"
                  onClick={() => handleCopy(sandboxResult.rebuttals.analytical.script, 'sb-analytical')}
                  className="text-[10px] text-blue-400 hover:underline flex items-center gap-1"
                >
                  <DocumentDuplicateIcon className="w-3 h-3" />
                  {copiedId === 'sb-analytical' ? 'Copied!' : 'Copy Script'}
                </button>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                <div className="flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                  <HeartIcon className="w-3.5 h-3.5" />
                  <span>Empathetic Angle</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed line-clamp-4">
                  "{sandboxResult.rebuttals.empathetic.script}"
                </p>
                <button
                  type="button"
                  onClick={() => handleCopy(sandboxResult.rebuttals.empathetic.script, 'sb-empathetic')}
                  className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <DocumentDuplicateIcon className="w-3 h-3" />
                  {copiedId === 'sb-empathetic' ? 'Copied!' : 'Copy Script'}
                </button>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
                <div className="flex items-center gap-1 text-amber-400 text-xs font-semibold">
                  <ClockIcon className="w-3.5 h-3.5" />
                  <span>Urgency Angle</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed line-clamp-4">
                  "{sandboxResult.rebuttals.urgency.script}"
                </p>
                <button
                  type="button"
                  onClick={() => handleCopy(sandboxResult.rebuttals.urgency.script, 'sb-urgency')}
                  className="text-[10px] text-amber-400 hover:underline flex items-center gap-1"
                >
                  <DocumentDuplicateIcon className="w-3 h-3" />
                  {copiedId === 'sb-urgency' ? 'Copied!' : 'Copy Script'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => setSelectedCategory(cat.key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${selectedCategory === cat.key
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Playbooks Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-sm">Loading objection playbooks...</div>
      ) : playbooks.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-sm bg-slate-900/50 rounded-2xl border border-slate-800">
          No playbooks found in this category.
        </div>
      ) : (
        <div className="space-y-4">
          {playbooks.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg hover:border-slate-700/80 transition-all"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono font-medium">
                      {item.categoryLabel}
                    </span>
                    {item.isCustom ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                        Custom Brokerage Override
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400">
                        System Default Playbook
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white">{item.title}</h3>
                </div>

                {item.isCustom && (
                  <button
                    type="button"
                    onClick={() => deletePlaybook(item.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Delete custom script"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Trigger Keywords */}
              {item.triggerKeywords.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-slate-400 font-medium">Triggers:</span>
                  {item.triggerKeywords.map((kw, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-950 text-slate-400 border border-slate-800"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}

              {/* 3 Angles Display */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-800/70">
                {/* Analytical */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-blue-400 text-xs font-semibold">
                      <ChartBarIcon className="w-4 h-4" />
                      <span>Analytical Script</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                      "{item.angles.analytical.script}"
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleCopy(item.angles.analytical.script, `${item.id}-ana`)}
                      className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                    >
                      {copiedId === `${item.id}-ana` ? (
                        <>
                          <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-medium">Copied</span>
                        </>
                      ) : (
                        <>
                          <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Empathetic */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                      <HeartIcon className="w-4 h-4" />
                      <span>Empathetic Script</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                      "{item.angles.empathetic.script}"
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleCopy(item.angles.empathetic.script, `${item.id}-emp`)}
                      className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                    >
                      {copiedId === `${item.id}-emp` ? (
                        <>
                          <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-medium">Copied</span>
                        </>
                      ) : (
                        <>
                          <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Urgency */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold">
                      <ClockIcon className="w-4 h-4" />
                      <span>Urgency Script</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                      "{item.angles.urgency.script}"
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleCopy(item.angles.urgency.script, `${item.id}-urg`)}
                      className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                    >
                      {copiedId === `${item.id}-urg` ? (
                        <>
                          <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-medium">Copied</span>
                        </>
                      ) : (
                        <>
                          <DocumentDuplicateIcon className="w-3.5 h-3.5" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Create Custom Objection Script Override</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCustomPlaybook} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as ObjectionCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
                  >
                    <option value="interest_rates">Interest Rates & Affordability</option>
                    <option value="market_crash">Market Crash Fears</option>
                    <option value="commission_fees">Commission Fees</option>
                    <option value="lowball_offers">Lowball Offers</option>
                    <option value="timing_delay">Timing Delay</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Script Title</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g., Company 2-1 Buydown Script"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Trigger Keywords (comma separated)</label>
                <input
                  type="text"
                  value={newKeywords}
                  onChange={(e) => setNewKeywords(e.target.value)}
                  placeholder="e.g., rate, 7%, high payments, unaffordable"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-blue-400 flex items-center gap-1">
                  <ChartBarIcon className="w-3.5 h-3.5" />
                  <span>1. Analytical Rebuttal (Math & Financial Logic)</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={newAnalytical}
                  onChange={(e) => setNewAnalytical(e.target.value)}
                  placeholder="Data-backed response focusing on numbers, equity, and refinancing leverage..."
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  <HeartIcon className="w-3.5 h-3.5" />
                  <span>2. Empathetic Rebuttal (Rapport & Consultative)</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={newEmpathetic}
                  onChange={(e) => setNewEmpathetic(e.target.value)}
                  placeholder="Relationship-first response validating their emotions and reducing pressure..."
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                  <ClockIcon className="w-3.5 h-3.5" />
                  <span>3. Urgency Rebuttal (Opportunity & Scarcity)</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={newUrgency}
                  onChange={(e) => setNewUrgency(e.target.value)}
                  placeholder="Opportunity response highlighting the cost of waiting and market leverage..."
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Script Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
