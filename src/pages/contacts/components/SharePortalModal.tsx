import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  SparklesIcon,
  CheckIcon,
  DocumentDuplicateIcon,
  ArrowTopRightOnSquareIcon,
  ShieldCheckIcon,
  DevicePhoneMobileIcon,
  KeyIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline'
import { toast } from 'sonner'
import type { Contact, PortalCredentials } from '@/types'
import { useGeneratePortalInviteMutation } from '@/store/api/contactsApi'

interface SharePortalModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact: Partial<Contact> | null
  initialCredentials?: PortalCredentials | null
}

export function SharePortalModal({
  open,
  onOpenChange,
  contact,
  initialCredentials,
}: SharePortalModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [credentials, setCredentials] = useState<PortalCredentials | null>(initialCredentials || null)
  const [generateInvite, { isLoading }] = useGeneratePortalInviteMutation()

  // Sync initialCredentials when modal opens
  React.useEffect(() => {
    if (initialCredentials) {
      setCredentials(initialCredentials)
    } else if (open && contact?.id && !credentials) {
      generateInvite({ contactId: contact.id })
        .unwrap()
        .then((res) => setCredentials(res))
        .catch(() => toast.error('Could not generate VIP portal invitation'))
    }
  }, [open, contact?.id, initialCredentials])

  if (!contact) return null

  const portalUrl = credentials?.portalUrl || `${window.location.origin}/portal`
  const loginEmail = credentials?.portalEmail || contact.email || 'client@portal.proppulse.com'
  const tempPassword = credentials?.temporaryPassword || 'Client!123'
  const cleanPhone = (contact.phone || '').replace(/\D/g, '')

  const defaultInviteMessage = `Assalam-o-Alaikum ${contact.firstName || 'there'}! 👋

Welcome to our VIP Client Portal. We have activated your private access to:
🏡 Track curated property matches & market deals
📋 View your live transaction milestones & escrow progress
📄 Review and download your closing documents & disclosures

🌐 Access Your Portal: ${portalUrl}
📧 Login Email: ${loginEmail}
🔑 Temporary Password: ${tempPassword}

Feel free to reply directly here on WhatsApp if you have any questions!`

  const inviteMessage = credentials?.whatsappInviteMessage || defaultInviteMessage
  const shareUrl = credentials?.whatsappShareUrl || `https://wa.me/${cleanPhone}?text=${encodeURIComponent(inviteMessage)}`

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(label)
    toast.success(`${label} copied to clipboard!`)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleOpenWhatsApp = () => {
    if (!cleanPhone) {
      toast.error('Contact does not have a valid phone number')
      return
    }
    window.open(shareUrl, '_blank')
    toast.success('Opening WhatsApp with invitation...')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 bg-card border-border shadow-2xl rounded-2xl">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <SparklesIcon className="w-5 h-5" />
            </div>
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] font-bold"
            >
              VIP Portal Provisioned
            </Badge>
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            Share VIP Portal via WhatsApp
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            A private portal has been automatically created for{' '}
            <strong className="text-foreground">{contact.firstName} {contact.lastName}</strong>.
            Send their access details directly over WhatsApp with 1 click.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Credentials Box */}
          <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                <EnvelopeIcon className="w-4 h-4 text-primary" />
                Login Email:
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-foreground">{loginEmail}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={() => handleCopy(loginEmail, 'Email')}
                >
                  {copiedField === 'Email' ? <CheckIcon className="w-3.5 h-3.5 text-emerald-500" /> : <DocumentDuplicateIcon className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                <KeyIcon className="w-4 h-4 text-primary" />
                Temporary Password:
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-foreground bg-background/80 px-2 py-0.5 rounded border border-border/60">
                  {tempPassword}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={() => handleCopy(tempPassword, 'Password')}
                >
                  {copiedField === 'Password' ? <CheckIcon className="w-3.5 h-3.5 text-emerald-500" /> : <DocumentDuplicateIcon className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                <DevicePhoneMobileIcon className="w-4 h-4 text-primary" />
                Portal URL:
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[11px] text-muted-foreground truncate max-w-[170px]">
                  {portalUrl}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={() => handleCopy(portalUrl, 'Portal URL')}
                >
                  {copiedField === 'Portal URL' ? <CheckIcon className="w-3.5 h-3.5 text-emerald-500" /> : <DocumentDuplicateIcon className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          </div>

          {/* WhatsApp Message Preview Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider text-[10px]">WhatsApp Message Preview</span>
              <button
                type="button"
                className="text-primary hover:underline flex items-center gap-1 text-[11px]"
                onClick={() => handleCopy(inviteMessage, 'Invitation Message')}
              >
                {copiedField === 'Invitation Message' ? (
                  <CheckIcon className="w-3 h-3 text-emerald-500" />
                ) : (
                  <DocumentDuplicateIcon className="w-3 h-3" />
                )}
                <span>Copy Full Text</span>
              </button>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 text-xs font-sans whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed">
              {inviteMessage}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <Button
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 text-sm shadow-md transition-all active:scale-[0.99]"
              onClick={handleOpenWhatsApp}
              disabled={isLoading || !cleanPhone}
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>
              <span>{cleanPhone ? 'Open WhatsApp & Send Invite' : 'No Phone Available'}</span>
              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 text-xs font-semibold gap-1.5"
                onClick={() => handleCopy(inviteMessage, 'Invitation Text')}
              >
                <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                <span>Copy Message</span>
              </Button>
              <Button
                variant="ghost"
                className="text-xs text-muted-foreground"
                onClick={() => onOpenChange(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
