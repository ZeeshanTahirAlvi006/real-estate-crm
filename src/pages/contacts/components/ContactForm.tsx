import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Contact } from '@/types'

interface ContactFormProps {
  contact?: Contact
  onSubmit: (data: Record<string, unknown>) => void
  onCancel: () => void
}

export function ContactForm({ contact, onSubmit, onCancel }: ContactFormProps) {
  const [form, setForm] = useState({
    firstName: contact?.firstName || '',
    lastName: contact?.lastName || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    secondaryPhone: contact?.secondaryPhone || '',
    leadSource: contact?.leadSource || 'Manual Entry',
    address: contact?.address || '',
    city: contact?.city || '',
    state: contact?.state || '',
    zipCode: contact?.zipCode || '',
    notes: contact?.notes || '',
  })

  const update = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
  }

  const inputClass =
    'w-full px-3 py-2 text-sm rounded-md bg-[#F5F7F4] dark:bg-[#1A2E26] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white placeholder-[#75887E] dark:placeholder-[#A0B2A6] focus:outline-none focus:border-[#9CB080] focus:ring-1 focus:ring-[#9CB080] transition-all'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="cf-fn" className="text-xs font-semibold text-[#4A5D54] dark:text-[#A0B2A6]">
            First name *
          </Label>
          <input
            id="cf-fn"
            value={form.firstName}
            onChange={(e) => update('firstName', e.target.value)}
            className={inputClass}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cf-ln" className="text-xs font-semibold text-[#4A5D54] dark:text-[#A0B2A6]">
            Last name *
          </Label>
          <input
            id="cf-ln"
            value={form.lastName}
            onChange={(e) => update('lastName', e.target.value)}
            className={inputClass}
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cf-email" className="text-xs font-semibold text-[#4A5D54] dark:text-[#A0B2A6]">
          Email *
        </Label>
        <input
          id="cf-email"
          type="email"
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          className={inputClass}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="cf-phone" className="text-xs font-semibold text-[#4A5D54] dark:text-[#A0B2A6]">
            Phone *
          </Label>
          <input
            id="cf-phone"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            className={inputClass}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cf-phone2" className="text-xs font-semibold text-[#4A5D54] dark:text-[#A0B2A6]">
            Secondary phone
          </Label>
          <input
            id="cf-phone2"
            value={form.secondaryPhone}
            onChange={(e) => update('secondaryPhone', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cf-source" className="text-xs font-semibold text-[#4A5D54] dark:text-[#A0B2A6]">
          Lead source
        </Label>
        <Select value={form.leadSource} onValueChange={(v) => v && update('leadSource', v)}>
          <SelectTrigger
            id="cf-source"
            className="w-full bg-[#F5F7F4] dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white text-sm"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-[#273338] border-[#D8E2D6] dark:border-[#618764]">
            {[
              'Zillow',
              'Realtor.com',
              'Meta Ads',
              'Google Ads',
              'Website',
              'Referral',
              'Open House',
              'Direct Mail',
              'Manual Entry',
            ].map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="cf-city" className="text-xs font-semibold text-[#4A5D54] dark:text-[#A0B2A6]">
            City
          </Label>
          <input
            id="cf-city"
            value={form.city}
            onChange={(e) => update('city', e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cf-state" className="text-xs font-semibold text-[#4A5D54] dark:text-[#A0B2A6]">
            State
          </Label>
          <input
            id="cf-state"
            value={form.state}
            onChange={(e) => update('state', e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cf-zip" className="text-xs font-semibold text-[#4A5D54] dark:text-[#A0B2A6]">
            ZIP
          </Label>
          <input
            id="cf-zip"
            value={form.zipCode}
            onChange={(e) => update('zipCode', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cf-notes" className="text-xs font-semibold text-[#4A5D54] dark:text-[#A0B2A6]">
          Notes
        </Label>
        <textarea
          id="cf-notes"
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          rows={3}
          className={`${inputClass} resize-none`}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3.5 py-2 text-sm font-semibold rounded-md border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-[#E2ECE4] bg-transparent hover:bg-[#EDF2EB] dark:bg-[#1A2E26] dark:hover:bg-[#203930] transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-extrabold rounded-md bg-[#9CB080] hover:bg-[#B2C696] text-[#1A2E26] transition-colors cursor-pointer shadow-sm"
        >
          {contact ? 'Save Changes' : 'Create Contact'}
        </button>
      </div>
    </form>
  )
}
