import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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

  const update = (field: string, value: string) => setForm(p => ({ ...p, [field]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="cf-fn">First name *</Label>
          <Input id="cf-fn" value={form.firstName} onChange={e => update('firstName', e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cf-ln">Last name *</Label>
          <Input id="cf-ln" value={form.lastName} onChange={e => update('lastName', e.target.value)} required />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="cf-email">Email *</Label>
        <Input id="cf-email" type="email" value={form.email} onChange={e => update('email', e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="cf-phone">Phone *</Label>
          <Input id="cf-phone" value={form.phone} onChange={e => update('phone', e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cf-phone2">Secondary phone</Label>
          <Input id="cf-phone2" value={form.secondaryPhone} onChange={e => update('secondaryPhone', e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="cf-source">Lead source</Label>
        <Select value={form.leadSource} onValueChange={v => v && update('leadSource', v)}>
          <SelectTrigger id="cf-source"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['Zillow', 'Realtor.com', 'Meta Ads', 'Google Ads', 'Website', 'Referral', 'Open House', 'Direct Mail', 'Manual Entry'].map(s =>
              <SelectItem key={s} value={s}>{s}</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="cf-city">City</Label>
          <Input id="cf-city" value={form.city} onChange={e => update('city', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cf-state">State</Label>
          <Input id="cf-state" value={form.state} onChange={e => update('state', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cf-zip">ZIP</Label>
          <Input id="cf-zip" value={form.zipCode} onChange={e => update('zipCode', e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="cf-notes">Notes</Label>
        <Textarea id="cf-notes" value={form.notes} onChange={e => update('notes', e.target.value)} rows={3} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{contact ? 'Save Changes' : 'Create Contact'}</Button>
      </div>
    </form>
  )
}
