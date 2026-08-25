import React from 'react'
import { fairHousingProhibitedPhrases } from '@/constants/fairHousing'
import { ExclamationTriangleIcon, SparklesIcon } from '@heroicons/react/24/outline'

interface FairHousingWarningProps {
  text: string
  onApplyAlternative?: (original: string, replacement: string) => void
}

export const checkFairHousingCompliance = (text: string) => {
  const lower = text.toLowerCase()
  const matches = fairHousingProhibitedPhrases.filter((item) =>
    lower.includes(item.phrase.toLowerCase())
  )
  return matches
}

export const FairHousingWarning: React.FC<FairHousingWarningProps> = ({
  text,
  onApplyAlternative,
}) => {
  const matches = checkFairHousingCompliance(text)

  if (matches.length === 0) {
    return null
  }

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 space-y-2 animate-in fade-in duration-200">
      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-xs">
        <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
        <span>Fair Housing & TCPA Compliance Alert</span>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Your message contains terms that may violate Fair Housing demographic steering guidelines:
      </p>

      <div className="space-y-1.5 pt-1">
        {matches.map((item, idx) => (
          <div
            key={idx}
            className="flex flex-wrap items-center justify-between gap-2 bg-background/80 p-2 rounded-lg border border-amber-500/20 text-xs"
          >
            <div>
              <span className="font-mono text-destructive line-through mr-2">"{item.phrase}"</span>
              <span className="text-muted-foreground text-[11px]">({item.reason})</span>
            </div>

            {onApplyAlternative && (
              <button
                type="button"
                onClick={() => onApplyAlternative(item.phrase, item.replacement)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-medium transition-colors"
              >
                <SparklesIcon className="w-3 h-3" />
                <span>Replace with: "{item.replacement}"</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
