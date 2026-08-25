import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  CalculatorIcon,
  BuildingOffice2Icon,
  UserIcon,
} from '@heroicons/react/24/outline'

interface CommissionCalculatorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultPrice?: number
}

export const CommissionCalculatorModal: React.FC<CommissionCalculatorModalProps> = ({
  open,
  onOpenChange,
  defaultPrice = 650000,
}) => {
  const [salePrice, setSalePrice] = useState(defaultPrice)
  const [commissionPercent, setCommissionPercent] = useState(3.0)
  const [agentSplitPercent, setAgentSplitPercent] = useState(80)
  const [franchiseFeePercent, setFranchiseFeePercent] = useState(6.0)
  const [tcFee, setTcFee] = useState(395)
  const [isCapped, setIsCapped] = useState(false)

  // Calculations
  const grossCommission = (salePrice * (commissionPercent / 100))
  const franchiseDeduction = grossCommission * (franchiseFeePercent / 100)
  const adjustedGCI = grossCommission - franchiseDeduction

  const effectiveAgentSplit = isCapped ? 100 : agentSplitPercent
  const agentGrossPayout = adjustedGCI * (effectiveAgentSplit / 100)
  const agentNetPayout = Math.max(0, agentGrossPayout - tcFee)
  const brokerageNetProfit = Math.max(0, adjustedGCI - agentGrossPayout + (franchiseDeduction * 0.5))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <CalculatorIcon className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Brokerage Commission & Split Calculator
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Tiered agent splits, franchise royalties, and net accounting payouts
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Inputs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs font-semibold">Deal Sale Price ($)</Label>
              <Input
                type="number"
                value={salePrice}
                onChange={(e) => setSalePrice(Number(e.target.value) || 0)}
                className="h-9 text-xs font-mono font-bold"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Commission %</Label>
              <Input
                type="number"
                step="0.1"
                value={commissionPercent}
                onChange={(e) => setCommissionPercent(Number(e.target.value) || 0)}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Agent Split %</Label>
              <Input
                type="number"
                disabled={isCapped}
                value={effectiveAgentSplit}
                onChange={(e) => setAgentSplitPercent(Number(e.target.value) || 0)}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Franchise Royalty %</Label>
              <Input
                type="number"
                step="0.5"
                value={franchiseFeePercent}
                onChange={(e) => setFranchiseFeePercent(Number(e.target.value) || 0)}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">TC Coordinator ($)</Label>
              <Input
                type="number"
                value={tcFee}
                onChange={(e) => setTcFee(Number(e.target.value) || 0)}
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          {/* Quick Split Presets & Capped Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/60 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground font-semibold">Presets:</span>
              {[70, 80, 85, 90].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => {
                    setAgentSplitPercent(pct)
                    setIsCapped(false)
                  }}
                  className="px-2 py-0.5 rounded-md bg-background border border-border/70 hover:bg-muted text-[11px] font-medium transition-colors"
                >
                  {pct}/{100 - pct}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <span>Agent Annual Cap Met (100%)</span>
              <input
                type="checkbox"
                checked={isCapped}
                onChange={(e) => setIsCapped(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
            </label>
          </div>

          {/* Computed Results Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-gradient-to-br from-primary/10 via-chart-3/5 to-chart-2/10 border border-primary/20 shadow-sm">
            {/* Left: Agent Take-Home */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-primary font-bold">
                <UserIcon className="w-4 h-4" />
                <span>Agent Net Commission</span>
              </div>
              <p className="text-2xl font-black text-foreground font-mono">
                ${agentNetPayout.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <div className="text-[11px] text-muted-foreground space-y-0.5 pt-1">
                <p>Gross GCI: ${grossCommission.toLocaleString()}</p>
                <p>TC Fee Deduction: -${tcFee}</p>
              </div>
            </div>

            {/* Right: Brokerage Net Revenue */}
            <div className="space-y-1 sm:border-l sm:border-border/60 sm:pl-4">
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                <BuildingOffice2Icon className="w-4 h-4" />
                <span>Brokerage Net Retained</span>
              </div>
              <p className="text-2xl font-black text-emerald-500 font-mono">
                ${brokerageNetProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <div className="text-[11px] text-muted-foreground space-y-0.5 pt-1">
                <p>Franchise Royalty: ${franchiseDeduction.toLocaleString()}</p>
                <p>Margin: {((brokerageNetProfit / grossCommission) * 100).toFixed(1)}%</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end pt-2">
            <Button size="sm" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
