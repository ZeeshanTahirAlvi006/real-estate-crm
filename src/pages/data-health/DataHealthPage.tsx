import { useState, useRef, useEffect } from 'react'
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
import { InvalidRecordsList } from './components/InvalidRecordsList'
import { KpiCard } from '@/components/shared/KpiCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { useCountUp } from '@/hooks/useCountUp'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// Reusable Parallax Scroll-Reveal Section Wrapper
function ParallaxRevealSection({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={sectionRef}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        'transition-all duration-500 ease-out transform will-change-transform',
        isVisible
          ? 'translate-y-0 opacity-100 scale-100'
          : 'translate-y-6 opacity-0 scale-[0.99]',
        className
      )}
    >
      {children}
    </div>
  )
}

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
      toast.success('Database health scan completed!')
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

  const score = healthScore?.overallScore ?? 100
  const grade = healthScore?.grade ?? 'A'

  // Animated KPI numbers
  const duplicatesCount = healthScore?.duplicatesFound ?? duplicates.length
  const invalidEmailsCount = healthScore?.invalidEmails ?? 0
  const unverifiedPhonesCount = healthScore?.unverifiedPhones ?? 0
  const missingFieldsCount = healthScore?.missingFields ?? 0

  const animatedDuplicates = useCountUp({ end: duplicatesCount, duration: 1000 })
  const animatedEmails = useCountUp({ end: invalidEmailsCount, duration: 1000 })
  const animatedPhones = useCountUp({ end: unverifiedPhonesCount, duration: 1000 })
  const animatedIncomplete = useCountUp({ end: missingFieldsCount, duration: 1000 })

  if (loadingHealth || loadingDuplicates) {
    return (
      <div className="-m-4 sm:-m-6 min-h-[calc(100vh-4rem)] p-4 sm:p-6 pb-20 md:pb-8 bg-[#F5F7F4] dark:bg-[#1E282D] space-y-6 transition-colors duration-200 font-sans">
        <Skeleton className="h-28 w-full rounded-2xl bg-[#EDF2EB] dark:bg-[#1A2E26]" />
        <div className="grid grid-cols-1 gap-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-4 pt-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl bg-[#EDF2EB] dark:bg-[#1A2E26]" />
          ))}
        </div>
        <Skeleton className="h-72 w-full rounded-2xl bg-[#EDF2EB] dark:bg-[#1A2E26]" />
        <Skeleton className="h-96 w-full rounded-2xl bg-[#EDF2EB] dark:bg-[#1A2E26]" />
      </div>
    )
  }

  return (
    <div className="-m-4 sm:-m-6 min-h-[calc(100vh-4rem)] p-4 sm:p-6 pb-20 md:pb-8 bg-[#F5F7F4] dark:bg-[#1E282D] space-y-6 transition-colors duration-200 font-sans">
      {/* 1. Header Section */}
      <ParallaxRevealSection delay={0} className="space-y-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#273338] dark:text-white">
            Data Health
          </h1>
          <p className="text-xs text-[#4A5D54] dark:text-[#A0B2A6]">
            Database cleanliness & deduplication
          </p>
        </div>
      </ParallaxRevealSection>

      {/* 2. Database Cleanliness Score Card with Action Buttons Inside */}
      <ParallaxRevealSection delay={60}>
        <div className="rounded-2xl border border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#254238] shadow-md shadow-black/5 p-5 sm:p-6 transition-all">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Left: Score Gauge & Description */}
            <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6 w-full md:w-auto">
              <HealthScoreGauge score={score} grade={grade} />

              <div className="text-center sm:text-left space-y-1.5 max-w-sm">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-lg font-bold text-[#273338] dark:text-white">
                    Cleanliness Score
                  </h2>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded border border-[#D8E2D6] dark:border-[#618764]/40 bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#2B5748] dark:text-[#9CB080] font-bold">
                    Grade {grade}
                  </span>
                </div>
                <p className="text-xs text-[#4A5D54] dark:text-[#A0B2A6] leading-relaxed">
                  Algorithmic quality rating across duplicate contacts, MX deliverability, and E.164 phone integrity.
                </p>
                <div className="pt-1">
                  <span className="text-xs font-semibold text-emerald-600 dark:text-[#9CB080]">
                    {score >= 90
                      ? 'Pristine health — contact records verified.'
                      : score >= 75
                      ? 'Good health — minor duplicate candidates detected.'
                      : 'Action recommended — review duplicate and invalid contact records.'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Scan Buttons inside card on Desktop & Tablet; Bottom 2x2 grid on Mobile */}
            <div className="w-full md:w-auto grid grid-cols-2 gap-2.5 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-[#D8E2D6] dark:border-[#618764]/30 md:pl-6">
              {/* Button 1: Scan Duplicates */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDuplicateScan}
                disabled={scanningDuplicates || scanningAll}
                className="h-10 text-xs font-semibold gap-1.5 border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#202B2F] hover:bg-[#EDF2EB] dark:hover:bg-[#1A2E26] text-[#273338] dark:text-white cursor-pointer shadow-xs"
              >
                <MaterialIcon
                  name={scanningDuplicates ? 'sync' : 'content_copy'}
                  size={16}
                  className={scanningDuplicates ? 'animate-spin text-amber-600' : 'text-amber-600'}
                />
                <span>Scan Duplicates</span>
              </Button>

              {/* Button 2: Validate Emails */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleEmailScan}
                disabled={scanningEmails || scanningAll}
                className="h-10 text-xs font-semibold gap-1.5 border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#202B2F] hover:bg-[#EDF2EB] dark:hover:bg-[#1A2E26] text-[#273338] dark:text-white cursor-pointer shadow-xs"
              >
                <MaterialIcon
                  name={scanningEmails ? 'sync' : 'mark_email_read'}
                  size={16}
                  className={scanningEmails ? 'animate-spin text-blue-600' : 'text-blue-600'}
                />
                <span>Validate Emails</span>
              </Button>

              {/* Button 3: Check Phones */}
              <Button
                variant="outline"
                size="sm"
                onClick={handlePhoneScan}
                disabled={scanningPhones || scanningAll}
                className="h-10 text-xs font-semibold gap-1.5 border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#202B2F] hover:bg-[#EDF2EB] dark:hover:bg-[#1A2E26] text-[#273338] dark:text-white cursor-pointer shadow-xs"
              >
                <MaterialIcon
                  name={scanningPhones ? 'sync' : 'phone_in_talk'}
                  size={16}
                  className={scanningPhones ? 'animate-spin text-emerald-600' : 'text-emerald-600'}
                />
                <span>Check Phones</span>
              </Button>

              {/* Button 4: Run Full Scan */}
              <Button
                size="sm"
                onClick={handleFullScan}
                disabled={scanningAll}
                className="h-10 text-xs font-bold gap-1.5 shadow-sm bg-[#2B5748] hover:bg-[#24463a] text-white cursor-pointer"
              >
                <MaterialIcon
                  name={scanningAll ? 'sync' : 'auto_awesome'}
                  size={16}
                  className={scanningAll ? 'animate-spin text-white' : 'text-white'}
                />
                <span>{scanningAll ? 'Scanning...' : 'Run Full Scan'}</span>
              </Button>
            </div>
          </div>
        </div>
      </ParallaxRevealSection>

      {/* Optional Last Scan Feedback Notice */}
      {lastScanMessage && (
        <div className="p-3 rounded-xl bg-[#EDF2EB] dark:bg-[#1A2E26] border border-[#D8E2D6] dark:border-[#618764]/40 text-xs text-[#2B5748] dark:text-[#9CB080] flex items-center gap-2 animate-in fade-in">
          <MaterialIcon name="info" size={16} className="text-[#618764] shrink-0" />
          <span className="font-medium">{lastScanMessage}</span>
        </div>
      )}

      {/* 3. Global KPI Cards from Dashboard Layout */}
      <ParallaxRevealSection delay={120}>
        <div className="grid grid-cols-1 gap-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-4 pt-3">
          {/* Card 1: Duplicate Candidates */}
          <KpiCard
            title="Duplicate Candidates"
            value={animatedDuplicates}
            icon="content_copy"
            subtitle="Fuzzy identity matches"
          />

          {/* Card 2: Invalid Emails */}
          <KpiCard
            title="Invalid Emails"
            value={animatedEmails}
            icon="mark_email_unread"
            subtitle="Failed MX deliverability"
          />

          {/* Card 3: Unformatted Phones */}
          <KpiCard
            title="Unformatted Phones"
            value={animatedPhones}
            icon="phone_disabled"
            subtitle="Non E.164 formats"
          />

          {/* Card 4: Incomplete Records */}
          <KpiCard
            title="Incomplete Records"
            value={animatedIncomplete}
            icon="contact_page"
            subtitle="Missing profile fields"
          />
        </div>
      </ParallaxRevealSection>

      {/* 4. Historical Quality Trendline */}
      {healthScore?.trend && healthScore.trend.length > 0 && (
        <ParallaxRevealSection delay={160}>
          <DataQualityChart trend={healthScore.trend} />
        </ParallaxRevealSection>
      )}

      {/* 5. Invalid Emails & Unformatted Phones List */}
      <ParallaxRevealSection delay={200}>
        <InvalidRecordsList />
      </ParallaxRevealSection>

      {/* 6. Duplicate Candidates List & Interactive Merging */}
      <ParallaxRevealSection delay={240}>
        <DuplicatesList
          duplicates={duplicates}
          onTriggerScan={handleDuplicateScan}
          isScanning={scanningDuplicates || scanningAll}
        />
      </ParallaxRevealSection>
    </div>
  )
}
