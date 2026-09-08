import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { toast } from 'sonner'

export const GlobalMarketTab: React.FC = () => {
  const [currency, setCurrency] = useState('USD')
  const [marketType, setMarketType] = useState('north_america')
  const [transferTaxRate, setTransferTaxRate] = useState('4.0')
  const [whatsappPhone, setWhatsappPhone] = useState('+1 (555) 019-2831')

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    toast.success('Market settings updated successfully!')
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white dark:bg-[#2B5748] border-[#D8E2D6] dark:border-[#618764] shadow-xs">
        <CardHeader className="pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/60">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#9CB080]/20 text-[#273338] dark:text-[#9CB080] flex items-center justify-center">
              <MaterialIcon name="public" size={20} />
            </div>
            <div>
              <CardTitle className="text-base text-[#273338] dark:text-white">Global Market</CardTitle>
              <CardDescription className="text-xs text-[#75887E] dark:text-[#A0B2A6]">
                Currency and standards
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Currency */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#4A5D54] dark:text-[#E2ECE4]">Default Currency</Label>
                <Select value={currency} onValueChange={(val) => val && setCurrency(val)}>
                  <SelectTrigger className="h-9 text-xs bg-[#F5F7F4] dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#2B5748] border-[#D8E2D6] dark:border-[#618764]">
                    <SelectItem value="USD" className="text-xs">USD ($) — US Dollar</SelectItem>
                    <SelectItem value="EUR" className="text-xs">EUR (€) — Euro</SelectItem>
                    <SelectItem value="AED" className="text-xs">AED (د.إ) — UAE Dirham</SelectItem>
                    <SelectItem value="GBP" className="text-xs">GBP (£) — British Pound</SelectItem>
                    <SelectItem value="CAD" className="text-xs">CAD ($) — Canadian Dollar</SelectItem>
                    <SelectItem value="AUD" className="text-xs">AUD ($) — Australian Dollar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Property Taxonomy */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#4A5D54] dark:text-[#E2ECE4]">Market Standard</Label>
                <Select value={marketType} onValueChange={(val) => val && setMarketType(val)}>
                  <SelectTrigger className="h-9 text-xs bg-[#F5F7F4] dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white">
                    <SelectValue placeholder="Select market standard" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#2B5748] border-[#D8E2D6] dark:border-[#618764]">
                    <SelectItem value="north_america" className="text-xs">North American MLS / RESO</SelectItem>
                    <SelectItem value="uae_dubai" className="text-xs">Middle East (RERA Off-Plan)</SelectItem>
                    <SelectItem value="uk_europe" className="text-xs">UK & European Leasehold</SelectItem>
                    <SelectItem value="apac" className="text-xs">Asia-Pacific Strata Title</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Regional Transfer Tax */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#4A5D54] dark:text-[#E2ECE4]">Transfer Tax (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={transferTaxRate}
                  onChange={(e) => setTransferTaxRate(e.target.value)}
                  className="h-9 text-xs font-mono bg-[#F5F7F4] dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white"
                />
              </div>

              {/* WhatsApp Cloud API Number */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#4A5D54] dark:text-[#E2ECE4]">Verified Number</Label>
                <Input
                  type="text"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  className="h-9 text-xs font-mono bg-[#F5F7F4] dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white"
                />
              </div>
            </div>

            {/* Non-MLS Direct Developer Inventory Toggle */}
            <div className="p-3.5 rounded-xl bg-[#EDF2EB] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] flex items-center justify-between">
              <div>
                <span className="font-bold text-[#273338] dark:text-white block">Developer Feeds</span>
                <span className="text-[#75887E] dark:text-[#A0B2A6] text-[11px]">
                  Batch reservations and installment schedules
                </span>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-[#D8E2D6] dark:border-[#618764] text-[#9CB080] focus:ring-[#9CB080]"
              />
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-[#D8E2D6] dark:border-[#618764]/40">
              <Button
                type="submit"
                size="sm"
                className="bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] font-bold text-xs h-9 px-4 rounded-lg cursor-pointer"
              >
                Save Market
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
