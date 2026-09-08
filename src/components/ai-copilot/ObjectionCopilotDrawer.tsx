import React, { useState, useEffect } from 'react'
import {
  useGenerateRebuttalMutation,
  type GenerateRebuttalResponse,
  type RebuttalAngleType,
  type ObjectionCategory,
} from '@/store/api/objectionsApi'
import {
  XMarkIcon,
  SparklesIcon,
  DocumentDuplicateIcon,
  CheckIcon,
  ArrowRightIcon,
  ChartBarIcon,
  HeartIcon,
  ClockIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'

interface ObjectionCopilotDrawerProps {
  isOpen: boolean
  onClose: () => void
  initialText?: string
  contactName?: string
  onInsertScript: (scriptText: string) => void
}

const CATEGORY_COLORS: Record<ObjectionCategory, { bg: string; text: string; border: string }> = {
  interest_rates: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  market_crash: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
  commission_fees: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  lowball_offers: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  timing_delay: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  other: { bg: 'bg-slate-500/10', text: 'text-slate-300', border: 'border-slate-500/30' },
}

export const ObjectionCopilotDrawer: React.FC<ObjectionCopilotDrawerProps> = ({
  isOpen,
  onClose,
  initialText = '',
  contactName = '',
  onInsertScript,
}) => {
  const [inputText, setInputText] = useState(initialText)
  const [selectedAngle, setSelectedAngle] = useState<RebuttalAngleType>('analytical')
  const [rebuttalData, setRebuttalData] = useState<GenerateRebuttalResponse | null>(null)
  const [copiedAngle, setCopiedAngle] = useState<string | null>(null)

  const [generate, { isLoading: isGenerating }] = useGenerateRebuttalMutation()

  useEffect(() => {
    if (initialText) {
      setInputText(initialText)
      handleAutoGenerate(initialText)
    }
  }, [initialText, isOpen])

  const handleAutoGenerate = async (text: string) => {
    if (!text.trim()) return
    try {
      const res = await generate({
        messageText: text.trim(),
        leadContext: contactName ? { name: contactName } : undefined,
      }).unwrap()

      if (res.success && res.data) {
        setRebuttalData(res.data)
      }
    } catch {
      // Handled by service fallback
    }
  }

  const handleCopy = (text: string, angle: string) => {
    navigator.clipboard.writeText(text)
    setCopiedAngle(angle)
    setTimeout(() => setCopiedAngle(null), 2000)
  }

  const handleInsert = (text: string) => {
    onInsertScript(text)
    onClose()
  }

  if (!isOpen) return null

  const activeRebuttal = rebuttalData?.rebuttals[selectedAngle]
  const categoryStyle = rebuttalData?.category
    ? CATEGORY_COLORS[rebuttalData.category]
    : CATEGORY_COLORS.other

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-xl bg-slate-900 border-l border-slate-800 h-full shadow-2xl flex flex-col z-10">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 backdrop-blur sticky top-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-linear-to-tr from-amber-500/20 to-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <SparklesIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base flex items-center gap-2">
                Objection Handling Copilot
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  AI + Playbook
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Generate tailored, multi-angle rebuttals with Fair Housing compliance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Client Statement Box */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Client Objection / Message</span>
              {isGenerating && <span className="text-[11px] text-emerald-400 animate-pulse">Generating Rebuttals...</span>}
            </label>
            <div className="relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="e.g. Interest rates are over 7%, our monthly payments would be way too high right now..."
                className="w-full h-20 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-none"
              />
              <button
                type="button"
                onClick={() => handleAutoGenerate(inputText)}
                disabled={isGenerating || !inputText.trim()}
                className="absolute bottom-2.5 right-2.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-all shadow disabled:opacity-50 flex items-center gap-1.5"
              >
                <SparklesIcon className="w-3.5 h-3.5" />
                Analyze & Rebut
              </button>
            </div>
          </div>

          {/* Classification Banner */}
          {rebuttalData && (
            <div className={`p-3 rounded-xl border ${categoryStyle.bg} ${categoryStyle.border} flex items-center justify-between`}>
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono tracking-wider uppercase opacity-75 text-slate-400">
                  Detected Real Estate Objection
                </span>
                <p className={`text-xs font-bold ${categoryStyle.text}`}>
                  {rebuttalData.categoryLabel}
                </p>
                {rebuttalData.detectedPhrases.length > 0 && (
                  <p className="text-[11px] text-slate-400">
                    Matches: <span className="text-slate-200">{rebuttalData.detectedPhrases.join(', ')}</span>
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950/40 text-slate-300 border border-slate-800">
                  {Math.round(rebuttalData.confidence * 100)}% Confidence
                </span>
                {rebuttalData.isFromCustomPlaybook && (
                  <p className="text-[10px] text-amber-400 font-semibold mt-1">★ Custom Brokerage Script</p>
                )}
              </div>
            </div>
          )}

          {/* Multi-Angle Selection Tabs */}
          {rebuttalData && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedAngle('analytical')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${selectedAngle === 'analytical'
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                  <ChartBarIcon className="w-4 h-4" />
                  <span>Analytical & Math</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedAngle('empathetic')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${selectedAngle === 'empathetic'
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                  <HeartIcon className="w-4 h-4" />
                  <span>Empathetic & Trust</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedAngle('urgency')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${selectedAngle === 'urgency'
                    ? 'bg-amber-600/20 text-amber-400 border border-amber-500/40 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                  <ClockIcon className="w-4 h-4" />
                  <span>Urgency & Leverage</span>
                </button>
              </div>

              {/* Active Angle Rebuttal Card */}
              {activeRebuttal && (
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3.5 shadow-xl">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                    <div>
                      <h4 className="text-sm font-semibold text-white">{activeRebuttal.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">{activeRebuttal.rationale}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleCopy(activeRebuttal.script, selectedAngle)}
                        className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 transition-colors text-xs flex items-center gap-1"
                        title="Copy to clipboard"
                      >
                        {copiedAngle === selectedAngle ? (
                          <>
                            <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[10px] text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                            <span className="text-[10px]">Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Rebuttal Script Body */}
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80">
                    <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                      "{activeRebuttal.script}"
                    </p>
                  </div>

                  {/* Talking Points */}
                  {activeRebuttal.keyTalkingPoints && activeRebuttal.keyTalkingPoints.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-slate-400">Key Pillars to Emphasize:</span>
                      <ul className="space-y-1">
                        {activeRebuttal.keyTalkingPoints.map((point, idx) => (
                          <li key={idx} className="text-xs text-slate-300 flex items-start gap-1.5">
                            <span className="text-emerald-400 mt-0.5">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Follow-Up Low Friction Prompt */}
                  {activeRebuttal.followUpPrompt && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                      <span className="font-semibold block text-[10px] uppercase tracking-wider text-emerald-400/80 mb-0.5">
                        Closing Question
                      </span>
                      "{activeRebuttal.followUpPrompt}"
                    </div>
                  )}

                  {/* Bottom Action Bar */}
                  <div className="pt-2 flex items-center justify-between border-t border-slate-800/80">
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                      <ShieldCheckIcon className="w-4 h-4" />
                      <span>Fair Housing Verified</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleInsert(activeRebuttal.script)}
                      className="px-4 py-2 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950 flex items-center gap-1.5 transition-all"
                    >
                      <span>Insert into Reply</span>
                      <ArrowRightIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
