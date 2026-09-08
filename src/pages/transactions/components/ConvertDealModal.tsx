import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BuildingOffice2Icon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useConvertDealToTransactionMutation } from '@/store/api/transactionsApi'
import { toast } from 'sonner'
import type { TransactionType } from '@/types/transaction'

interface ConvertDealModalProps {
  deal: {
    id: string
    propertyAddress: string
    contactName: string
    dealValue: number
    assignedAgentName?: string
  }
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const ConvertDealModal: React.FC<ConvertDealModalProps> = ({
  deal,
  open,
  onOpenChange,
}) => {
  const navigate = useNavigate()
  const [convertDeal, { isLoading }] = useConvertDealToTransactionMutation()

  const defaultClosing = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  const [closingDate, setClosingDate] = useState(defaultClosing)
  const [purchasePrice, setPurchasePrice] = useState(deal.dealValue || 450000)
  const [earnestMoney, setEarnestMoney] = useState(Math.round((deal.dealValue || 450000) * 0.02))
  const [type, setType] = useState<TransactionType>('buyer')
  const [escrowCompany, setEscrowCompany] = useState('First American Title & Escrow')
  const [escrowOfficer, setEscrowOfficer] = useState('Sarah Jenkins')
  const [escrowOfficerEmail, setEscrowOfficerEmail] = useState('escrow@firstam-closing.com')
  const [escrowOfficerPhone, setEscrowOfficerPhone] = useState('+1 (555) 948-2910')
  const [notes] = useState('')

  const handlePriceChange = (price: number) => {
    setPurchasePrice(price)
    setEarnestMoney(Math.round(price * 0.02))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!closingDate) {
      toast.error('Please specify a target closing date')
      return
    }

    try {
      const result = await convertDeal({
        dealId: deal.id,
        payload: {
          closingDate: new Date(closingDate).toISOString(),
          purchasePrice,
          earnestMoney,
          type,
          escrowCompany,
          escrowOfficer,
          escrowOfficerEmail,
          escrowOfficerPhone,
          notes,
        },
      }).unwrap()

      toast.success('🎉 Deal successfully converted to Escrow Transaction!')
      onOpenChange(false)
      navigate(`/transactions/${result.id}`)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to convert deal to transaction')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BuildingOffice2Icon className="w-5 h-5 text-primary" />
            <span>Convert Deal to Escrow Transaction</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Open escrow for <strong>{deal.propertyAddress}</strong> ({deal.contactName}). This will
            instantiate standard real estate closing milestones and an escrow document repository.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tx-type" className="text-xs font-semibold">
                Representation Type
              </Label>
              <Select value={type} onValueChange={(v) => v && setType(v as TransactionType)}>
                <SelectTrigger id="tx-type">
                  <SelectValue placeholder="Representation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buyer">Buyer Representation (9 Milestones)</SelectItem>
                  <SelectItem value="seller">Seller Representation (8 Milestones)</SelectItem>
                  <SelectItem value="dual">Dual Agency Closing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tx-closing" className="text-xs font-semibold flex items-center gap-1">
                <CalendarDaysIcon className="w-3.5 h-3.5 text-primary" />
                Target Closing Date *
              </Label>
              <Input
                id="tx-closing"
                type="date"
                value={closingDate}
                onChange={(e) => setClosingDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tx-price" className="text-xs font-semibold flex items-center gap-1">
                <CurrencyDollarIcon className="w-3.5 h-3.5 text-emerald-500" />
                Final Purchase Price ($) *
              </Label>
              <Input
                id="tx-price"
                type="number"
                value={purchasePrice}
                onChange={(e) => handlePriceChange(Number(e.target.value))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tx-earnest" className="text-xs font-semibold">
                Earnest Money Deposit ($)
              </Label>
              <Input
                id="tx-earnest"
                type="number"
                value={earnestMoney}
                onChange={(e) => setEarnestMoney(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Escrow Details */}
          <div className="rounded-xl bg-muted/40 p-3.5 border border-border/60 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <ShieldCheckIcon className="w-4 h-4 text-primary" />
              <span>Escrow & Settlement Partner</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="tx-escrow-comp" className="text-[11px]">
                  Escrow Company
                </Label>
                <Input
                  id="tx-escrow-comp"
                  value={escrowCompany}
                  onChange={(e) => setEscrowCompany(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="tx-escrow-off" className="text-[11px]">
                  Escrow Officer
                </Label>
                <Input
                  id="tx-escrow-off"
                  value={escrowOfficer}
                  onChange={(e) => setEscrowOfficer(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="tx-escrow-email" className="text-[11px]">
                  Officer Email
                </Label>
                <Input
                  id="tx-escrow-email"
                  type="email"
                  value={escrowOfficerEmail}
                  onChange={(e) => setEscrowOfficerEmail(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="tx-escrow-phone" className="text-[11px]">
                  Officer Phone
                </Label>
                <Input
                  id="tx-escrow-phone"
                  value={escrowOfficerPhone}
                  onChange={(e) => setEscrowOfficerPhone(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-primary text-primary-foreground font-semibold shadow-xs"
            >
              {isLoading ? 'Opening Escrow...' : 'Open Escrow & Generate Milestones'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
