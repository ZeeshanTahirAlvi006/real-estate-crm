import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { useCreateCommissionMutation } from '@/store/api/commissionsApi'
import { useAppSelector } from '@/store/hooks'
import { toast } from 'sonner'

interface CommissionCalculatorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultPrice?: number
  dealId?: string
  transactionId?: string
}

export const CommissionCalculatorModal: React.FC<CommissionCalculatorModalProps> = ({
  open,
  onOpenChange,
  defaultPrice = 650000,
  dealId,
  transactionId,
}) => {
  const user = useAppSelector((state) => state.auth.user)
  const [createCommission, { isLoading: isSaving }] = useCreateCommissionMutation()

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
  const brokerageNetProfit = Math.max(0, adjustedGCI - agentGrossPayout)

  const handleSaveToLedger = async () => {
    if (!user?.id) return
    try {
      await createCommission({
        agentId: user.id,
        dealId,
        transactionId,
        salePrice,
        commissionRate: commissionPercent,
        splitModel: isCapped ? 'capped' : 'fixed',
        splitPercentAgent: agentSplitPercent,
        franchiseFeePercent,
        tcFee,
        status: 'approved',
      }).unwrap()
      toast.success('Commission settlement saved to ledger!')
      onOpenChange(false)
    } catch {
      toast.error('Failed to save settlement entry')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl bg-white dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#9CB080]/15 text-[#2B5748] dark:text-[#9CB080]">
              <MaterialIcon name="calculate" size={20} />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-[#273338] dark:text-white">
                Brokerage Commission & Split Calculator
              </DialogTitle>
              <p className="text-xs text-[#75887E] dark:text-[#A0B2A6]">
                Tiered agent splits, franchise royalties, and net accounting payouts
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Inputs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs font-semibold text-[#273338] dark:text-white">Deal Sale Price ($)</Label>
              <Input
                type="number"
                value={salePrice}
                onChange={(e) => setSalePrice(Number(e.target.value) || 0)}
                className="h-9 text-xs font-mono font-bold border-[#D8E2D6] dark:border-[#618764]"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#273338] dark:text-white">Commission %</Label>
              <Input
                type="number"
                step="0.1"
                value={commissionPercent}
                onChange={(e) => setCommissionPercent(Number(e.target.value) || 0)}
                className="h-9 text-xs font-mono border-[#D8E2D6] dark:border-[#618764]"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#273338] dark:text-white">Agent Split %</Label>
              <Input
                type="number"
                disabled={isCapped}
                value={effectiveAgentSplit}
                onChange={(e) => setAgentSplitPercent(Number(e.target.value) || 0)}
                className="h-9 text-xs font-mono border-[#D8E2D6] dark:border-[#618764]"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#273338] dark:text-white">Franchise Royalty %</Label>
              <Input
                type="number"
                step="0.5"
                value={franchiseFeePercent}
                onChange={(e) => setFranchiseFeePercent(Number(e.target.value) || 0)}
                className="h-9 text-xs font-mono border-[#D8E2D6] dark:border-[#618764]"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#273338] dark:text-white">TC Coordinator ($)</Label>
              <Input
                type="number"
                value={tcFee}
                onChange={(e) => setTcFee(Number(e.target.value) || 0)}
                className="h-9 text-xs font-mono border-[#D8E2D6] dark:border-[#618764]"
              />
            </div>
          </div>

          {/* Quick Split Presets & Capped Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-[#EDF2EB] dark:bg-[#273338] border border-[#D8E2D6] dark:border-[#618764]/50 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[#75887E] dark:text-[#A0B2A6] font-semibold">Presets:</span>
              {[70, 80, 85, 90].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => {
                    setAgentSplitPercent(pct)
                    setIsCapped(false)
                  }}
                  className="px-2 py-0.5 rounded-md bg-white dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] hover:border-[#9CB080] text-[11px] font-medium transition-colors"
                >
                  {pct}/{100 - pct}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-[#273338] dark:text-white">
              <span>Agent Annual Cap Met (100%)</span>
              <input
                type="checkbox"
                checked={isCapped}
                onChange={(e) => setIsCapped(e.target.checked)}
                className="h-4 w-4 rounded border-[#618764] text-[#9CB080] focus:ring-[#9CB080]"
              />
            </label>
          </div>

          {/* Computed Results Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-[#F5F7F4] dark:bg-[#273338] border border-[#D8E2D6] dark:border-[#618764] shadow-xs">
            {/* Left: Agent Take-Home */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-[#2B5748] dark:text-[#9CB080] font-bold">
                <MaterialIcon name="person" size={16} />
                <span>Agent Net Commission</span>
              </div>
              <p className="text-2xl font-bold text-[#273338] dark:text-white font-mono">
                ${agentNetPayout.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <div className="text-[11px] text-[#75887E] dark:text-[#A0B2A6] space-y-0.5 pt-1">
                <p>Gross GCI: ${grossCommission.toLocaleString()}</p>
                <p>TC Fee Deduction: -${tcFee}</p>
              </div>
            </div>

            {/* Right: Brokerage Net Revenue */}
            <div className="space-y-1 sm:border-l sm:border-[#D8E2D6] dark:sm:border-[#618764]/50 sm:pl-4">
              <div className="flex items-center gap-1.5 text-xs text-[#618764] dark:text-[#9CB080] font-bold">
                <MaterialIcon name="domain" size={16} />
                <span>Brokerage Net Retained</span>
              </div>
              <p className="text-2xl font-bold text-[#618764] dark:text-[#9CB080] font-mono">
                ${brokerageNetProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <div className="text-[11px] text-[#75887E] dark:text-[#A0B2A6] space-y-0.5 pt-1">
                <p>Franchise Royalty: ${franchiseDeduction.toLocaleString()}</p>
                <p>Margin: {((brokerageNetProfit / grossCommission) * 100).toFixed(1)}%</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D8E2D6] dark:border-[#618764]">
            <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
              Done
            </Button>
            <Button
              size="sm"
              onClick={handleSaveToLedger}
              disabled={isSaving}
              className="font-bold text-xs gap-1.5 bg-[#9CB080] hover:bg-[#8CA070] text-[#273338]"
            >
              <MaterialIcon name="add" size={16} />
              <span>{isSaving ? 'Saving...' : 'Save to Settlements'}</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
