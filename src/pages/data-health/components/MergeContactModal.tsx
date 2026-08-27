import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  ArrowsRightLeftIcon,
  CheckIcon,
  BriefcaseIcon,
  ClockIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import type { DuplicatePair } from '@/types'

interface MergeContactModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  duplicatePair: DuplicatePair | null
  onConfirmMerge: (payload: {
    id: string
    primaryContactId: string
    secondaryContactId: string
    fieldOverrides?: Record<string, any>
  }) => Promise<void>
  isLoading?: boolean
}

export const MergeContactModal: React.FC<MergeContactModalProps> = ({
  open,
  onOpenChange,
  duplicatePair,
  onConfirmMerge,
  isLoading = false,
}) => {
  if (!duplicatePair) return null

  const { contact1, contact2, matchScore, matchFields } = duplicatePair

  // Default: contact1 is primary (older record)
  const [primaryId, setPrimaryId] = useState(contact1.id)
  const isC1Primary = primaryId === contact1.id

  const primary = isC1Primary ? contact1 : contact2
  const secondary = isC1Primary ? contact2 : contact1

  // Field selection state
  const [selectedFirstName, setSelectedFirstName] = useState(primary.firstName)
  const [selectedLastName, setSelectedLastName] = useState(primary.lastName)
  const [selectedEmail, setSelectedEmail] = useState(primary.email)
  const [selectedPhone, setSelectedPhone] = useState(primary.phone)
  const [selectedAddress, setSelectedAddress] = useState(primary.address || secondary.address || '')
  const [selectedCity, setSelectedCity] = useState(primary.city || secondary.city || '')
  const [selectedState, setSelectedState] = useState(primary.state || secondary.state || '')
  const [selectedZip, setSelectedZip] = useState(primary.zipCode || secondary.zipCode || '')

  // Sync on modal open
  useEffect(() => {
    if (duplicatePair) {
      setPrimaryId(duplicatePair.contact1.id)
      setSelectedFirstName(duplicatePair.contact1.firstName)
      setSelectedLastName(duplicatePair.contact1.lastName)
      setSelectedEmail(duplicatePair.contact1.email)
      setSelectedPhone(duplicatePair.contact1.phone)
      setSelectedAddress(duplicatePair.contact1.address || duplicatePair.contact2.address || '')
      setSelectedCity(duplicatePair.contact1.city || duplicatePair.contact2.city || '')
      setSelectedState(duplicatePair.contact1.state || duplicatePair.contact2.state || '')
      setSelectedZip(duplicatePair.contact1.zipCode || duplicatePair.contact2.zipCode || '')
    }
  }, [duplicatePair, open])

  const totalDeals = ((contact1 as any).dealCount || 0) + ((contact2 as any).dealCount || 0)
  const totalActivities = ((contact1 as any).activityCount || 0) + ((contact2 as any).activityCount || 0)

  const handleMergeSubmit = async () => {
    await onConfirmMerge({
      id: duplicatePair.id,
      primaryContactId: primary.id,
      secondaryContactId: secondary.id,
      fieldOverrides: {
        firstName: selectedFirstName,
        lastName: selectedLastName,
        email: selectedEmail,
        phone: selectedPhone,
        address: selectedAddress,
        city: selectedCity,
        state: selectedState,
        zipCode: selectedZip,
      },
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto border-border/80 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ArrowsRightLeftIcon className="w-5 h-5 text-primary" />
              <span>Merge Duplicate Contacts</span>
            </DialogTitle>
            <Badge
              variant="outline"
              className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/30"
            >
              {matchScore}% Confidence ({matchFields.join(', ')})
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Compare records and select which values to keep. All deals, tags, and timeline activities will automatically merge into the primary record.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Primary Record Selection Switcher */}
          <div className="p-3 rounded-xl bg-muted/40 border border-border/70 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Choose Primary Contact (Record to keep active)
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setPrimaryId(contact1.id)
                  setSelectedFirstName(contact1.firstName)
                  setSelectedLastName(contact1.lastName)
                  setSelectedEmail(contact1.email)
                  setSelectedPhone(contact1.phone)
                }}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isC1Primary
                    ? 'border-primary bg-primary/10 ring-1 ring-primary'
                    : 'border-border bg-card hover:border-border/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-foreground">Record A (Older)</span>
                  {isC1Primary && <CheckIcon className="w-4 h-4 text-primary" />}
                </div>
                <p className="text-muted-foreground">{contact1.firstName} {contact1.lastName}</p>
                <p className="text-muted-foreground font-mono">{contact1.phone || contact1.email}</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPrimaryId(contact2.id)
                  setSelectedFirstName(contact2.firstName)
                  setSelectedLastName(contact2.lastName)
                  setSelectedEmail(contact2.email)
                  setSelectedPhone(contact2.phone)
                }}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  !isC1Primary
                    ? 'border-primary bg-primary/10 ring-1 ring-primary'
                    : 'border-border bg-card hover:border-border/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-foreground">Record B (Newer)</span>
                  {!isC1Primary && <CheckIcon className="w-4 h-4 text-primary" />}
                </div>
                <p className="text-muted-foreground">{contact2.firstName} {contact2.lastName}</p>
                <p className="text-muted-foreground font-mono">{contact2.phone || contact2.email}</p>
              </button>
            </div>
          </div>

          {/* Impacted Assets Summary */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <BriefcaseIcon className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block">Active Deals Reassigned</span>
                <span className="font-bold text-foreground font-mono">{totalDeals} Deal(s)</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                <ClockIcon className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block">Timeline History Merged</span>
                <span className="font-bold text-foreground font-mono">{totalActivities} Activity Log(s)</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Field-by-Field Comparator & Pickers */}
          <div className="space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Field Resolution (Click to choose winning field value)
            </span>

            {/* Name Picker */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">Full Name</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFirstName(contact1.firstName)
                    setSelectedLastName(contact1.lastName)
                  }}
                  className={`p-2 rounded-lg border text-left text-xs transition-all ${
                    selectedFirstName === contact1.firstName && selectedLastName === contact1.lastName
                      ? 'border-primary bg-primary/10 font-semibold'
                      : 'border-border bg-card'
                  }`}
                >
                  {contact1.firstName} {contact1.lastName}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFirstName(contact2.firstName)
                    setSelectedLastName(contact2.lastName)
                  }}
                  className={`p-2 rounded-lg border text-left text-xs transition-all ${
                    selectedFirstName === contact2.firstName && selectedLastName === contact2.lastName
                      ? 'border-primary bg-primary/10 font-semibold'
                      : 'border-border bg-card'
                  }`}
                >
                  {contact2.firstName} {contact2.lastName}
                </button>
              </div>
            </div>

            {/* Email Picker */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">Email Address</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedEmail(contact1.email)}
                  className={`p-2 rounded-lg border text-left text-xs font-mono truncate transition-all ${
                    selectedEmail === contact1.email
                      ? 'border-primary bg-primary/10 font-semibold'
                      : 'border-border bg-card'
                  }`}
                >
                  {contact1.email || '(Empty)'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEmail(contact2.email)}
                  className={`p-2 rounded-lg border text-left text-xs font-mono truncate transition-all ${
                    selectedEmail === contact2.email
                      ? 'border-primary bg-primary/10 font-semibold'
                      : 'border-border bg-card'
                  }`}
                >
                  {contact2.email || '(Empty)'}
                </button>
              </div>
            </div>

            {/* Phone Picker */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">Phone Number</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPhone(contact1.phone)}
                  className={`p-2 rounded-lg border text-left text-xs font-mono truncate transition-all ${
                    selectedPhone === contact1.phone
                      ? 'border-primary bg-primary/10 font-semibold'
                      : 'border-border bg-card'
                  }`}
                >
                  {contact1.phone || '(Empty)'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPhone(contact2.phone)}
                  className={`p-2 rounded-lg border text-left text-xs font-mono truncate transition-all ${
                    selectedPhone === contact2.phone
                      ? 'border-primary bg-primary/10 font-semibold'
                      : 'border-border bg-card'
                  }`}
                >
                  {contact2.phone || '(Empty)'}
                </button>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">Address</Label>
              <Input
                value={selectedAddress}
                onChange={(e) => setSelectedAddress(e.target.value)}
                placeholder="Address..."
                className="h-8 text-xs"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isLoading}
            onClick={handleMergeSubmit}
            className="gap-1.5 font-bold shadow-xs bg-primary"
          >
            {isLoading ? (
              <>
                <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                Merging Records...
              </>
            ) : (
              <>
                <ShieldCheckIcon className="w-4 h-4" />
                Confirm & Merge
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
