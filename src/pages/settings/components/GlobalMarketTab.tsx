import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { GlobeAltIcon } from '@heroicons/react/24/outline'
import { toast } from 'sonner'

export const GlobalMarketTab: React.FC = () => {
  const [currency, setCurrency] = useState('USD')
  const [marketType, setMarketType] = useState('north_america')
  const [transferTaxRate, setTransferTaxRate] = useState('4.0')
  const [whatsappPhone, setWhatsappPhone] = useState('+1 (555) 019-2831')

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    toast.success('Global & regional market settings updated successfully!')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <GlobeAltIcon className="w-5 h-5 text-primary" />
            <div>
              <CardTitle className="text-base">Global & Non-MLS Market Customization</CardTitle>
              <CardDescription className="text-xs">
                Configure international currency, Non-MLS property types (Freehold / Off-Plan), and regional statutory fees
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Currency */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Default Brokerage Currency</Label>
                <Select value={currency} onValueChange={(val) => val && setCurrency(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD" className="text-xs">USD ($) — United States Dollar</SelectItem>
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
                <Label className="text-xs font-semibold">Market Taxonomy & Standards</Label>
                <Select value={marketType} onValueChange={(val) => val && setMarketType(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select market standard" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="north_america" className="text-xs">North American MLS / RESO Standard</SelectItem>
                    <SelectItem value="uae_dubai" className="text-xs">Middle East (Freehold & Off-Plan RERA)</SelectItem>
                    <SelectItem value="uk_europe" className="text-xs">UK & European (Stamp Duty & Leasehold)</SelectItem>
                    <SelectItem value="apac" className="text-xs">Asia-Pacific Strata Title & Direct Developer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Regional Transfer Tax */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Government Transfer Tax / Stamp Duty (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={transferTaxRate}
                  onChange={(e) => setTransferTaxRate(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
                <p className="text-[11px] text-muted-foreground">
                  Applied to closing settlement statements and automated buyer Net Sheets.
                </p>
              </div>

              {/* WhatsApp Cloud API Number */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Primary WhatsApp Business Verified Number</Label>
                <Input
                  type="text"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
                <p className="text-[11px] text-muted-foreground">
                  Used by Sub-30s Omnichannel AI ISA for international lead auto-engagement.
                </p>
              </div>
            </div>

            {/* Non-MLS Direct Developer Inventory Toggle */}
            <div className="p-4 rounded-xl bg-muted/40 border border-border/70 flex items-center justify-between">
              <div>
                <span className="font-bold text-foreground block">Off-Plan & Direct Developer Feeds</span>
                <span className="text-muted-foreground text-[11px]">
                  Enable multi-unit batch reservations, installment payment schedules, and stage construction triggers.
                </span>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-border/60">
              <Button type="submit" size="sm" className="shadow-xs font-semibold">
                Save Global Market Settings
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
