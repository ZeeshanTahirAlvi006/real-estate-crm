import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
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
  const navigate = useNavigate()

  React.useEffect(() => {
    if (initialCredentials) {
      setCredentials(initialCredentials)
      return
    }
    if (open && contact?.id) {
      generateInvite({ contactId: contact.id })
        .unwrap()
        .then((res) => setCredentials(res))
        .catch(() => toast.error('Could not generate portal invitation'))
    }
  }, [open, contact?.id, initialCredentials, generateInvite])

  if (!contact) return null

  const portalUrl = credentials?.portalUrl || `${window.location.origin}/portal`
  const loginEmail = credentials?.portalEmail || contact.email || 'client@portal.proppulse.com'
  const tempPassword = credentials?.temporaryPassword || 'Client!123'
  const cleanPhone = (contact.phone || '').replace(/\D/g, '')

  const defaultInviteMessage = `Hello ${contact.firstName || 'there'},

Your client portal account is active. You can track properties, transaction milestones, and documents:

Portal URL: ${portalUrl}
Email: ${loginEmail}
Temporary Password: ${tempPassword}`

  const inviteMessage = credentials?.whatsappInviteMessage || defaultInviteMessage

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(label)
    toast.success(`${label} copied`)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleOpenWhatsApp = () => {
    if (!cleanPhone) {
      toast.error('Contact does not have a phone number')
      return
    }
    onOpenChange(false)
    navigate(`/inbox?contactId=${contact.id}&channel=whatsapp&prefillText=${encodeURIComponent(inviteMessage)}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 bg-white dark:bg-[#254238] border border-[#D8E2D6] dark:border-[#618764] rounded-lg shadow-2xl">
        <DialogHeader className="space-y-1 text-left">
          <DialogTitle className="text-lg font-bold text-[#273338] dark:text-white">
            Client Portal Credentials
          </DialogTitle>
          <DialogDescription className="text-xs text-[#4A5D54] dark:text-[#C2D6C7]">
            Send portal login credentials and access link to {contact.firstName} {contact.lastName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Credentials Box */}
          <div className="rounded-md border border-[#D8E2D6] dark:border-[#618764] bg-[#F5F7F4] dark:bg-[#1A2E26] p-3.5 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[#4A5D54] dark:text-[#C2D6C7] font-medium">
                <MaterialIcon name="mail" size={16} />
                Login Email:
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-semibold text-[#273338] dark:text-white">{loginEmail}</span>
                <button
                  type="button"
                  className="p-1 rounded text-[#75887E] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white transition-colors cursor-pointer"
                  onClick={() => handleCopy(loginEmail, 'Email')}
                  title="Copy email"
                >
                  <MaterialIcon name={copiedField === 'Email' ? 'check' : 'content_copy'} size={15} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[#4A5D54] dark:text-[#C2D6C7] font-medium">
                <MaterialIcon name="key" size={16} />
                Temporary Password:
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-semibold text-[#273338] dark:text-white px-2 py-0.5 rounded bg-white dark:bg-[#172D23] border border-[#D8E2D6] dark:border-[#618764]/60">
                  {tempPassword}
                </span>
                <button
                  type="button"
                  className="p-1 rounded text-[#75887E] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white transition-colors cursor-pointer"
                  onClick={() => handleCopy(tempPassword, 'Password')}
                  title="Copy password"
                >
                  <MaterialIcon name={copiedField === 'Password' ? 'check' : 'content_copy'} size={15} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[#4A5D54] dark:text-[#C2D6C7] font-medium">
                <MaterialIcon name="link" size={16} />
                Portal URL:
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[11px] text-[#75887E] dark:text-[#A0B2A6] truncate max-w-[170px]">
                  {portalUrl}
                </span>
                <button
                  type="button"
                  className="p-1 rounded text-[#75887E] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white transition-colors cursor-pointer"
                  onClick={() => handleCopy(portalUrl, 'Portal URL')}
                  title="Copy portal URL"
                >
                  <MaterialIcon name={copiedField === 'Portal URL' ? 'check' : 'content_copy'} size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Message Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-[#4A5D54] dark:text-[#C2D6C7]">
              <span className="font-semibold text-xs">Message Preview</span>
              <button
                type="button"
                className="hover:underline flex items-center gap-1 text-xs cursor-pointer text-[#2B5748] dark:text-[#9CB080]"
                onClick={() => handleCopy(inviteMessage, 'Message')}
              >
                <MaterialIcon name={copiedField === 'Message' ? 'check' : 'content_copy'} size={13} />
                <span>Copy Message</span>
              </button>
            </div>
            <div className="p-3 rounded-md bg-[#F5F7F4] dark:bg-[#1A2E26] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white text-xs font-mono whitespace-pre-wrap max-h-32 overflow-y-auto leading-relaxed">
              {inviteMessage}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              className="w-full h-10 bg-[#9CB080] hover:bg-[#B2C696] text-[#1A2E26] font-extrabold rounded-md flex items-center justify-center gap-2 text-sm transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
              onClick={handleOpenWhatsApp}
              disabled={isLoading || !cleanPhone}
            >
              <MaterialIcon name="send" size={16} />
              <span>{cleanPhone ? 'Open in App Inbox' : 'No Phone Available'}</span>
            </button>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                className="px-3 py-1.5 text-xs font-medium text-[#4A5D54] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white transition-colors cursor-pointer"
                onClick={() => onOpenChange(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
