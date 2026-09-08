import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { KpiCard } from '@/components/shared/KpiCard'
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
    'Stunning 3-bed home in quiet neighborhood! Perfect for couples. Close to downtown.'
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
      toast.error(err?.data?.message || 'Failed to check DNC status')
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
      toast.error(err?.data?.message || 'Failed to scan text')
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
      toast.success(`Phone ${optOutPhone} opted out`)
      setOptOutPhone('')
      refetch()
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to process opt-out')
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-[#2B5748] border border-[#D8E2D6] dark:border-[#618764] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#9CB080]/20 text-[#273338] dark:text-[#9CB080] flex items-center justify-center">
            <MaterialIcon name="verified_user" size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#273338] dark:text-white">TCPA Compliance</h2>
            <p className="text-xs text-[#75887E] dark:text-[#A0B2A6]">
              Federal registry guards
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {dashboard?.safeCallingWindowActive ? (
            <Badge className="bg-[#9CB080]/20 text-[#273338] dark:text-[#9CB080] border-[#9CB080]/40 gap-1.5 py-1 px-3">
              <span className="w-2 h-2 rounded-full bg-[#9CB080]" />
              <span>Safe Hours (8 AM – 9 PM)</span>
            </Badge>
          ) : (
            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1.5 py-1 px-3">
              <MaterialIcon name="schedule" size={14} />
              <span>Quiet Hours</span>
            </Badge>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="gap-1 text-xs border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white hover:bg-[#EDF2EB] dark:hover:bg-[#202B2F] cursor-pointer"
          >
            <MaterialIcon name="refresh" size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 gap-y-6 pt-3">
        <KpiCard
          title="Monitored Records"
          value={dashboard?.totalContacts?.toLocaleString() ?? '—'}
          icon="contact_page"
          subtitle="Active records"
        />

        <KpiCard
          title="Opt-In Rate"
          value={dashboard ? `${dashboard.optInRate}%` : '—'}
          icon="verified"
          subtitle={`${dashboard?.cleanCount ?? 0} verified clean`}
          trend={{ value: dashboard?.optInRate ?? 0, isPositive: true }}
        />

        <KpiCard
          title="Opt-Out Records"
          value={dashboard?.optedOutCount ?? 0}
          icon="do_not_disturb_on"
          subtitle="STOP requests"
        />

        <KpiCard
          title="DNC Flags"
          value={dashboard?.federalDncCount ?? 0}
          icon="phonelink_erase"
          subtitle="Outreach blocked"
        />
      </div>

      {/* Main 2-Column Working Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fair Housing Scanner */}
        <Card className="bg-white dark:bg-[#2B5748] border-[#D8E2D6] dark:border-[#618764] shadow-xs">
          <CardHeader className="pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/60">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-[#273338] dark:text-white flex items-center gap-2">
                <MaterialIcon name="verified_user" size={18} />
                <span>Fair Housing</span>
              </CardTitle>
              <Badge variant="outline" className="text-[10px] border-[#D8E2D6] dark:border-[#618764] text-[#4A5D54] dark:text-[#E2ECE4]">Protected Class</Badge>
            </div>
            <CardDescription className="text-xs text-[#75887E] dark:text-[#A0B2A6]">
              Test listing descriptions for bias
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            <div>
              <textarea
                value={adText}
                onChange={(e) => setAdText(e.target.value)}
                rows={4}
                className="w-full text-xs p-3 rounded-lg bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white focus:outline-hidden focus:border-[#9CB080] font-sans leading-relaxed"
                placeholder="Type or paste listing copy..."
              />
            </div>

            <div className="flex items-center justify-between">
              <Button
                size="sm"
                onClick={handleScanAd}
                disabled={isScanningText}
                className="text-xs font-bold gap-1.5 bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] cursor-pointer"
              >
                <MaterialIcon name="auto_awesome" size={16} />
                <span>{isScanningText ? 'Analyzing...' : 'Scan Copy'}</span>
              </Button>

              {scanReport && !scanReport.isCompliant && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleApplySanitizedText}
                  className="text-xs border-[#618764] text-[#2B5748] dark:text-[#9CB080] hover:bg-[#EDF2EB] dark:hover:bg-[#202B2F]"
                >
                  Apply Replacements
                </Button>
              )}
            </div>

            {/* Scan Report Results */}
            {scanReport && (
              <div className="p-3.5 rounded-xl border border-[#D8E2D6] dark:border-[#618764] bg-[#EDF2EB] dark:bg-[#202B2F] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#273338] dark:text-white">Scan Findings</span>
                  {scanReport.isCompliant ? (
                    <Badge className="bg-[#9CB080]/20 text-[#273338] dark:text-[#9CB080] border-[#9CB080]/40 gap-1 text-[11px]">
                      <MaterialIcon name="check_circle" size={14} />
                      <span>Compliant</span>
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500/15 text-red-600 border-red-500/30 gap-1 text-[11px]">
                      <MaterialIcon name="warning" size={14} />
                      <span>{scanReport.totalViolations} Violation(s)</span>
                    </Badge>
                  )}
                </div>

                {scanReport.violations.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {scanReport.violations.map((v, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-white dark:bg-[#273338] border border-[#D8E2D6] dark:border-[#618764] text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-red-600 font-mono">"{v.phrase}"</span>
                          <Badge variant="outline" className="text-[10px] uppercase font-mono border-[#D8E2D6] dark:border-[#618764]">{v.severity}</Badge>
                        </div>
                        <p className="text-[11px] text-[#75887E] dark:text-[#A0B2A6]">{v.reason}</p>
                        <p className="text-[11px] text-[#2B5748] dark:text-[#9CB080] font-medium">
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

        {/* DNC Lookup & Opt-out Column */}
        <div className="space-y-6">
          <Card className="bg-white dark:bg-[#2B5748] border-[#D8E2D6] dark:border-[#618764] shadow-xs">
            <CardHeader className="pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/60">
              <CardTitle className="text-sm font-bold text-[#273338] dark:text-white flex items-center gap-2">
                <MaterialIcon name="phone_disabled" size={18} />
                <span>DNC Registry</span>
              </CardTitle>
              <CardDescription className="text-xs text-[#75887E] dark:text-[#A0B2A6]">
                Check phone status
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              <form onSubmit={handleCheckDnc} className="flex gap-2">
                <Input
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="e.g. +1 (555) 234-9999"
                  className="text-xs font-mono h-9 bg-[#F5F7F4] dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={isCheckingDnc}
                  className="text-xs font-bold shrink-0 bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] cursor-pointer"
                >
                  {isCheckingDnc ? 'Verifying...' : 'Check Phone'}
                </Button>
              </form>

              {dncResult && (
                <div className="p-3.5 rounded-xl border border-[#D8E2D6] dark:border-[#618764] bg-[#EDF2EB] dark:bg-[#202B2F] space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#4A5D54] dark:text-[#E2ECE4]">Phone: {dncResult.phone}</span>
                    <Badge
                      className={
                        dncResult.isClean
                          ? 'bg-[#9CB080]/20 text-[#273338] dark:text-[#9CB080] border-[#9CB080]/40'
                          : 'bg-red-500/15 text-red-600 border-red-500/30'
                      }
                    >
                      {dncResult.dncStatus.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#D8E2D6] dark:border-[#618764]/40 text-[11px]">
                    <div className="flex items-center gap-1.5 text-[#273338] dark:text-white">
                      <MaterialIcon
                        name={dncResult.canCall ? 'check_circle' : 'cancel'}
                        size={16}
                        className={dncResult.canCall ? 'text-[#9CB080]' : 'text-red-500'}
                      />
                      <span>Calls: {dncResult.canCall ? 'Allowed' : 'Prohibited'}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[#273338] dark:text-white">
                      <MaterialIcon
                        name={dncResult.canText ? 'check_circle' : 'cancel'}
                        size={16}
                        className={dncResult.canText ? 'text-[#9CB080]' : 'text-red-500'}
                      />
                      <span>SMS: {dncResult.canText ? 'Allowed' : 'Prohibited'}</span>
                    </div>
                  </div>

                  {dncResult.reason && (
                    <p className="text-[11px] text-[#75887E] dark:text-[#A0B2A6] pt-1 border-t border-[#D8E2D6] dark:border-[#618764]/40">
                      <strong>Audit:</strong> {dncResult.reason}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Universal Opt-Out Tool */}
          <Card className="bg-white dark:bg-[#2B5748] border-[#D8E2D6] dark:border-[#618764] shadow-xs">
            <CardHeader className="pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/60">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-[#273338] dark:text-white">
                <MaterialIcon name="warning" size={18} className="text-amber-500" />
                <span>Universal Opt-Out</span>
              </CardTitle>
              <CardDescription className="text-xs text-[#75887E] dark:text-[#A0B2A6]">
                Block contact outreach
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4">
              <form onSubmit={handleManualOptOut} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    value={optOutPhone}
                    onChange={(e) => setOptOutPhone(e.target.value)}
                    placeholder="Phone number"
                    className="text-xs font-mono h-9 bg-[#F5F7F4] dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white"
                  />
                  <Input
                    value={optOutReason}
                    onChange={(e) => setOptOutReason(e.target.value)}
                    placeholder="Reason"
                    className="text-xs h-9 bg-[#F5F7F4] dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white"
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  variant="destructive"
                  disabled={isProcessingOptOut}
                  className="w-full text-xs font-semibold cursor-pointer"
                >
                  {isProcessingOptOut ? 'Processing...' : 'Execute Opt-Out'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
