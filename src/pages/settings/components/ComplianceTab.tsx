import { useState } from 'react'
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  PhoneXMarkIcon,
  ClockIcon,
  SparklesIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  useGetComplianceDashboardQuery,
  useCheckDncMutation,
  useScanFairHousingMutation,
  useProcessOptOutMutation,
  type DncCheckResult,
  type FairHousingScanReport,
} from '@/store/api/complianceApi'

export function ComplianceTab() {
  const { data: dashboard, isLoading, refetch } = useGetComplianceDashboardQuery()

  // DNC Phone Lookup state
  const [testPhone, setTestPhone] = useState('')
  const [checkDnc, { isLoading: isCheckingDnc }] = useCheckDncMutation()
  const [dncResult, setDncResult] = useState<DncCheckResult | null>(null)

  // Fair Housing Scanner state
  const [adText, setAdText] = useState(
    'Stunning 3-bed home in quiet Christian neighborhood! Perfect for singles or mature couples with no kids. Close to local church.'
  )
  const [scanFairHousing, { isLoading: isScanningText }] = useScanFairHousingMutation()
  const [scanReport, setScanReport] = useState<FairHousingScanReport | null>(null)

  // Opt-out tool state
  const [optOutPhone, setOptOutPhone] = useState('')
  const [optOutReason, setOptOutReason] = useState('Requested STOP via phone')
  const [processOptOut, { isLoading: isProcessingOptOut }] = useProcessOptOutMutation()

  const handleCheckDnc = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testPhone.trim()) {
      toast.error('Please enter a phone number to check')
      return
    }
    try {
      const res = await checkDnc({ phone: testPhone }).unwrap()
      setDncResult(res)
      if (res.isClean) {
        toast.success('Phone verified clean for outreach!')
      } else {
        toast.warning(`Outreach restricted: ${res.reason}`)
      }
    } catch (err: any) {
      toast.error(err.data?.message || 'Failed to check DNC status')
    }
  }

  const handleScanAd = async () => {
    if (!adText.trim()) {
      toast.error('Please enter listing text to scan')
      return
    }
    try {
      const res = await scanFairHousing({ text: adText }).unwrap()
      setScanReport(res)
      if (res.isCompliant) {
        toast.success('No Fair Housing violations detected!')
      } else {
        toast.warning(`Found ${res.totalViolations} potential Fair Housing violations`)
      }
    } catch (err: any) {
      toast.error(err.data?.message || 'Failed to scan text')
    }
  }

  const handleApplySanitizedText = () => {
    if (scanReport?.cleanedText) {
      setAdText(scanReport.cleanedText)
      setScanReport(null)
      toast.success('Applied compliant replacement text!')
    }
  }

  const handleManualOptOut = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!optOutPhone.trim()) {
      toast.error('Please enter phone number for opt-out')
      return
    }
    try {
      await processOptOut({ phone: optOutPhone, channel: 'all', reason: optOutReason }).unwrap()
      toast.success(`Phone ${optOutPhone} has been permanently opted out across all channels`)
      setOptOutPhone('')
      refetch()
    } catch (err: any) {
      toast.error(err.data?.message || 'Failed to process opt-out')
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border/70 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <ShieldCheckIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Compliance & TCPA Shield Center</h2>
            <p className="text-xs text-muted-foreground">
              Federal DNC registry lookup, 8 AM–9 PM TCPA time-window enforcement, and Fair Housing NLP guards.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {dashboard?.safeCallingWindowActive ? (
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1.5 py-1 px-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>TCPA Safe Hours Active (8 AM – 9 PM)</span>
            </Badge>
          ) : (
            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1.5 py-1 px-3">
              <ClockIcon className="w-3.5 h-3.5" />
              <span>TCPA Quiet Hours (Outreach Blocked)</span>
            </Badge>
          )}

          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading} className="gap-1 text-xs">
            <ArrowPathIcon className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/70 shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Monitored Contacts</p>
            <h3 className="text-2xl font-bold text-foreground mt-1">
              {dashboard?.totalContacts?.toLocaleString() ?? '—'}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Active database records</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Consent Opt-In Rate</p>
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {dashboard ? `${dashboard.optInRate}%` : '—'}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">{dashboard?.cleanCount ?? 0} verified clean</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Opted-Out Contacts</p>
            <h3 className="text-2xl font-bold text-foreground mt-1">
              {dashboard?.optedOutCount ?? 0}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">STOP keywords & manual</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Federal DNC Flags</p>
            <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {dashboard?.federalDncCount ?? 0}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Automated outreach blocked</p>
          </CardContent>
        </Card>
      </div>

      {/* Main 2-Column Working Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fair Housing NLP Scanner */}
        <Card className="border-border/70 shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <SparklesIcon className="w-4 h-4 text-primary" />
                <span>Fair Housing Ad Copy Scanner</span>
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">Title VIII Protected</Badge>
            </div>
            <CardDescription className="text-xs">
              Test listing descriptions and outbound scripts for familial status, religion, race, and disability bias.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div>
              <textarea
                value={adText}
                onChange={(e) => setAdText(e.target.value)}
                rows={4}
                className="w-full text-xs p-3 rounded-lg bg-muted/40 border border-border/80 focus:outline-hidden focus:ring-1 focus:ring-primary font-sans leading-relaxed"
                placeholder="Type or paste listing copy, MLS remarks, or agent message..."
              />
            </div>

            <div className="flex items-center justify-between">
              <Button
                size="sm"
                onClick={handleScanAd}
                disabled={isScanningText}
                className="text-xs font-semibold gap-1.5"
              >
                <SparklesIcon className="w-3.5 h-3.5" />
                <span>{isScanningText ? 'Analyzing...' : 'Scan Copy with NLP'}</span>
              </Button>

              {scanReport && !scanReport.isCompliant && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleApplySanitizedText}
                  className="text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                >
                  Apply Suggested Replacements
                </Button>
              )}
            </div>

            {/* Scan Report Results */}
            {scanReport && (
              <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Scan Findings</span>
                  {scanReport.isCompliant ? (
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[11px]">
                      <CheckCircleIcon className="w-3.5 h-3.5" />
                      <span>Compliant</span>
                    </Badge>
                  ) : (
                    <Badge className="bg-destructive/15 text-destructive border-destructive/30 gap-1 text-[11px]">
                      <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                      <span>{scanReport.totalViolations} Violation(s) Found</span>
                    </Badge>
                  )}
                </div>

                {scanReport.violations.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {scanReport.violations.map((v, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-card border border-border/60 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-destructive font-mono">"{v.phrase}"</span>
                          <Badge variant="outline" className="text-[10px] uppercase font-mono">{v.severity} severity</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{v.reason}</p>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          Suggested alternative: <span className="underline">"{v.replacement}"</span>
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Real-time TCPA & DNC Registry Lookup */}
        <div className="space-y-6">
          <Card className="border-border/70 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <PhoneXMarkIcon className="w-4 h-4 text-primary" />
                <span>Live TCPA & DNC Registry Lookup</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Check whether a phone number is clean for auto-dialing and SMS campaigns.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <form onSubmit={handleCheckDnc} className="flex gap-2">
                <Input
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="e.g. +1 (555) 234-9999"
                  className="text-xs font-mono h-9"
                />
                <Button type="submit" size="sm" disabled={isCheckingDnc} className="text-xs font-semibold shrink-0">
                  {isCheckingDnc ? 'Verifying...' : 'Check Phone'}
                </Button>
              </form>

              {dncResult && (
                <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-muted-foreground">Phone: {dncResult.phone}</span>
                    <Badge
                      className={
                        dncResult.isClean
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : 'bg-destructive/15 text-destructive border-destructive/30'
                      }
                    >
                      {dncResult.dncStatus.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      {dncResult.canCall ? (
                        <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <XCircleIcon className="w-4 h-4 text-destructive" />
                      )}
                      <span>Voice Calls: {dncResult.canCall ? 'Allowed' : 'Prohibited'}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {dncResult.canText ? (
                        <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <XCircleIcon className="w-4 h-4 text-destructive" />
                      )}
                      <span>SMS / WhatsApp: {dncResult.canText ? 'Allowed' : 'Prohibited'}</span>
                    </div>
                  </div>

                  {dncResult.reason && (
                    <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                      <strong>Audit Note:</strong> {dncResult.reason}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instant Universal Opt-Out Tool */}
          <Card className="border-border/70 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-destructive">
                <ExclamationTriangleIcon className="w-4 h-4" />
                <span>Immediate Universal Opt-Out (STOP)</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Immediately block all outbound communications for a contact and mark their record as opted out.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleManualOptOut} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    value={optOutPhone}
                    onChange={(e) => setOptOutPhone(e.target.value)}
                    placeholder="Phone number to opt out"
                    className="text-xs font-mono h-9"
                  />
                  <Input
                    value={optOutReason}
                    onChange={(e) => setOptOutReason(e.target.value)}
                    placeholder="Reason (e.g. Verbal request)"
                    className="text-xs h-9"
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  variant="destructive"
                  disabled={isProcessingOptOut}
                  className="w-full text-xs font-semibold"
                >
                  {isProcessingOptOut ? 'Processing...' : 'Execute Universal Opt-Out'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
