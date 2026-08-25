import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useMergeDuplicateMutation, useDismissDuplicateMutation } from '@/store/api/dataHealthApi'
import type { DuplicatePair } from '@/types'

interface DuplicatesListProps {
  duplicates: DuplicatePair[]
}

export function DuplicatesList({ duplicates }: DuplicatesListProps) {
  const [merge, { isLoading: merging }] = useMergeDuplicateMutation()
  const [dismiss, { isLoading: dismissing }] = useDismissDuplicateMutation()

  const handleMerge = async (id: string) => {
    try {
      await merge(id).unwrap()
      toast.success('Records merged successfully! Activity logs combined.')
    } catch {
      toast.error('Failed to merge records')
    }
  }

  const handleDismiss = async (id: string) => {
    try {
      await dismiss(id).unwrap()
      toast.info('Duplicate pair dismissed.')
    } catch {
      toast.error('Failed to dismiss pair')
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">Detected Duplicate Candidates</CardTitle>
        <Badge variant="secondary">{duplicates.length} to review</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {duplicates.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            ✨ No pending duplicates detected. Your database is clean!
          </div>
        ) : (
          duplicates.map(dup => (
            <div key={dup.id} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-amber-500/10 text-amber-500 text-[10px]">
                  {dup.matchScore}% Match ({dup.matchFields.join(', ')})
                </Badge>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => handleDismiss(dup.id)}
                    disabled={dismissing}
                  >
                    Dismiss
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleMerge(dup.id)}
                    disabled={merging}
                  >
                    Merge
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 p-2 rounded">
                <div>
                  <p className="font-semibold">{dup.contact1.firstName} {dup.contact1.lastName}</p>
                  <p className="text-muted-foreground">{dup.contact1.email}</p>
                  <p className="text-muted-foreground">{dup.contact1.phone}</p>
                </div>
                <div>
                  <p className="font-semibold">{dup.contact2.firstName} {dup.contact2.lastName}</p>
                  <p className="text-muted-foreground">{dup.contact2.email}</p>
                  <p className="text-muted-foreground">{dup.contact2.phone}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
