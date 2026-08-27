import { FeatureStatusPlaceholder } from '@/components/shared/FeatureStatusPlaceholder'
import { FunnelIcon } from '@heroicons/react/24/outline'

export function SmartListsPage() {
  return (
    <FeatureStatusPlaceholder
      title="Smart Lists & Dynamic Contact Segmentation"
      description="Saved dynamic multi-condition filters, automated trigger actions, and instant segment-based export workflows."
      sprintNumber={10}
      icon={<FunnelIcon className="h-8 w-8 text-primary" />}
    />
  )
}
