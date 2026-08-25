import { toast } from 'sonner'
import {
  ShieldCheckIcon,
  DocumentDuplicateIcon,
  PhoneXMarkIcon,
  EnvelopeIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useGetDataHealthQuery,
  useGetDuplicatesQuery,
  useTriggerDeduplicationMutation,
  useTriggerPhoneVerificationMutation,
  useTriggerEmailValidationMutation,
} from '@/store/api/dataHealthApi'
import { HealthScoreGauge } from './components/HealthScoreGauge'
import { DuplicatesList } from './components/DuplicatesList'
import { DataQualityChart } from './components/DataQualityChart'

export function DataHealthPage() {
  const { data: health, isLoading } = useGetDataHealthQuery()
  const { data: duplicates } = useGetDuplicatesQuery()
  const [triggerDedup, { isLoading: scanningDedup }] = useTriggerDeduplicationMutation()
  const [triggerPhone, { isLoading: verifyingPhones }] = useTriggerPhoneVerificationMutation()
  const [triggerEmail, { isLoading: validatingEmails }] = useTriggerEmailValidationMutation()

  const handleScanDuplicates = async () => {
    try {
      const res = await triggerDedup().unwrap()
      toast.success(`Deduplication scan completed! Found ${res.found} potential duplicates.`)
    } catch {
      toast.error('Failed to run deduplication scan')
    }
  }

  const handleVerifyPhones = async () => {
    try {
      const res = await triggerPhone().unwrap()
      toast.success(`Carrier verification complete! Verified ${res.verified} numbers.`)
    } catch {
      toast.error('Failed to verify phone numbers')
    }
  }

  const handleValidateEmails = async () => {
    try {
      const res = await triggerEmail().unwrap()
      toast.success(`MX deliverability check complete! Cleaned ${res.validated} invalid addresses.`)
    } catch {
      toast.error('Failed to validate emails')
    }
  }

  if (isLoading || !health) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Self-Healing Data Engine"
        description="Continuous background deduplication, carrier validation, and database cleanliness score"
        actions={
          <Button onClick={handleScanDuplicates} disabled={scanningDedup}>
            <ArrowPathIcon className={`mr-2 h-4 w-4 ${scanningDedup ? 'animate-spin' : ''}`} />
            {scanningDedup ? 'Scanning DB...' : 'Run Full Auto-Clean'}
          </Button>
        }
      />

      {/* Hero row: Score Gauge + KPI Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Large Score Gauge */}
        <Card className="lg:col-span-1 flex flex-col items-center justify-center p-6 text-center">
          <HealthScoreGauge score={health.overallScore} grade={health.grade} />
          <p className="mt-3 text-xs text-muted-foreground">
            Last scan: {new Date(health.lastScanAt).toLocaleString()}
          </p>
        </Card>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2">
          <StatCard
            title="Duplicate Records"
            value={health.duplicatesFound}
            icon={<DocumentDuplicateIcon className="h-5 w-5" />}
            trend={{ value: 15, isPositive: true }}
          />
          <StatCard
            title="Unverified Phone Numbers"
            value={health.unverifiedPhones}
            icon={<PhoneXMarkIcon className="h-5 w-5" />}
          />
          <StatCard
            title="Invalid Emails"
            value={health.invalidEmails}
            icon={<EnvelopeIcon className="h-5 w-5" />}
          />
          <StatCard
            title="Missing Profile Data"
            value={health.missingFields}
            icon={<ShieldCheckIcon className="h-5 w-5" />}
          />
        </div>
      </div>

      {/* Action triggers row */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Autonomous Healing Routines</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border p-4 flex flex-col justify-between">
            <div>
              <h4 className="font-semibold text-sm">Fuzzy Match Deduplication</h4>
              <p className="mt-1 text-xs text-muted-foreground">
                Matches first/last names, inverted phone numbers, and alias email handles.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={handleScanDuplicates}
              disabled={scanningDedup}
            >
              {scanningDedup ? 'Scanning...' : 'Scan Duplicates'}
            </Button>
          </div>

          <div className="rounded-lg border border-border p-4 flex flex-col justify-between">
            <div>
              <h4 className="font-semibold text-sm">Twilio / Telesign Carrier Lookup</h4>
              <p className="mt-1 text-xs text-muted-foreground">
                Identifies Landlines vs Mobile vs VOIP to prevent SMS deliverability fines.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={handleVerifyPhones}
              disabled={verifyingPhones}
            >
              {verifyingPhones ? 'Verifying...' : 'Verify Phone Numbers'}
            </Button>
          </div>

          <div className="rounded-lg border border-border p-4 flex flex-col justify-between">
            <div>
              <h4 className="font-semibold text-sm">MX & SMTP Ping Validation</h4>
              <p className="mt-1 text-xs text-muted-foreground">
                Scans recipient domains for active MX routing records to maintain 99%+ deliverability.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={handleValidateEmails}
              disabled={validatingEmails}
            >
              {validatingEmails ? 'Validating...' : 'Validate Inboxes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Duplicate Candidates List + Quality Trend Chart */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DuplicatesList duplicates={duplicates || []} />
        <DataQualityChart trend={health.trend || []} />
      </div>
    </div>
  )
}
