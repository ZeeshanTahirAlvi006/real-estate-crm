import { FeatureStatusPlaceholder } from '@/components/shared/FeatureStatusPlaceholder'
import { SparklesIcon } from '@heroicons/react/24/outline'

export function AiIsaPage() {
  return (
    <FeatureStatusPlaceholder
      title="Autonomous AI ISA Outreach Engine"
      description="24/7 AI-driven lead qualification, multi-channel reactivation campaigns, Fair Housing boundary checks, and human agent handoffs."
      sprintNumber={8}
      icon={<SparklesIcon className="h-8 w-8 text-primary" />}
    />
  )
}
