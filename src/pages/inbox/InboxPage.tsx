import { FeatureStatusPlaceholder } from '@/components/shared/FeatureStatusPlaceholder'
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'

export function InboxPage() {
  return (
    <FeatureStatusPlaceholder
      title="Omnichannel Conversations & Live Inbox"
      description="Unified two-way SMS, WhatsApp messaging, Email syncing, dynamic AI quick templates, and real-time WebSocket communication."
      sprintNumber={12}
      icon={<ChatBubbleLeftRightIcon className="h-8 w-8 text-primary" />}
    />
  )
}
