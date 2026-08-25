import React, { useState } from 'react'
import type { QualificationCriteria } from '@/types/communication'
import { SparklesIcon } from '@heroicons/react/24/outline'
import { toast } from 'sonner'

interface QualificationConfigProps {
  criteria: QualificationCriteria[]
  onSaveCriteria: (newCriteria: QualificationCriteria[]) => void
}

export const QualificationConfig: React.FC<QualificationConfigProps> = ({
  criteria,
  onSaveCriteria,
}) => {
  const [list, setList] = useState<QualificationCriteria[]>(criteria)

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
            Configure the required checklist items the AI ISA must confirm before booking an agent showing or live warm transfer.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-md transition-all hover:scale-[1.02]"
        >
          Save Directives
        </button>
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

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <span>Mandatory Qualifying Field</span>
                  <input
                    type="checkbox"
                    checked={item.isRequired}
                    onChange={() => toggleRequired(item.id)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                </label>
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
            {item.options && (
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
    </div>
  )
}
