import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  useMergeDuplicateMutation,
  useDismissDuplicateMutation,
} from '@/store/api/dataHealthApi'
import { MergeContactModal } from './MergeContactModal'
import {
  ArrowsRightLeftIcon,
  XMarkIcon,
  SparklesIcon,
  BuildingOfficeIcon,
  ClockIcon,
  BriefcaseIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline'
import type { DuplicatePair } from '@/types'

interface DuplicatesListProps {
  duplicates: DuplicatePair[]
  onTriggerScan?: () => void
  isScanning?: boolean
}

export function DuplicatesList({ duplicates, onTriggerScan, isScanning = false }: DuplicatesListProps) {
  const [merge, { isLoading: merging }] = useMergeDuplicateMutation()
  const [dismiss, { isLoading: dismissing }] = useDismissDuplicateMutation()

  const [selectedPair, setSelectedPair] = useState<DuplicatePair | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const handleOpenMergeModal = (pair: DuplicatePair) => {
    setSelectedPair(pair)
    setModalOpen(true)
  }

  const handleQuickMerge = async (pair: DuplicatePair) => {
    try {
      await merge({
        id: pair.id,
        primaryContactId: pair.contact1.id,
        secondaryContactId: pair.contact2.id,
      }).unwrap()
      toast.success(`Merged ${pair.contact2.firstName} into ${pair.contact1.firstName} ${pair.contact1.lastName}`)
    } catch {
      toast.error('Failed to merge contacts')
    }
  }

  const handleDismiss = async (id: string) => {
    try {
      await dismiss(id).unwrap()
      toast.info('Duplicate candidate pair dismissed.')
    } catch {
      toast.error('Failed to dismiss pair')
    }
  }

  const handleModalConfirmMerge = async (payload: {
    id: string
    primaryContactId: string
    secondaryContactId: string
    fieldOverrides?: Record<string, any>
  }) => {
    try {
      await merge(payload).unwrap()
      toast.success('Contacts merged successfully! Assets and timeline activities combined.')
    } catch {
      toast.error('Failed to merge contacts')
    }
  }

  return (
    <>
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ArrowsRightLeftIcon className="w-5 h-5 text-primary" />
              <span>Duplicate Candidates for Review</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Fuzzy-matched contacts with high similarity across phone, email, or name.
            </CardDescription>
          </div>
          <Badge variant="secondary" className="font-mono text-xs">
            {duplicates.length} {duplicates.length === 1 ? 'Pair' : 'Pairs'} Detected
          </Badge>
        </CardHeader>

        <CardContent className="space-y-3">
          {duplicates.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-500">
                <CheckBadgeIcon className="w-8 h-8" />
              </div>
              <div>
                <p className="font-bold text-sm text-foreground">Database Clean — No Duplicates Found</p>
                <p className="text-xs text-muted-foreground max-w-sm mt-0.5">
                  All active contacts have distinct emails, phone numbers, and unique identities.
                </p>
              </div>
              {onTriggerScan && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onTriggerScan}
                  disabled={isScanning}
                  className="h-8 text-xs gap-1.5"
                >
                  <SparklesIcon className="w-3.5 h-3.5" />
                  Run New Fuzzy Scan
                </Button>
              )}
            </div>
          ) : (
            duplicates.map((dup) => (
              <div
                key={dup.id}
                className="rounded-2xl border border-border/80 bg-card p-4 space-y-3 hover:border-primary/40 transition-all shadow-2xs"
              >
                {/* Header Row */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-xs font-bold font-mono"
                    >
                      {dup.matchScore}% Match ({dup.matchFields.join(', ')})
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      Detected {new Date(dup.createdAt || Date.now()).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1"
                      onClick={() => handleDismiss(dup.id)}
                      disabled={dismissing}
                    >
                      <XMarkIcon className="w-3.5 h-3.5" />
                      Dismiss
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1 font-semibold"
                      onClick={() => handleQuickMerge(dup)}
                      disabled={merging}
                    >
                      1-Click Auto-Merge
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 text-xs font-bold gap-1 shadow-xs bg-primary hover:bg-primary/90"
                      onClick={() => handleOpenMergeModal(dup)}
                      disabled={merging}
                    >
                      <ArrowsRightLeftIcon className="w-3.5 h-3.5" />
                      Compare & Merge
                    </Button>
                  </div>
                </div>

                {/* Side-by-side Contact Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Contact 1 */}
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground text-sm">
                        {dup.contact1.firstName} {dup.contact1.lastName}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        Record A (Older)
                      </Badge>
                    </div>

                    <div className="space-y-1 text-muted-foreground">
                      <p className="truncate">
                        📧 <strong className="text-foreground">{dup.contact1.email || '(No email)'}</strong>
                      </p>
                      <p className="font-mono">
                        📱 <strong className="text-foreground">{dup.contact1.phone || '(No phone)'}</strong>
                      </p>
                      {dup.contact1.address && (
                        <p className="flex items-center gap-1 truncate">
                          <BuildingOfficeIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>{dup.contact1.address}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 pt-1 border-t border-border/40 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <BriefcaseIcon className="w-3 h-3 text-primary" />
                        {(dup.contact1 as any).dealCount || 0} Deals
                      </span>
                      <span className="flex items-center gap-1">
                        <ClockIcon className="w-3 h-3 text-emerald-500" />
                        {(dup.contact1 as any).activityCount || 0} Activities
                      </span>
                    </div>
                  </div>

                  {/* Contact 2 */}
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground text-sm">
                        {dup.contact2.firstName} {dup.contact2.lastName}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        Record B (Newer)
                      </Badge>
                    </div>

                    <div className="space-y-1 text-muted-foreground">
                      <p className="truncate">
                        📧 <strong className="text-foreground">{dup.contact2.email || '(No email)'}</strong>
                      </p>
                      <p className="font-mono">
                        📱 <strong className="text-foreground">{dup.contact2.phone || '(No phone)'}</strong>
                      </p>
                      {dup.contact2.address && (
                        <p className="flex items-center gap-1 truncate">
                          <BuildingOfficeIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>{dup.contact2.address}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 pt-1 border-t border-border/40 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <BriefcaseIcon className="w-3 h-3 text-primary" />
                        {(dup.contact2 as any).dealCount || 0} Deals
                      </span>
                      <span className="flex items-center gap-1">
                        <ClockIcon className="w-3 h-3 text-emerald-500" />
                        {(dup.contact2 as any).activityCount || 0} Activities
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Side-by-side Interactive Merge Modal */}
      <MergeContactModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        duplicatePair={selectedPair}
        onConfirmMerge={handleModalConfirmMerge}
        isLoading={merging}
      />
    </>
  )
}
