import { useState } from 'react'
import {
  useGetLeadSourcesQuery,
  useGetRoutingRulesQuery,
  useGetScoringConfigQuery,
} from '@/store/api/leadsApi'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  SignalIcon,
  GlobeAltIcon,
  ArrowsRightLeftIcon,
  FireIcon,
  CommandLineIcon,
  UserPlusIcon,
  CheckCircleIcon,
  BoltIcon,
} from '@heroicons/react/24/outline'

import { LeadSourcesTab } from './components/LeadSourcesTab'
import { RoutingRulesTab } from './components/RoutingRulesTab'
import { ScoringConfigTab } from './components/ScoringConfigTab'
import { LeadCaptureWidgetTab } from './components/LeadCaptureWidgetTab'
import { WebhookTesterModal } from './components/WebhookTesterModal'
import { ManualLeadModal } from './components/ManualLeadModal'

export function LeadIngestionPage() {
  const [activeTab, setActiveTab] = useState('sources')
  const [isTesterOpen, setIsTesterOpen] = useState(false)
  const [isManualModalOpen, setIsManualModalOpen] = useState(false)

  const { data: sourcesData } = useGetLeadSourcesQuery()
  const { data: rulesData } = useGetRoutingRulesQuery()
  const { data: scoringData } = useGetScoringConfigQuery()

  const sources = sourcesData?.leadSources || []
  const rules = rulesData?.routingRules || []
  const activeSourcesCount = sources.filter((s) => s.isActive).length
  const totalLeadsCount = sources.reduce((sum, s) => sum + (s.leadCount || 0), 0)
  const activeRulesCount = rules.filter((r) => r.isActive).length

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Action Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <SignalIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  Lead Ingestion & Routing Engines
                </h1>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px] font-bold">
                  Sprint 4
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Universal third-party portal webhooks, automated intent-based scoring, and intelligent lead distribution.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTesterOpen(true)}
            className="gap-1.5 font-semibold text-xs h-9 shadow-xs"
          >
            <CommandLineIcon className="w-4 h-4 text-purple-500" />
            Webhook Simulator
          </Button>

          <Button
            size="sm"
            onClick={() => setIsManualModalOpen(true)}
            className="gap-1.5 font-semibold text-xs h-9 shadow-xs"
          >
            <UserPlusIcon className="w-4 h-4" />
            Manual Lead Intake
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="bg-card/70 border-border/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Total Ingested Leads
              </p>
              <p className="text-2xl font-black text-foreground mt-0.5">
                {totalLeadsCount.toLocaleString()}
              </p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                <CheckCircleIcon className="w-3 h-3" /> Real-time pipeline
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <BoltIcon className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 border-border/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Active Lead Portals
              </p>
              <p className="text-2xl font-black text-foreground mt-0.5">
                {activeSourcesCount} <span className="text-xs text-muted-foreground font-normal">/ {sources.length}</span>
              </p>
              <p className="text-[10px] text-muted-foreground font-semibold mt-1">
                HMAC SHA-256 Protected
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <SignalIcon className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 border-border/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Routing Rules
              </p>
              <p className="text-2xl font-black text-foreground mt-0.5">
                {activeRulesCount} <span className="text-xs text-muted-foreground font-normal">Active</span>
              </p>
              <p className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold mt-1">
                Priority-stacked engine
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <ArrowsRightLeftIcon className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 border-border/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Intent Scoring Model
              </p>
              <p className="text-2xl font-black text-foreground mt-0.5">
                {scoringData?.baseScore ?? 50} <span className="text-xs text-muted-foreground font-normal">Base</span>
              </p>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-1">
                {scoringData?.keywordWeights?.length || 9} Intent triggers active
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <FireIcon className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 h-11 p-1 bg-muted/40 rounded-xl border border-border/60">
          <TabsTrigger
            value="sources"
            className="text-xs font-semibold gap-1.5 data-[state=active]:shadow-xs"
          >
            <SignalIcon className="w-4 h-4" />
            <span>Lead Sources & Webhooks</span>
          </TabsTrigger>

          <TabsTrigger
            value="routing"
            className="text-xs font-semibold gap-1.5 data-[state=active]:shadow-xs"
          >
            <ArrowsRightLeftIcon className="w-4 h-4" />
            <span>Intelligent Routing Rules</span>
          </TabsTrigger>

          <TabsTrigger
            value="scoring"
            className="text-xs font-semibold gap-1.5 data-[state=active]:shadow-xs"
          >
            <FireIcon className="w-4 h-4" />
            <span>Intent Scoring Engine</span>
          </TabsTrigger>

          <TabsTrigger
            value="widget"
            className="text-xs font-semibold gap-1.5 data-[state=active]:shadow-xs"
          >
            <GlobeAltIcon className="w-4 h-4" />
            <span>Public Capture Widget</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Lead Sources & Webhooks */}
        <TabsContent value="sources" className="space-y-4 outline-none">
          <LeadSourcesTab />
        </TabsContent>

        {/* Tab 2: Intelligent Routing Rules */}
        <TabsContent value="routing" className="space-y-4 outline-none">
          <RoutingRulesTab />
        </TabsContent>

        {/* Tab 3: Intent Scoring Rules */}
        <TabsContent value="scoring" className="space-y-4 outline-none">
          <ScoringConfigTab />
        </TabsContent>

        {/* Tab 4: Public Capture Widget Generator */}
        <TabsContent value="widget" className="space-y-4 outline-none">
          <LeadCaptureWidgetTab />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <WebhookTesterModal
        open={isTesterOpen}
        onOpenChange={setIsTesterOpen}
      />

      <ManualLeadModal
        open={isManualModalOpen}
        onOpenChange={setIsManualModalOpen}
      />
    </div>
  )
}
