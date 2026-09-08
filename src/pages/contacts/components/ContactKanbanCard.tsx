import { useRef, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Contact, ContactStatus } from '@/types'

interface ContactKanbanCardProps {
  contact: Contact
  onEdit: (c: Contact) => void
  onCreds: (c: Contact) => void
  onDelete: (id: string) => void
  onMoveStatus?: (id: string, newStatus: ContactStatus) => void
  currentStatusGroup?: string
}

function scoreBadgeStyle(score: number) {
  if (score >= 80) return 'border-[#9CB080] text-[#1A2E26] bg-[#9CB080] font-black'
  if (score >= 60) return 'border-[#618764] text-[#2B5748] dark:text-[#A8D5AE] bg-[#618764]/25 font-bold'
  if (score >= 40) return 'border-amber-500/40 text-amber-800 dark:text-amber-300 bg-amber-500/15 font-bold'
  return 'border-red-500/40 text-red-700 dark:text-red-300 bg-red-500/15 font-bold'
}

function tagBadgeStyle(tag: string) {
  const lower = tag.toLowerCase()
  if (lower.includes('buyer') || lower.includes('inbound')) {
    return 'border-[#9CB080]/40 text-[#2B5748] dark:text-[#9CB080] bg-[#9CB080]/15'
  }
  if (lower.includes('investor') || lower.includes('vip') || lower.includes('commercial')) {
    return 'border-[#618764]/60 text-[#2B5748] dark:text-[#A8D5AE] bg-[#618764]/25'
  }
  return 'border-[#D8E2D6] dark:border-[#618764]/40 text-[#273338] dark:text-[#E2ECE4] bg-[#EDF2EB] dark:bg-[#1A2E26]'
}

export function ContactKanbanCard({
  contact,
  onEdit,
  onCreds,
  onDelete,
  onMoveStatus,
  currentStatusGroup,
}: ContactKanbanCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showMoveMenu, setShowMoveMenu] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!ref.current) return
    return draggable({
      element: ref.current,
      getInitialData: () => ({ contactId: contact.id, contact }),
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false),
    })
  }, [contact])

  const handleWhatsAppCall = (e: React.MouseEvent) => {
    e.stopPropagation()
    const clean = (contact.phone || '').replace(/\D/g, '')
    if (clean) {
      window.open(`https://web.whatsapp.com/send?phone=${clean}`, '_blank')
    } else {
      toast.error('No phone number available for this contact')
    }
  }

  const statuses: { id: ContactStatus; label: string }[] = [
    { id: 'active', label: 'Active' },
    { id: 'inactive', label: 'Inactive' },
    { id: 'do_not_contact', label: 'Do Not Contact' },
    { id: 'archived', label: 'Archived' },
  ]

  return (
    <div
      ref={ref}
      onClick={() => navigate(`/contacts/${contact.id}`)}
      className={cn(
        'group relative flex flex-col p-3.5 rounded-xl bg-white dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/60',
        'shadow-xs hover:shadow-md hover:border-[#9CB080] dark:hover:border-[#9CB080] transition-all duration-200 cursor-pointer select-none',
        isDragging && 'opacity-40 rotate-1 shadow-lg border-[#9CB080]'
      )}
    >
      {/* Top Header: Avatar, Name, Score Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <Avatar className="h-8 w-8 rounded-full border border-[#D8E2D6] dark:border-[#618764] shrink-0">
            <AvatarFallback className="bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#2B5748] dark:text-[#9CB080] text-xs font-bold">
              {contact.firstName?.[0] || ''}{contact.lastName?.[0] || ''}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-[#273338] dark:text-white truncate group-hover:text-[#2B5748] dark:group-hover:text-[#9CB080] transition-colors">
              {contact.firstName} {contact.lastName}
            </h4>
            <span className="text-[11px] font-medium text-[#75887E] dark:text-[#A0B2A6] truncate block">
              {contact.leadSource || 'Direct'}
            </span>
          </div>
        </div>

        {/* Lead Score Pill */}
        <span
          className={cn(
            'inline-flex items-center justify-center min-w-[28px] px-1.5 py-0.5 rounded text-[11px] border shrink-0',
            scoreBadgeStyle(contact.leadScore)
          )}
          title={`Lead Score: ${contact.leadScore}`}
        >
          {contact.leadScore}
        </span>
      </div>

      {/* Middle Contact Details */}
      <div className="mt-2.5 space-y-1 text-xs">
        {/* Phone / WhatsApp Call */}
        {contact.phone ? (
          <button
            type="button"
            onClick={handleWhatsAppCall}
            className="flex items-center gap-1.5 text-[#4A5D54] dark:text-[#C2D6C7] hover:text-[#008069] dark:hover:text-[#00a884] transition-colors cursor-pointer w-full text-left truncate group/call"
            title="Call on WhatsApp Web"
          >
            <MaterialIcon name="call" size={14} className="text-emerald-600 dark:text-emerald-400 group-hover/call:scale-110 transition-transform shrink-0" />
            <span className="truncate group-hover/call:underline font-medium">{contact.phone}</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 text-[#75887E] dark:text-[#A0B2A6]">
            <MaterialIcon name="call" size={14} className="opacity-50 shrink-0" />
            <span className="text-[11px]">—</span>
          </div>
        )}

        {/* Email */}
        {contact.email ? (
          <div className="flex items-center gap-1.5 text-[#75887E] dark:text-[#A0B2A6] truncate" title={contact.email}>
            <MaterialIcon name="mail" size={14} className="shrink-0" />
            <span className="truncate text-[11px]">{contact.email}</span>
          </div>
        ) : null}
      </div>

      {/* Tags */}
      {contact.tags && contact.tags.length > 0 && (
        <div className="mt-2.5 flex items-center gap-1 flex-wrap">
          {contact.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className={cn(
                'text-[10px] px-2 py-0.5 rounded border font-medium truncate max-w-[120px]',
                tagBadgeStyle(t)
              )}
            >
              {t}
            </span>
          ))}
          {contact.tags.length > 3 && (
            <span className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] font-bold">
              +{contact.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Card Actions Footer */}
      <div className="mt-3 pt-2 border-t border-[#D8E2D6]/80 dark:border-[#618764]/30 flex items-center justify-between gap-1">
        {/* Move Status Menu for Mobile / Click */}
        {onMoveStatus && (
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setShowMoveMenu(!showMoveMenu)
              }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-[#4A5D54] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white bg-[#EDF2EB]/70 dark:bg-[#1A2E26] hover:bg-[#D8E2D6] dark:hover:bg-[#254238] transition-colors cursor-pointer"
              title="Move contact status"
            >
              <MaterialIcon name="drive_file_move" size={13} />
              <span>Move</span>
            </button>

            {showMoveMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 bottom-full mb-1 w-36 rounded-lg bg-white dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] shadow-lg py-1 z-30 text-xs"
              >
                <div className="px-2.5 py-1 text-[10px] font-bold text-[#75887E] dark:text-[#A0B2A6] uppercase tracking-wider border-b border-[#D8E2D6] dark:border-[#618764]/40">
                  Move To
                </div>
                {statuses.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    disabled={s.id === contact.status || s.id === currentStatusGroup}
                    onClick={() => {
                      onMoveStatus(contact.id, s.id)
                      setShowMoveMenu(false)
                    }}
                    className={cn(
                      'w-full text-left px-2.5 py-1.5 hover:bg-[#EDF2EB] dark:hover:bg-[#1A2E26] transition-colors flex items-center justify-between',
                      (s.id === contact.status || s.id === currentStatusGroup)
                        ? 'opacity-40 cursor-not-allowed'
                        : 'cursor-pointer text-[#273338] dark:text-white'
                    )}
                  >
                    <span>{s.label}</span>
                    {s.id === contact.status && (
                      <MaterialIcon name="check" size={13} className="text-[#9CB080]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons: Edit, Creds, Call, Delete */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(contact)
            }}
            className="p-1.5 rounded text-[#4A5D54] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white hover:bg-[#EDF2EB] dark:hover:bg-[#1A2E26] transition-colors cursor-pointer"
            title="Edit contact"
          >
            <MaterialIcon name="edit" size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onCreds(contact)
            }}
            className="p-1.5 rounded text-[#2B5748] dark:text-[#9CB080] hover:bg-[#9CB080]/15 transition-colors cursor-pointer"
            title="Generate portal credentials"
          >
            <MaterialIcon name="key" size={14} />
          </button>
          <button
            type="button"
            onClick={handleWhatsAppCall}
            className="p-1.5 rounded text-[#008069] dark:text-[#00a884] hover:bg-[#008069]/10 transition-colors cursor-pointer"
            title="Call on WhatsApp Web"
          >
            <MaterialIcon name="call" size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(contact.id)
            }}
            className="p-1.5 rounded text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
            title="Delete contact"
          >
            <MaterialIcon name="delete" size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
