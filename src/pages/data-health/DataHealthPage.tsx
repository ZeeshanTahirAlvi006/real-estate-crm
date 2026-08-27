import { useState } from 'react'
import {
  useGetDataHealthQuery,
  useGetDuplicatesQuery,
  useTriggerDeduplicationMutation,
  useTriggerEmailValidationMutation,
  useTriggerPhoneVerificationMutation,
  useTriggerFullScanMutation,
} from '@/store/api/dataHealthApi'
import { HealthScoreGauge } from './components/HealthScoreGauge'
import { DuplicatesList } from './components/DuplicatesList'
import { DataQualityChart } from './components/DataQualityChart'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ShieldCheckIcon,
  SparklesIcon,
  EnvelopeIcon,
  PhoneIcon,
  DocumentDuplicateIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import { toast } from 'sonner'

export function DataHealthPage() {
  const { data: healthScore, isLoading: loadingHealth } = useGetDataHealthQuery()
  const { data: duplicates = [], isLoading: loadingDuplicates } = useGetDuplicatesQuery()

  const [triggerDeduplication, { isLoading: scanningDuplicates }] = useTriggerDeduplicationMutation()
  const [triggerEmailValidation, { isLoading: scanningEmails }] = useTriggerEmailValidationMutation()
  const [triggerPhoneVerification, { isLoading: scanningPhones }] = useTriggerPhoneVerificationMutation()
  const [triggerFullScan, { isLoading: scanningAll }] = useTriggerFullScanMutation()

  const [lastScanMessage, setLastScanMessage] = useState<string | null>(null)

  const handleFullScan = async () => {
    try {
      await triggerFullScan().unwrap()
      toast.success('Comprehensive database health scan completed!')
      setLastScanMessage('All contacts scanned across duplicate identities, MX deliverability, and phone formatting.')
    } catch {
      toast.error('Failed to complete full scan')
    }
  }

  const handleDuplicateScan = async () => {
    try {
      const res = await triggerDeduplication().unwrap()
      toast.success(res.message)
      setLastScanMessage(res.message)
    } catch {
      toast.error('Failed to run duplicate scan')
    }
  }

  const handleEmailScan = async () => {
    try {
      const res = await triggerEmailValidation().unwrap()
      toast.success(res.message)
      setLastScanMessage(res.message)
    } catch {
      toast.error('Failed to run email verification')
    }
  }

  const handlePhoneScan = async () => {
    try {
      const res = await triggerPhoneVerification().unwrap()
      toast.success(res.message)
      setLastScanMessage(res.message)
    } catch {
      toast.error('Failed to run phone verification')
    }
  }

  if (loadingHealth || loadingDuplicates) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 md:col-span-2 rounded-2xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    )
  }

  const score = healthScore?.overallScore ?? 100
  const grade = healthScore?.grade ?? 'A'

  return (
    <div className="space-y-6">
      {/* Top Header & On-Demand Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-card border border-border/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <ShieldCheckIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Data Health & Deduplication Scanner</h1>
              <p className="text-xs text-muted-foreground">
                Jaro-Winkler fuzzy contact deduplication, DNS MX deliverability checks, and phone validation.
              </p>
            </div>
          </div>
        </div>

        {/* Scan Triggers */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={handleDuplicateScan}
            disabled={scanningDuplicates || scanningAll}
            className="h-9 text-xs font-semibold gap-1.5 shadow-xs"
          >
            {scanningDuplicates ? (
              <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <DocumentDuplicateIcon className="w-3.5 h-3.5 text-amber-500" />
            )}
            <span>Scan Duplicates</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleEmailScan}
            disabled={scanningEmails || scanningAll}
            className="h-9 text-xs font-semibold gap-1.5 shadow-xs"
          >
            {scanningEmails ? (
              <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <EnvelopeIcon className="w-3.5 h-3.5 text-blue-500" />
            )}
            <span>Validate Emails</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handlePhoneScan}
            disabled={scanningPhones || scanningAll}
            className="h-9 text-xs font-semibold gap-1.5 shadow-xs"
          >
            {scanningPhones ? (
              <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <PhoneIcon className="w-3.5 h-3.5 text-emerald-500" />
            )}
            <span>Check Phones</span>
          </Button>

          <Button
            size="sm"
            onClick={handleFullScan}
            disabled={scanningAll}
            className="h-9 text-xs font-bold gap-1.5 shadow-md bg-primary hover:bg-primary/90"
          >
            {scanningAll ? (
              <>
                <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                Scanning Database...
              </>
            ) : (
              <>
                <SparklesIcon className="w-4 h-4" />
                Run Full Scan
              </>
            )}
          </Button>
        </div>
      </div>

      {lastScanMessage && (
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs flex items-center gap-2 animate-in fade-in">
          <InformationCircleIcon className="w-4 h-4 shrink-0" />
          <span>{lastScanMessage}</span>
        </div>
      )}

      {/* Main Score & Metrics Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Radial Health Score Gauge */}
        <Card className="border-border/80 shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <span>Database Cleanliness Score</span>
              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                Real-Time Health
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Algorithmic quality rating across duplicates, emails, phones, and completeness.
            </CardDescription>
          </CardHeader>
          <CardContent className="py-4">
            <HealthScoreGauge score={score} grade={grade} />
          </CardContent>
          <div className="p-3 border-t border-border/70 bg-muted/20 text-center rounded-b-2xl">
            <span className="text-[11px] text-muted-foreground font-semibold">
              {score >= 90
                ? '🌟 Excellent health — your contact data is pristine!'
                : score >= 75
                ? '⚡ Good health — a few duplicate candidates to resolve.'
                : '⚠️ Action recommended — review duplicate and invalid contact records.'}
            </span>
          </div>
        </Card>

        {/* 4 Health Dimension Metric Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Duplicates */}
          <Card className="border-border/80 shadow-xs">
            <CardContent className="p-4 flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Duplicate Candidates
                </span>
                <span className="text-2xl font-black text-foreground font-mono">
                  {healthScore?.duplicatesFound ?? duplicates.length}
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Contacts with matching phone, email, or &gt;85% name similarity.
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                <DocumentDuplicateIcon className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* Invalid Emails */}
          <Card className="border-border/80 shadow-xs">
            <CardContent className="p-4 flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Invalid / Undeliverable Emails
                </span>
                <span className="text-2xl font-black text-foreground font-mono">
                  {healthScore?.invalidEmails ?? 0}
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Emails with invalid format or unresolvable DNS MX records.
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 shrink-0">
                <EnvelopeIcon className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* Unverified Phones */}
          <Card className="border-border/80 shadow-xs">
            <CardContent className="p-4 flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Unformatted Phone Numbers
                </span>
                <span className="text-2xl font-black text-foreground font-mono">
                  {healthScore?.unverifiedPhones ?? 0}
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Phone numbers not conforming to 10-digit / E.164 standards.
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
                <PhoneIcon className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* Incomplete Profiles */}
          <Card className="border-border/80 shadow-xs">
            <CardContent className="p-4 flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Incomplete Profiles
                </span>
                <span className="text-2xl font-black text-foreground font-mono">
                  {healthScore?.missingFields ?? 0}
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Contacts missing address, tag classifications, or lead details.
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500 shrink-0">
                <ExclamationTriangleIcon className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Historical Quality Trendline */}
      {healthScore?.trend && healthScore.trend.length > 0 && (
        <DataQualityChart trend={healthScore.trend} />
      )}

      {/* Duplicate Candidates List & Interactive Merging */}
      <DuplicatesList
        duplicates={duplicates}
        onTriggerScan={handleDuplicateScan}
        isScanning={scanningDuplicates || scanningAll}
      />
    </div>
  )
}
