import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import {
  useMergeDuplicateMutation,
  useDismissDuplicateMutation,
} from '@/store/api/dataHealthApi'
import { MergeContactModal } from './MergeContactModal'
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
      <Card className="rounded-2xl border border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#254238] shadow-xs">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-[#273338] dark:text-white">
              <MaterialIcon name="content_copy" size={20} className="text-[#2B5748] dark:text-[#9CB080]" />
              <span>Duplicate Review</span>
            </CardTitle>
            <CardDescription className="text-xs text-[#75887E] dark:text-[#A0B2A6] mt-0.5">
              Fuzzy-matched contacts with high similarity across identity fields
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className="font-mono text-xs px-2.5 py-0.5 border-[#D8E2D6] dark:border-[#618764]/40 bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#2B5748] dark:text-[#9CB080] font-bold"
          >
            {duplicates.length}
          </Badge>
        </CardHeader>

        <CardContent className="space-y-3">
          {duplicates.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#EDF2EB] dark:bg-[#1A2E26] text-emerald-600 dark:text-[#9CB080] flex items-center justify-center border border-[#D8E2D6] dark:border-[#618764]/40">
                <MaterialIcon name="verified" size={26} />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm text-[#273338] dark:text-white">No Duplicates Found</p>
                <p className="text-xs text-[#75887E] dark:text-[#A0B2A6] max-w-sm">
                  All active contacts have distinct emails, phone numbers, and unique identities.
                </p>
              </div>
              {onTriggerScan && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onTriggerScan}
                  disabled={isScanning}
                  className="h-8 text-xs font-semibold gap-1.5 border-[#D8E2D6] dark:border-[#618764]/40 text-[#273338] dark:text-white hover:bg-[#EDF2EB] dark:hover:bg-[#1A2E26] cursor-pointer"
                >
                  <MaterialIcon name="sync" size={15} className={isScanning ? 'animate-spin text-emerald-600' : 'text-emerald-600'} />
                  <span>Scan Again</span>
                </Button>
              )}
            </div>
          ) : (
            duplicates.map((dup) => (
              <div
                key={dup.id}
                className="rounded-2xl border border-[#D8E2D6] dark:border-[#618764]/40 bg-[#F5F7F4]/60 dark:bg-[#202B2F] p-4 space-y-3 hover:border-[#618764] transition-all shadow-2xs"
              >
                {/* Header Row */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                      {dup.matchScore}% Match ({dup.matchFields.join(', ')})
                    </span>
                    <span className="text-[11px] text-[#75887E] dark:text-[#A0B2A6]">
                      Detected {new Date(dup.createdAt || Date.now()).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs text-[#75887E] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white gap-1 cursor-pointer"
                      onClick={() => handleDismiss(dup.id)}
                      disabled={dismissing}
                    >
                      <MaterialIcon name="close" size={14} />
                      <span>Dismiss Pair</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1 font-semibold border-[#D8E2D6] dark:border-[#618764]/40 text-[#273338] dark:text-white hover:bg-[#EDF2EB] dark:hover:bg-[#1A2E26] cursor-pointer"
                      onClick={() => handleQuickMerge(dup)}
                      disabled={merging}
                    >
                      <MaterialIcon name="bolt" size={14} className="text-amber-600" />
                      <span>Quick Merge</span>
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 text-xs font-bold gap-1 shadow-xs bg-[#2B5748] hover:bg-[#24463a] text-white cursor-pointer"
                      onClick={() => handleOpenMergeModal(dup)}
                      disabled={merging}
                    >
                      <MaterialIcon name="call_merge" size={15} />
                      <span>Review Pair</span>
                    </Button>
                  </div>
                </div>

                {/* Side-by-side Contact Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Contact 1 */}
                  <div className="p-3 rounded-xl bg-white dark:bg-[#1E282D] border border-[#D8E2D6] dark:border-[#618764]/30 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#273338] dark:text-white text-sm">
                        {dup.contact1.firstName} {dup.contact1.lastName}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.2 rounded bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#2B5748] dark:text-[#9CB080] border border-[#D8E2D6] dark:border-[#618764]/30">
                        Record A
                      </span>
                    </div>

                    <div className="space-y-1 text-[#4A5D54] dark:text-[#A0B2A6]">
                      <p className="truncate">
                        <MaterialIcon name="mail" size={13} className="inline mr-1 text-[#75887E]" />
                        <strong className="text-[#273338] dark:text-white">{dup.contact1.email || '(No email)'}</strong>
                      </p>
                      <p className="font-mono">
                        <MaterialIcon name="call" size={13} className="inline mr-1 text-[#75887E]" />
                        <strong className="text-[#273338] dark:text-white">{dup.contact1.phone || '(No phone)'}</strong>
                      </p>
                      {dup.contact1.address && (
                        <p className="flex items-center gap-1 truncate">
                          <MaterialIcon name="home" size={13} className="shrink-0 text-[#75887E]" />
                          <span>{dup.contact1.address}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 pt-1 border-t border-[#D8E2D6] dark:border-[#618764]/20 text-[10px] text-[#75887E] dark:text-[#A0B2A6]">
                      <span className="flex items-center gap-1">
                        <MaterialIcon name="business_center" size={12} className="text-[#618764]" />
                        {(dup.contact1 as any).dealCount || 0} Deals
                      </span>
                      <span className="flex items-center gap-1">
                        <MaterialIcon name="schedule" size={12} className="text-emerald-600" />
                        {(dup.contact1 as any).activityCount || 0} Activities
                      </span>
                    </div>
                  </div>

                  {/* Contact 2 */}
                  <div className="p-3 rounded-xl bg-white dark:bg-[#1E282D] border border-[#D8E2D6] dark:border-[#618764]/30 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#273338] dark:text-white text-sm">
                        {dup.contact2.firstName} {dup.contact2.lastName}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.2 rounded bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#2B5748] dark:text-[#9CB080] border border-[#D8E2D6] dark:border-[#618764]/30">
                        Record B
                      </span>
                    </div>

                    <div className="space-y-1 text-[#4A5D54] dark:text-[#A0B2A6]">
                      <p className="truncate">
                        <MaterialIcon name="mail" size={13} className="inline mr-1 text-[#75887E]" />
                        <strong className="text-[#273338] dark:text-white">{dup.contact2.email || '(No email)'}</strong>
                      </p>
                      <p className="font-mono">
                        <MaterialIcon name="call" size={13} className="inline mr-1 text-[#75887E]" />
                        <strong className="text-[#273338] dark:text-white">{dup.contact2.phone || '(No phone)'}</strong>
                      </p>
                      {dup.contact2.address && (
                        <p className="flex items-center gap-1 truncate">
                          <MaterialIcon name="home" size={13} className="shrink-0 text-[#75887E]" />
                          <span>{dup.contact2.address}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 pt-1 border-t border-[#D8E2D6] dark:border-[#618764]/20 text-[10px] text-[#75887E] dark:text-[#A0B2A6]">
                      <span className="flex items-center gap-1">
                        <MaterialIcon name="business_center" size={12} className="text-[#618764]" />
                        {(dup.contact2 as any).dealCount || 0} Deals
                      </span>
                      <span className="flex items-center gap-1">
                        <MaterialIcon name="schedule" size={12} className="text-emerald-600" />
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
