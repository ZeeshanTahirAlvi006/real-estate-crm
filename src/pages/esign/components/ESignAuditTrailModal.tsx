import {
  ShieldCheckIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ESignEnvelope } from '@/types/esign'

interface ESignAuditTrailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  envelope: ESignEnvelope | null
}

export function ESignAuditTrailModal({ open, onOpenChange, envelope }: ESignAuditTrailModalProps) {
  if (!envelope) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <ShieldCheckIcon className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Certificate of Electronic Execution & Audit Trail
              </DialogTitle>
              <DialogDescription className="text-xs">
                Tamper-evident legal certificate compliant with ESIGN & UETA statutory requirements.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Document Summary Card */}
          <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground text-sm">{envelope.title}</span>
              <Badge
                className={
                  envelope.status === 'completed'
                    ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                    : 'bg-primary/15 text-primary'
                }
              >
                {envelope.status.toUpperCase()}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground font-mono">
              <p>File: {envelope.fileName}</p>
              <p>Pages: {envelope.pageCount}</p>
              <p>Created: {new Date(envelope.createdAt).toLocaleString()}</p>
              {envelope.completedAt && (
                <p className="text-emerald-500 font-bold">
                  Completed: {new Date(envelope.completedAt).toLocaleString()}
                </p>
              )}
            </div>

            {envelope.certificateHash && (
              <div className="pt-2 border-t border-border/60">
                <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">
                  SHA-256 Integrity Seal:
                </span>
                <p className="font-mono text-[10px] text-primary break-all bg-background p-1.5 rounded border border-border mt-0.5">
                  {envelope.certificateHash}
                </p>
              </div>
            )}
          </div>

          {/* Signers Status Table */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-foreground">Signer Verification Ledger</p>
            <div className="divide-y divide-border/60 rounded-xl border border-border/80 bg-card overflow-hidden text-xs">
              {envelope.signers.map((s) => (
                <div key={s.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{s.name}</span>
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                        {s.role}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono">{s.email}</p>
                    {s.ipAddress && (
                      <p className="text-[10px] text-muted-foreground font-mono">IP: {s.ipAddress}</p>
                    )}
                  </div>

                  <div className="text-right">
                    {s.status === 'signed' ? (
                      <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px] gap-1 font-bold">
                        <CheckCircleIcon className="w-3.5 h-3.5" />
                        <span>Signed {s.signedAt ? new Date(s.signedAt).toLocaleDateString() : ''}</span>
                      </Badge>
                    ) : s.status === 'viewed' ? (
                      <Badge variant="outline" className="text-[10px] text-blue-500 border-blue-500/30 gap-1">
                        <ClockIcon className="w-3.5 h-3.5" />
                        <span>Viewed</span>
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">
                        Pending
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Trail Timeline */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-foreground">Chronological Audit Events</p>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {envelope.auditTrail.map((item) => (
                <div key={item.id} className="p-2.5 rounded-lg bg-muted/20 border border-border/60 flex items-start gap-2.5 text-xs">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground uppercase text-[10px]">
                        {item.action}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-[11px]">
                      {item.details || `Action recorded by ${item.performerName}`}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      By: {item.performerName} ({item.performerEmail}) {item.ipAddress ? `• IP: ${item.ipAddress}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
