import React, { useState, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  FEATURE_GUIDES,
  getFeatureGuideForPath,
  type FeatureGuide,
} from '@/constants/featureGuides'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  BookOpenIcon,
  WrenchScrewdriverIcon,
  ShieldExclamationIcon,
  LightBulbIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowRightIcon,
  SparklesIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface HelpGuideDrawerProps {
  isOpen: boolean
  onClose: () => void
  initialFeatureId?: string
}

export const HelpGuideDrawer: React.FC<HelpGuideDrawerProps> = ({
  isOpen,
  onClose,
  initialFeatureId,
}) => {
  const location = useLocation()
  const navigate = useNavigate()

  // Default guide for current path
  const defaultGuideId = initialFeatureId || getFeatureGuideForPath(location.pathname).id
  const [manualGuideId, setManualGuideId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'steps' | 'workarounds' | 'limits' | 'protips'>('steps')
  const [manualExpandedTaskId, setManualExpandedTaskId] = useState<string | null>(null)
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({})
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null)

  const selectedGuideId = manualGuideId || defaultGuideId

  const currentGuide: FeatureGuide = useMemo(() => {
    return FEATURE_GUIDES.find((g) => g.id === selectedGuideId) || FEATURE_GUIDES[0]
  }, [selectedGuideId])

  const expandedTaskId =
    manualExpandedTaskId !== null
      ? manualExpandedTaskId
      : currentGuide.stepByStepTasks[0]?.id || null

  // Filtered tasks and workarounds based on search
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return currentGuide.stepByStepTasks
    const q = searchQuery.toLowerCase()
    return currentGuide.stepByStepTasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.steps.some((s) => s.instruction.toLowerCase().includes(q) || (s.detail && s.detail.toLowerCase().includes(q)))
    )
  }, [currentGuide, searchQuery])

  const filteredWorkarounds = useMemo(() => {
    if (!searchQuery.trim()) return currentGuide.workarounds
    const q = searchQuery.toLowerCase()
    return currentGuide.workarounds.filter(
      (w) =>
        w.issue.toLowerCase().includes(q) ||
        w.cause.toLowerCase().includes(q) ||
        w.symptoms.some((s) => s.toLowerCase().includes(q)) ||
        w.recommendedWorkaround.steps.some((s) => s.toLowerCase().includes(q))
    )
  }, [currentGuide, searchQuery])

  const toggleStepCompleted = (taskId: string, stepNum: number) => {
    const key = `${taskId}-${stepNum}`
    setCompletedSteps((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleFeedback = (isPositive: boolean) => {
    setFeedbackGiven(isPositive)
    toast.success(isPositive ? 'Thank you for your feedback!' : 'We will improve this guide.')
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-[95vw] max-w-5xl sm:max-w-5xl md:max-w-5xl lg:max-w-5xl xl:max-w-5xl p-0 h-[88vh] max-h-[850px] overflow-hidden flex flex-col bg-background/95 backdrop-blur-xl border border-border shadow-2xl rounded-3xl"
      >
        {/* Header Bar */}
        <DialogHeader className="p-6 pb-4 border-b border-border/80 bg-muted/20 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="p-1.5 rounded-xl bg-primary/10 text-primary shrink-0">
                  <BookOpenIcon className="w-5 h-5" />
                </span>
                <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2 break-words">
                  {currentGuide.title}
                </DialogTitle>
                <Badge variant="secondary" className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider shrink-0">
                  {currentGuide.category}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground break-words">
                {currentGuide.subtitle}
              </DialogDescription>
            </div>

            {/* Feature Picker Dropdown & Close Button */}
            <div className="flex items-center gap-2 shrink-0">
              <select
                aria-label="Switch Feature Guide"
                value={selectedGuideId}
                onChange={(e) => {
                  setManualGuideId(e.target.value)
                  setManualExpandedTaskId(null)
                  setSearchQuery('')
                }}
                className="text-xs font-medium rounded-xl border border-border bg-background px-3 py-1.5 shadow-xs focus:ring-1 focus:ring-primary outline-hidden cursor-pointer max-w-[200px] truncate"
              >
                {FEATURE_GUIDES.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl border border-border bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Close Guide"
                aria-label="Close Guide"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search bar inside guide */}
          <div className="mt-3 relative">
            <MagnifyingGlassIcon className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search workflows, workarounds, or errors in ${currentGuide.title}...`}
              className="pl-9 h-9 text-xs bg-muted/40 border-border/60 rounded-xl w-full"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-2 mt-3 border-b border-border/60 pb-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('steps')}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0',
                activeTab === 'steps'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              )}
            >
              <CheckCircleIcon className="w-4 h-4" />
              Step-by-Step Workflows ({filteredTasks.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('workarounds')}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0',
                activeTab === 'workarounds'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              )}
            >
              <WrenchScrewdriverIcon className="w-4 h-4" />
              Troubleshooting & Workarounds ({filteredWorkarounds.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('limits')}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0',
                activeTab === 'limits'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              )}
            >
              <ShieldExclamationIcon className="w-4 h-4" />
              Capabilities & Limitations
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('protips')}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0',
                activeTab === 'protips'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              )}
            >
              <LightBulbIcon className="w-4 h-4" />
              Pro Tips & Shortcuts
            </button>
          </div>
        </DialogHeader>

        {/* Scrollable Content Body - with min-h-0 and break-words to prevent overflow */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: STEP BY STEP WORKFLOWS */}
          {activeTab === 'steps' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/15 text-xs text-foreground/90 flex items-start gap-2.5 break-words">
                <SparklesIcon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-foreground">Interactive Execution Mode: </span>
                  Follow each exact step below. Check off steps as you complete them inside the software.
                </div>
              </div>

              {filteredTasks.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  No step-by-step guides matched your search query. Try clearing your search term.
                </div>
              ) : (
                filteredTasks.map((task) => {
                  const isExpanded = expandedTaskId === task.id
                  return (
                    <div
                      key={task.id}
                      className="border border-border/80 rounded-2xl bg-card overflow-hidden shadow-xs transition-all"
                    >
                      <button
                        type="button"
                        onClick={() => setManualExpandedTaskId(isExpanded ? '' : task.id)}
                        className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/30 transition-colors gap-3"
                      >
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-foreground flex items-center gap-2 break-words">
                            <span>{task.title}</span>
                          </h4>
                          <p className="text-xs text-muted-foreground break-words">{task.description}</p>
                        </div>
                        <div className="p-1 rounded-lg bg-muted text-muted-foreground shrink-0">
                          {isExpanded ? (
                            <ChevronUpIcon className="w-4 h-4" />
                          ) : (
                            <ChevronDownIcon className="w-4 h-4" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="p-4 pt-0 border-t border-border/50 bg-muted/10 space-y-4">
                          <div className="space-y-3 pt-3">
                            {task.steps.map((step) => {
                              const isDone = completedSteps[`${task.id}-${step.stepNumber}`]
                              return (
                                <div
                                  key={step.stepNumber}
                                  onClick={() => toggleStepCompleted(task.id, step.stepNumber)}
                                  className={cn(
                                    'p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 text-xs',
                                    isDone
                                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
                                      : 'bg-card border-border/60 hover:border-primary/40'
                                  )}
                                >
                                  <div
                                    className={cn(
                                      'w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 transition-colors mt-0.5',
                                      isDone
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-primary/10 text-primary'
                                    )}
                                  >
                                    {isDone ? <CheckIcon className="w-3.5 h-3.5 stroke-[3]" /> : step.stepNumber}
                                  </div>

                                  <div className="flex-1 min-w-0 space-y-1">
                                    <p className={cn('font-semibold text-foreground break-words', isDone && 'line-through text-muted-foreground')}>
                                      {step.instruction}
                                    </p>
                                    {step.detail && (
                                      <p className="text-[11px] text-muted-foreground leading-relaxed break-words">
                                        💡 {step.detail}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>

                          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs break-words">
                            <span className="font-bold text-emerald-700 dark:text-emerald-300">Expected Outcome: </span>
                            <span className="text-foreground/80">{task.expectedResult}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* TAB 2: TROUBLESHOOTING & WORKAROUNDS */}
          {activeTab === 'workarounds' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5 break-words">
                <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="font-bold">Failure Workaround Protocol: </span>
                  If a method fails or encounters an unexpected system block, follow the proven fallback solutions below.
                </div>
              </div>

              {filteredWorkarounds.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  No troubleshooting workarounds matched your search query.
                </div>
              ) : (
                filteredWorkarounds.map((item) => (
                  <div
                    key={item.id}
                    className="border border-border/80 rounded-2xl bg-card p-4 sm:p-5 shadow-xs space-y-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-destructive/10 text-destructive text-[11px] font-bold shrink-0">
                          Issue
                        </span>
                        <h4 className="text-sm font-bold text-foreground break-words">{item.issue}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground break-words">
                        <strong className="text-foreground/80">Root Cause:</strong> {item.cause}
                      </p>
                    </div>

                    {/* Symptoms */}
                    <div className="flex flex-wrap gap-1.5">
                      {item.symptoms.map((sym, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium break-words"
                        >
                          ⚠️ {sym}
                        </span>
                      ))}
                    </div>

                    {/* Recommended Workaround */}
                    <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 break-words">
                        <CheckCircleIcon className="w-4 h-4 shrink-0" />
                        <span>Recommended Solution: {item.recommendedWorkaround.title}</span>
                      </div>
                      <ol className="list-decimal list-inside space-y-1 text-xs text-foreground/80 pl-1">
                        {item.recommendedWorkaround.steps.map((st, i) => (
                          <li key={i} className="leading-relaxed break-words">
                            {st}
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Alternative Fallback */}
                    {item.alternativeWorkaround && (
                      <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1.5">
                        <div className="text-xs font-bold text-foreground flex items-center gap-1.5 break-words">
                          <WrenchScrewdriverIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span>Alternative Fallback: {item.alternativeWorkaround.title}</span>
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-[11px] text-muted-foreground pl-1">
                          {item.alternativeWorkaround.steps.map((st, i) => (
                            <li key={i} className="break-words">{st}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: CAPABILITIES & SYSTEM LIMITATIONS */}
          {activeTab === 'limits' && (
            <div className="space-y-6">
              {/* Capabilities */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <SparklesIcon className="w-4 h-4 text-primary shrink-0" />
                  Core Module Capabilities & Technical Specifications
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentGuide.capabilities.map((cap, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-foreground break-words">{cap.title}</span>
                        {cap.specMetric && (
                          <Badge variant="outline" className="text-[10px] font-mono text-primary bg-primary/5 shrink-0">
                            {cap.specMetric}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed break-words">
                        {cap.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Limitations & Guardrails */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ShieldExclamationIcon className="w-4 h-4 text-amber-500 shrink-0" />
                  Software Boundaries, Rate Limits & Compliance Guardrails
                </h4>
                <div className="space-y-3">
                  {currentGuide.limitations.map((lim, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-2 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[11px] shrink-0">
                          Limitation
                        </span>
                        <span className="font-bold text-foreground break-words">{lim.title}</span>
                      </div>
                      <p className="text-muted-foreground text-[11px] leading-relaxed break-words">
                        {lim.description}
                      </p>
                      <div className="p-2.5 rounded-xl bg-muted/40 text-[11px] text-foreground/80 break-words">
                        <strong className="text-foreground">Remedy Recommendation:</strong> {lim.remedyRecommendation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PRO TIPS & SHORTCUTS */}
          {activeTab === 'protips' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {currentGuide.proTips.map((tip, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl bg-gradient-to-br from-primary/5 via-card to-background border border-primary/20 shadow-xs space-y-1.5"
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-primary break-words">
                      <LightBulbIcon className="w-4 h-4 shrink-0" />
                      <span>{tip.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed break-words">
                      {tip.content}
                    </p>
                  </div>
                ))}
              </div>

              {/* Quick Jump Links */}
              {currentGuide.quickLinks && currentGuide.quickLinks.length > 0 && (
                <div className="pt-4 border-t border-border/60 space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground">Related Modules & Navigation:</span>
                  <div className="flex flex-wrap gap-2">
                    {currentGuide.quickLinks.map((link, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigate(link.to)
                          onClose()
                        }}
                        className="text-xs h-8 rounded-xl"
                      >
                        <span>{link.label}</span>
                        <ArrowRightIcon className="w-3.5 h-3.5 ml-1.5" />
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Bar with Feedback */}
        <div className="p-4 px-6 border-t border-border/80 bg-muted/20 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground shrink-0">
          <div className="flex items-center gap-2">
            <span>Was this feature guide helpful?</span>
            <button
              type="button"
              onClick={() => handleFeedback(true)}
              className={cn(
                'p-1.5 rounded-lg border border-border hover:bg-primary/10 hover:text-primary transition-colors',
                feedbackGiven === true && 'bg-primary/10 text-primary border-primary/40'
              )}
              title="Yes, helpful"
            >
              <HandThumbUpIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleFeedback(false)}
              className={cn(
                'p-1.5 rounded-lg border border-border hover:bg-destructive/10 hover:text-destructive transition-colors',
                feedbackGiven === false && 'bg-destructive/10 text-destructive border-destructive/40'
              )}
              title="Needs improvement"
            >
              <HandThumbDownIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              Shortcut: press <kbd className="px-1.5 py-0.5 rounded-md bg-muted border border-border font-mono text-[10px]">?</kbd> to toggle
            </span>
            <Button size="sm" onClick={onClose} className="h-8 rounded-xl px-4">
              Close Guide
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
