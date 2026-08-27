import { useLocation, useNavigate } from 'react-router-dom'
import { useGetFeatureFlagsQuery, useToggleFeatureFlagMutation } from '@/store/api/featureFlagsApi'
import { useAppSelector } from '@/store/hooks'
import { UserRole } from '@/types/auth'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  BoltIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { toast } from 'sonner'

export const ROUTE_FEATURE_MAP: Record<string, { key: string; name: string; description: string }> = {
  '/pipeline': {
    key: 'deals_pipeline',
    name: 'Deals & Visual Pipeline',
    description: 'Multi-pipeline Kanban deal board, probability revenue forecasting, and transaction milestones.',
  },
  '/lead-ingestion': {
    key: 'lead_ingestion',
    name: 'Lead Ingestion & Routing Engines',
    description: 'Third-party portal webhooks, universal parsers, and intelligent lead distribution algorithms.',
  },
  '/dialer': {
    key: 'dialer',
    name: 'Parallel Dialer & Telephony',
    description: 'Multi-line WebRTC telephony dialer, call queues, and automated voicemail drops.',
  },
  '/ai-isa': {
    key: 'ai_isa',
    name: 'Autonomous AI ISA Engine',
    description: 'Autonomous conversational AI nurturing, lead reactivation campaigns, and speed-to-lead responder.',
  },
  '/data-health': {
    key: 'data_health',
    name: 'Data Health & Deduplication Scanner',
    description: 'Fuzzy contact deduplication, MX record verification, and database health scoring.',
  },
  '/inbox': {
    key: 'ai_chatbot',
    name: 'AI Chatbot & Communications Copilot',
    description: 'Omnichannel inbox, AI suggested responses, and unified conversation hub.',
  },
}

export function FeatureMaintenanceOverlay() {
  const location = useLocation()
  const navigate = useNavigate()
  const currentUser = useAppSelector((state) => state.auth.user)

  // Poll feature flags every 8 seconds for real-time synchronization across admin tabs
  const { data: flags, isLoading } = useGetFeatureFlagsQuery(undefined, {
    pollingInterval: 8000,
    refetchOnFocus: true,
  })

  const [toggleFlag, { isLoading: isToggling }] = useToggleFeatureFlagMutation()

  // Match current pathname with feature mapping
  const currentPath = location.pathname
  const mappedFeature = ROUTE_FEATURE_MAP[currentPath]

  if (!mappedFeature || isLoading || !flags) {
    return null
  }

  const currentFlag = flags.find((f) => f.key === mappedFeature.key)

  // If flag is enabled, don't show the overlay
  if (!currentFlag || currentFlag.isEnabled) {
    return null
  }

  const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN

  const handleReactivate = async () => {
    try {
      await toggleFlag({
        key: currentFlag.key,
        isEnabled: true,
      }).unwrap()
      toast.success(`Subsystem [${currentFlag.name}] reactivated successfully!`)
    } catch {
      toast.error('Failed to reactivate feature flag')
    }
  }

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 sm:p-6 bg-background/75 dark:bg-background/85 backdrop-blur-md backdrop-saturate-150 animate-in fade-in duration-300 pointer-events-auto">
      {/* Background Decorative Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 dark:bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Maintenance Dialog Card */}
      <Card className="w-full max-w-xl border-amber-500/30 bg-card/90 dark:bg-card/95 shadow-2xl backdrop-blur-2xl relative overflow-hidden text-center">
        {/* Top Warning Accent Line */}
        <div className="h-1.5 w-full bg-linear-to-r from-amber-500 via-orange-500 to-amber-600" />

        <CardContent className="p-6 sm:p-8 space-y-5">
          {/* Animated Icon with Pulsing Beacon */}
          <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-2xl bg-amber-500/20 dark:bg-amber-500/30 animate-ping opacity-75" />
            <div className="relative w-16 h-16 rounded-2xl bg-linear-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-lg">
              <WrenchScrewdriverIcon className="w-8 h-8 animate-pulse" />
            </div>
          </div>

          {/* Heading and Subtitle */}
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Badge
                variant="outline"
                className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 text-[11px] font-bold px-2.5 py-0.5 uppercase tracking-wider"
              >
                <ExclamationTriangleIcon className="w-3.5 h-3.5 mr-1 inline" />
                Scheduled Maintenance
              </Badge>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {currentFlag.name || mappedFeature.name} is Offline
            </h2>

            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              This subsystem has been temporarily paused by system administrators for scheduled maintenance.
            </p>
          </div>

          {/* Reason Box */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 text-left space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-amber-800 dark:text-amber-300">
              <span className="flex items-center gap-1.5">
                <BoltIcon className="w-3.5 h-3.5 text-amber-500" />
                Maintenance Notice
              </span>
            </div>
            <p className="text-xs text-amber-900/90 dark:text-amber-200/90 font-medium">
              {currentFlag.disabledReason || 'Undergoing scheduled system maintenance. Endpoints and workers are safely offline.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="w-full sm:w-auto text-xs font-semibold gap-1.5 h-9"
            >
              <ArrowLeftIcon className="w-3.5 h-3.5" />
              Return to Dashboard
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/contacts')}
              className="w-full sm:w-auto text-xs font-semibold h-9"
            >
              Go to Contacts
            </Button>

            {/* Super Admin Instant Reactivation Button */}
            {isSuperAdmin && (
              <Button
                size="sm"
                disabled={isToggling}
                onClick={handleReactivate}
                className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold gap-1.5 h-9 shadow-md"
              >
                {isToggling ? (
                  <>
                    <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                    Reactivating...
                  </>
                ) : (
                  <>
                    <BoltIcon className="w-3.5 h-3.5" />
                    Re-Enable Feature
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
