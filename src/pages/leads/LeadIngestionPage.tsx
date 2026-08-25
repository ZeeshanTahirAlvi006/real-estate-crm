import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { LeadSourcesTab } from './components/LeadSourcesTab'
import { RoutingRulesTab } from './components/RoutingRulesTab'
import { WebhooksTab } from './components/WebhooksTab'
import { WebhookTesterModal } from './components/WebhookTesterModal'
import { RoutingRuleModal } from './components/RoutingRuleModal'
import { CommandLineIcon, PlusIcon } from '@heroicons/react/24/outline'

export function LeadIngestionPage() {
  const [isTesterOpen, setIsTesterOpen] = useState(false)
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Lead Ingestion & Routing Engine"
        description="Configure Zillow, Meta Ads, and webhook endpoints with sub-60s SLA escalation routing"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTesterOpen(true)}
              className="h-9 font-semibold"
            >
              <CommandLineIcon className="mr-1.5 h-4 w-4 text-primary" />
              Test Webhook Payload
            </Button>
            <Button
              size="sm"
              onClick={() => setIsRuleModalOpen(true)}
              className="h-9 shadow-xs font-semibold"
            >
              <PlusIcon className="mr-1.5 h-4 w-4" />
              New Routing Rule
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="sources">
        <TabsList className="bg-muted/40 p-1 rounded-2xl border border-border/60">
          <TabsTrigger value="sources" className="rounded-xl text-xs font-semibold">
            Lead Sources
          </TabsTrigger>
          <TabsTrigger value="routing" className="rounded-xl text-xs font-semibold">
            Routing Rules
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="rounded-xl text-xs font-semibold">
            Webhooks & Endpoints
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sources" className="mt-4">
          <LeadSourcesTab />
        </TabsContent>
        <TabsContent value="routing" className="mt-4">
          <RoutingRulesTab />
        </TabsContent>
        <TabsContent value="webhooks" className="mt-4">
          <WebhooksTab />
        </TabsContent>
      </Tabs>

      <WebhookTesterModal open={isTesterOpen} onOpenChange={setIsTesterOpen} />
      <RoutingRuleModal open={isRuleModalOpen} onOpenChange={setIsRuleModalOpen} />
    </div>
  )
}
