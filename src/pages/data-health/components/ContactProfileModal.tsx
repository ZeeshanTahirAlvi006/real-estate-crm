import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { useUpdateContactMutation } from '@/store/api/contactsApi'
import type { ContactWithDataIssues } from '@/store/api/dataHealthApi'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ContactProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record: ContactWithDataIssues | null
  initialEditMode?: boolean
}

export function ContactProfileModal({
  open,
  onOpenChange,
  record,
  initialEditMode = false,
}: ContactProfileModalProps) {
  const navigate = useNavigate()
  const [updateContact, { isLoading: isUpdating }] = useUpdateContactMutation()

  const [isEditing, setIsEditing] = useState(initialEditMode)

  // Form state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (record) {
      setFirstName(record.firstName || '')
      setLastName(record.lastName || '')
      setEmail(record.email || '')
      setPhone(record.phone || '')
      setAddress(record.address || '')
      setCity(record.city || '')
      setState(record.state || '')
      setZipCode(record.zipCode || '')
      setNotes(record.notes || '')
      setIsEditing(initialEditMode)
    }
  }, [record, initialEditMode, open])

  if (!record) return null

  // Initials
  const initials = `${record.firstName?.[0] || ''}${record.lastName?.[0] || ''}`.toUpperCase() || 'C'

  // Clean phone for WhatsApp web navigation
  const cleanPhone = (phone || record.phone || '').replace(/\D/g, '')

  // Live validation checks
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/
  const isEmailValid = email.trim() !== '' && emailRegex.test(email.trim())
  const isPhoneValid = cleanPhone.length >= 10 && cleanPhone.length <= 15

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await updateContact({
        id: record.id,
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          zipCode: zipCode.trim(),
          notes: notes.trim(),
        },
      }).unwrap()

      toast.success('Contact profile updated and health score refreshed!')
      setIsEditing(false)
      onOpenChange(false)
    } catch {
      toast.error('Failed to update contact profile')
    }
  }

  const handleNavigateToDetail = () => {
    onOpenChange(false)
    navigate(`/contacts/${record.id}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto border border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#254238] rounded-2xl shadow-xl p-0 gap-0">
        {/* ── Dialog Header with Profile Banner ── */}
        <div className="p-5 sm:p-6 bg-[#EDF2EB] dark:bg-[#1A2E26] border-b border-[#D8E2D6] dark:border-[#618764]/40">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-2xl bg-[#2B5748] text-white flex items-center justify-center font-bold text-xl shadow-sm shrink-0">
                {initials}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-xl font-bold text-[#273338] dark:text-white">
                    {record.firstName} {record.lastName}
                  </DialogTitle>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold border border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#202B2F] text-[#273338] dark:text-[#EDF2EB]">
                    Score: {record.leadScore}
                  </span>
                  <span className="text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-[#2B5748]/15 dark:bg-[#9CB080]/20 text-[#2B5748] dark:text-[#9CB080]">
                    {record.status}
                  </span>
                </div>
                <DialogDescription className="text-xs text-[#4A5D54] dark:text-[#A0B2A6]">
                  Source: {record.leadSource} • Added {new Date(record.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </DialogDescription>
              </div>
            </div>

            {/* Quick Switch between Overview & Edit */}
            <div className="flex items-center gap-1.5 self-end sm:self-center">
              <Button
                variant={isEditing ? 'outline' : 'default'}
                size="sm"
                onClick={() => setIsEditing(false)}
                className={cn(
                  'h-8 text-xs font-semibold px-3 cursor-pointer',
                  !isEditing
                    ? 'bg-[#2B5748] text-white hover:bg-[#24463a]'
                    : 'border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#202B2F] text-[#273338] dark:text-white'
                )}
              >
                <MaterialIcon name="visibility" size={14} className="mr-1" />
                <span>Overview</span>
              </Button>
              <Button
                variant={isEditing ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsEditing(true)}
                className={cn(
                  'h-8 text-xs font-semibold px-3 cursor-pointer',
                  isEditing
                    ? 'bg-[#2B5748] text-white hover:bg-[#24463a]'
                    : 'border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#202B2F] text-[#273338] dark:text-white'
                )}
              >
                <MaterialIcon name="edit" size={14} className="mr-1" />
                <span>Quick Fix</span>
              </Button>
            </div>
          </div>
        </div>

        {/* ── Active Issues Banner ── */}
        {record.issues && record.issues.length > 0 && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/50 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300">
              <MaterialIcon name="report_problem" size={16} className="text-amber-600 dark:text-amber-400" />
              <span>Data Hygiene Issues Detected</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {record.issues.map((issue, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'p-2.5 rounded-lg text-xs flex items-start gap-2 border',
                    issue.severity === 'error'
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200'
                      : 'bg-amber-100/60 dark:bg-amber-900/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                  )}
                >
                  <MaterialIcon
                    name={issue.severity === 'error' ? 'error' : 'warning'}
                    size={16}
                    className={issue.severity === 'error' ? 'text-rose-600 mt-0.5' : 'text-amber-600 mt-0.5'}
                  />
                  <div>
                    <span className="font-bold block">{issue.title}</span>
                    <span className="text-[11px] opacity-90">{issue.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Body: Overview Mode vs Quick Fix Mode ── */}
        <div className="p-5 sm:p-6 space-y-5">
          {!isEditing ? (
            /* ══ 1. Overview Mode ══ */
            <div className="space-y-4">
              {/* Primary Contact Channels */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Email Box */}
                <div className="p-3.5 rounded-xl border border-[#D8E2D6] dark:border-[#618764]/40 bg-[#F5F7F4] dark:bg-[#202B2F] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#4A5D54] dark:text-[#A0B2A6] flex items-center gap-1.5">
                      <MaterialIcon name="mail" size={14} className="text-[#618764]" />
                      Email Address
                    </span>
                    {record.hasInvalidEmail ? (
                      <Badge variant="outline" className="text-[10px] bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300">
                        Invalid Syntax
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300">
                        RFC Valid
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <p className="text-sm font-mono font-medium text-[#273338] dark:text-white truncate select-all">
                      {record.email || <span className="text-rose-500 italic">No email address on file</span>}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="h-7 px-2 text-xs text-[#2B5748] dark:text-[#9CB080] hover:bg-[#EDF2EB] dark:hover:bg-[#1A2E26] shrink-0 cursor-pointer"
                      title="Fix Email"
                    >
                      <MaterialIcon name="edit" size={14} className="mr-1" />
                      Fix
                    </Button>
                  </div>
                </div>

                {/* Phone Box */}
                <div className="p-3.5 rounded-xl border border-[#D8E2D6] dark:border-[#618764]/40 bg-[#F5F7F4] dark:bg-[#202B2F] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#4A5D54] dark:text-[#A0B2A6] flex items-center gap-1.5">
                      <MaterialIcon name="phone" size={14} className="text-[#618764]" />
                      Phone Number
                    </span>
                    {record.hasInvalidPhone ? (
                      <Badge variant="outline" className="text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300">
                        Unformatted
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300">
                        E.164 Valid
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <p className="text-sm font-mono font-medium text-[#273338] dark:text-white truncate select-all">
                      {record.phone || <span className="text-amber-500 italic">No phone number on file</span>}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                      {cleanPhone && (
                        <a
                          href={`https://web.whatsapp.com/send?phone=${cleanPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center h-7 px-2 text-xs font-semibold text-[#008069] dark:text-[#00a884] hover:bg-[#008069]/10 rounded-md transition-colors"
                          title="Open WhatsApp Web chat"
                        >
                          <MaterialIcon name="chat" size={14} className="mr-1" />
                          Chat
                        </a>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                        className="h-7 px-2 text-xs text-[#2B5748] dark:text-[#9CB080] hover:bg-[#EDF2EB] dark:hover:bg-[#1A2E26] cursor-pointer"
                        title="Fix Phone"
                      >
                        <MaterialIcon name="edit" size={14} className="mr-1" />
                        Fix
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Physical Address */}
              <div className="p-3.5 rounded-xl border border-[#D8E2D6] dark:border-[#618764]/40 bg-[#F5F7F4] dark:bg-[#202B2F] space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#4A5D54] dark:text-[#A0B2A6] flex items-center gap-1.5">
                  <MaterialIcon name="location_on" size={14} className="text-[#618764]" />
                  Physical Address
                </span>
                <p className="text-xs text-[#273338] dark:text-white leading-relaxed">
                  {record.address ? (
                    `${record.address}${record.city ? `, ${record.city}` : ''}${record.state ? `, ${record.state}` : ''} ${record.zipCode || ''}`
                  ) : (
                    <span className="text-[#8696a0] italic">No physical address recorded</span>
                  )}
                </p>
              </div>

              {/* Property Interests & Tags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-3.5 rounded-xl border border-[#D8E2D6] dark:border-[#618764]/40 bg-[#F5F7F4] dark:bg-[#202B2F] space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#4A5D54] dark:text-[#A0B2A6] flex items-center gap-1.5">
                    <MaterialIcon name="home" size={14} className="text-[#618764]" />
                    Property Interests
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {record.propertyInterests && record.propertyInterests.length > 0 ? (
                      record.propertyInterests.map((interest, idx) => (
                        <Badge key={idx} variant="secondary" className="text-[10px] bg-white dark:bg-[#1A2E26] border border-[#D8E2D6] dark:border-[#618764]/40">
                          {interest}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-[#8696a0] italic">No property interests recorded</span>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-[#D8E2D6] dark:border-[#618764]/40 bg-[#F5F7F4] dark:bg-[#202B2F] space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#4A5D54] dark:text-[#A0B2A6] flex items-center gap-1.5">
                    <MaterialIcon name="label" size={14} className="text-[#618764]" />
                    Contact Tags
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {record.tags && record.tags.length > 0 ? (
                      record.tags.map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className="text-[10px] bg-white dark:bg-[#1A2E26] border border-[#D8E2D6] dark:border-[#618764]/40">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-[#8696a0] italic">No tags assigned</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {record.notes && (
                <div className="p-3.5 rounded-xl border border-[#D8E2D6] dark:border-[#618764]/40 bg-[#F5F7F4] dark:bg-[#202B2F] space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#4A5D54] dark:text-[#A0B2A6] flex items-center gap-1.5">
                    <MaterialIcon name="notes" size={14} className="text-[#618764]" />
                    Client Notes
                  </span>
                  <p className="text-xs text-[#273338] dark:text-white whitespace-pre-line leading-relaxed">
                    {record.notes}
                  </p>
                </div>
              )}

              {/* Activity & Deal Statistics */}
              <div className="grid grid-cols-3 gap-2.5 pt-1 text-center">
                <div className="p-2.5 rounded-xl border border-[#D8E2D6] dark:border-[#618764]/40 bg-[#EDF2EB] dark:bg-[#1A2E26]">
                  <span className="text-[10px] font-bold uppercase text-[#4A5D54] dark:text-[#A0B2A6] block">Deals</span>
                  <span className="text-base font-bold text-[#273338] dark:text-white">{record.dealCount}</span>
                </div>
                <div className="p-2.5 rounded-xl border border-[#D8E2D6] dark:border-[#618764]/40 bg-[#EDF2EB] dark:bg-[#1A2E26]">
                  <span className="text-[10px] font-bold uppercase text-[#4A5D54] dark:text-[#A0B2A6] block">Activities</span>
                  <span className="text-base font-bold text-[#273338] dark:text-white">{record.activityCount}</span>
                </div>
                <div className="p-2.5 rounded-xl border border-[#D8E2D6] dark:border-[#618764]/40 bg-[#EDF2EB] dark:bg-[#1A2E26]">
                  <span className="text-[10px] font-bold uppercase text-[#4A5D54] dark:text-[#A0B2A6] block">Status</span>
                  <span className="text-xs font-bold text-[#2B5748] dark:text-[#9CB080] capitalize block mt-0.5">{record.status}</span>
                </div>
              </div>
            </div>
          ) : (
            /* ══ 2. Quick Fix / Edit Form Mode ══ */
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-first-name" className="text-xs font-bold text-[#273338] dark:text-white">
                    First Name
                  </Label>
                  <Input
                    id="edit-first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="h-9 text-xs border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#202B2F]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-last-name" className="text-xs font-bold text-[#273338] dark:text-white">
                    Last Name
                  </Label>
                  <Input
                    id="edit-last-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="h-9 text-xs border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#202B2F]"
                  />
                </div>
              </div>

              {/* Email with real-time validation indicator */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-email" className="text-xs font-bold text-[#273338] dark:text-white flex items-center gap-1.5">
                    <MaterialIcon name="mail" size={14} className="text-[#618764]" />
                    Email Address
                  </Label>
                  {email.trim() ? (
                    isEmailValid ? (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <MaterialIcon name="check_circle" size={12} /> Valid syntax
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <MaterialIcon name="cancel" size={12} /> Invalid syntax (e.g. name@domain.com)
                      </span>
                    )
                  ) : null}
                </div>
                <Input
                  id="edit-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. client@example.com"
                  className={cn(
                    'h-9 text-xs font-mono border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#202B2F]',
                    email && !isEmailValid && 'border-rose-400 focus-visible:ring-rose-400'
                  )}
                />
              </div>

              {/* Phone with real-time format indicator */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-phone" className="text-xs font-bold text-[#273338] dark:text-white flex items-center gap-1.5">
                    <MaterialIcon name="phone" size={14} className="text-[#618764]" />
                    Phone Number
                  </Label>
                  {phone.trim() ? (
                    isPhoneValid ? (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <MaterialIcon name="check_circle" size={12} /> E.164 compatible
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <MaterialIcon name="warning" size={12} /> Requires 10–15 digits
                      </span>
                    )
                  ) : null}
                </div>
                <Input
                  id="edit-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +92 300 1234567 or +1 (555) 234-5678"
                  className={cn(
                    'h-9 text-xs font-mono border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#202B2F]',
                    phone && !isPhoneValid && 'border-amber-400 focus-visible:ring-amber-400'
                  )}
                />
              </div>

              {/* Address details */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-address" className="text-xs font-bold text-[#273338] dark:text-white">
                  Street Address
                </Label>
                <Input
                  id="edit-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House / Street address"
                  className="h-9 text-xs border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#202B2F]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-city" className="text-[11px] font-bold text-[#273338] dark:text-white">
                    City
                  </Label>
                  <Input
                    id="edit-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="h-8 text-xs border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#202B2F]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-state" className="text-[11px] font-bold text-[#273338] dark:text-white">
                    State
                  </Label>
                  <Input
                    id="edit-state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="h-8 text-xs border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#202B2F]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-zip" className="text-[11px] font-bold text-[#273338] dark:text-white">
                    Zip Code
                  </Label>
                  <Input
                    id="edit-zip"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    className="h-8 text-xs border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#202B2F]"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-notes" className="text-xs font-bold text-[#273338] dark:text-white">
                  Notes
                </Label>
                <Textarea
                  id="edit-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="text-xs border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#202B2F]"
                />
              </div>

              {/* Form submit buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  className="h-9 text-xs font-semibold border-[#D8E2D6] dark:border-[#618764]/40 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUpdating}
                  size="sm"
                  className="h-9 text-xs font-bold bg-[#2B5748] hover:bg-[#24463a] text-white cursor-pointer shadow-sm"
                >
                  <MaterialIcon name={isUpdating ? 'sync' : 'check'} size={16} className={cn('mr-1.5', isUpdating && 'animate-spin')} />
                  <span>{isUpdating ? 'Saving...' : 'Save Changes'}</span>
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* ── Dialog Footer with Navigation Actions ── */}
        {!isEditing && (
          <>
            <Separator className="bg-[#D8E2D6] dark:bg-[#618764]/40" />
            <DialogFooter className="p-4 sm:p-5 bg-[#EDF2EB]/50 dark:bg-[#1A2E26]/50 flex-row items-center justify-between sm:justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleNavigateToDetail}
                className="h-9 text-xs font-semibold gap-1.5 border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#202B2F] text-[#273338] dark:text-white cursor-pointer shadow-xs"
              >
                <MaterialIcon name="open_in_new" size={15} />
                <span>View CRM</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="h-9 text-xs font-semibold border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#202B2F] text-[#273338] dark:text-white cursor-pointer"
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-9 text-xs font-bold gap-1.5 bg-[#2B5748] hover:bg-[#24463a] text-white cursor-pointer shadow-sm"
                >
                  <MaterialIcon name="edit" size={15} />
                  <span>Quick Fix</span>
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
