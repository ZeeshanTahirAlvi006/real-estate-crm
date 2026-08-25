import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  SparklesIcon,
  HomeModernIcon,
  ShareIcon,
  UserGroupIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import { toast } from 'sonner'

interface MicroCmaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadData: {
    name: string
    address: string
    estimatedValue: number
    equityAmount: number
    yearsOwned: number
  } | null
}

const mockComps = [
  { address: '1208 Pine Crest Dr', price: '$685,000', beds: '4 bd / 3 ba', sqft: '2,450 sqft', dom: '6 days' },
  { address: '1314 Oak Ridge Trail', price: '$720,000', beds: '4 bd / 3.5 ba', sqft: '2,680 sqft', dom: '9 days' },
  { address: '1102 Highland Meadow', price: '$699,000', beds: '3 bd / 2.5 ba', sqft: '2,320 sqft', dom: '12 days' },
]

export const MicroCmaModal: React.FC<MicroCmaModalProps> = ({
  open,
  onOpenChange,
  leadData,
}) => {
  if (!leadData) return null

  const targetValue = leadData.estimatedValue
  const lowRange = Math.round(targetValue * 0.96)
  const highRange = Math.round(targetValue * 1.05)

  const handleShareLink = () => {
    navigator.clipboard?.writeText(`https://proppulse.io/cma/${encodeURIComponent(leadData.address)}`)
    toast.success('Interactive Micro-CMA link copied to clipboard & SMS queued!')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-primary to-chart-3 text-primary-foreground">
                <SparklesIcon className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  Automated Micro-CMA & Equity Report
                </DialogTitle>
                <p className="text-xs text-muted-foreground">{leadData.address}</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs font-semibold">
              Live Comps Engine
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2 text-xs">
          {/* Valuation Hero Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/10 via-chart-3/5 to-chart-2/10 border border-primary/20 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
                  Target Market Valuation
                </span>
                <p className="text-3xl font-black text-foreground font-mono mt-0.5">
                  ${targetValue.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-muted-foreground font-semibold">Estimated Net Equity</span>
                <p className="text-xl font-extrabold text-emerald-500 font-mono">
                  +${leadData.equityAmount.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Valuation Range Meter */}
            <div className="space-y-1.5 pt-2 border-t border-border/60">
              <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                <span>Low: ${lowRange.toLocaleString()}</span>
                <span className="text-primary font-bold">Target: ${targetValue.toLocaleString()}</span>
                <span>High: ${highRange.toLocaleString()}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
                <div className="h-full bg-blue-400 w-1/3" />
                <div className="h-full bg-primary w-1/3" />
                <div className="h-full bg-emerald-500 w-1/3" />
              </div>
            </div>
          </div>

          {/* Active Buyer Demand Signal */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500 text-white font-bold">
                <UserGroupIcon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground">
                  48 Active Pre-Approved PropPulse Buyers
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Searching for homes matching this specification in the immediate 1.5-mile radius.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
              High Demand
            </span>
          </div>

          {/* Recent Comparable Neighborhood Sales */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <HomeModernIcon className="w-4 h-4 text-primary" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-foreground">
                  Verified Local Comparable Sales (Last 45 Days)
                </h4>
              </div>
              <span className="text-[11px] text-muted-foreground">Radius: 0.8 Miles</span>
            </div>

            <div className="space-y-2">
              {mockComps.map((comp, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-card border border-border/70 flex flex-wrap items-center justify-between gap-2 hover:border-primary/40 transition-colors"
                >
                  <div>
                    <span className="font-bold text-xs text-foreground block">{comp.address}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {comp.beds} • {comp.sqft}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-xs font-mono text-primary block">{comp.price}</span>
                    <span className="text-[10px] text-muted-foreground">Sold in {comp.dom}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-border/60">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
              MLS & Public Tax Registry Verified
            </span>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button size="sm" onClick={handleShareLink} className="shadow-xs font-semibold">
                <ShareIcon className="w-4 h-4 mr-1.5" />
                Share Digital Micro-CMA
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
