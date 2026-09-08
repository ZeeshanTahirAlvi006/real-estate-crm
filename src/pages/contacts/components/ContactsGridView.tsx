import { useNavigate } from 'react-router-dom'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Contact } from '@/types'

interface ContactsGridViewProps {
  contacts: Contact[]
  total: number
  page: number
  limit: number
  isLoading: boolean
  onPageChange: (newPage: number) => void
  onEditContact: (c: Contact) => void
  onCredsContact: (c: Contact) => void
  onDeleteContact: (id: string) => void
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

function statusBadgeStyle(status?: string) {
  switch (status) {
    case 'active':
      return 'border-[#9CB080]/50 bg-[#9CB080]/20 text-[#2B5748] dark:text-[#9CB080]'
    case 'inactive':
      return 'border-slate-400/40 bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300'
    case 'do_not_contact':
      return 'border-red-500/40 bg-red-500/15 text-red-700 dark:text-red-300'
    case 'archived':
      return 'border-stone-400/40 bg-stone-100 dark:bg-stone-800/50 text-stone-600 dark:text-stone-300'
    default:
      return 'border-[#9CB080]/50 bg-[#9CB080]/20 text-[#2B5748] dark:text-[#9CB080]'
  }
}

export function ContactsGridView({
  contacts,
  total,
  page,
  limit,
  isLoading,
  onPageChange,
  onEditContact,
  onCredsContact,
  onDeleteContact,
}: ContactsGridViewProps) {
  const navigate = useNavigate()
  const totalPages = Math.ceil(total / limit)

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl bg-[#EDF2EB] dark:bg-[#202B2F]" />
        ))}
      </div>
    )
  }

  if (contacts.length === 0) {
    return (
      <div className="rounded-xl border border-[#D8E2D6] dark:border-[#618764] bg-white dark:bg-[#254238] p-12 text-center shadow-xs">
        <MaterialIcon name="person_search" size={40} className="text-[#75887E]/60 dark:text-[#A0B2A6]/60 mx-auto mb-2" />
        <h3 className="text-base font-bold text-[#273338] dark:text-white">No contacts found</h3>
        <p className="mt-1 text-xs text-[#75887E] dark:text-[#A0B2A6]">
          No client records match your current search and filter settings.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 2 Contacts Each Row Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {contacts.map((contact) => (
          <div
            key={contact.id}
            onClick={() => navigate(`/contacts/${contact.id}`)}
            className="group flex flex-col justify-between p-4 rounded-xl bg-white dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/60 shadow-xs hover:shadow-md hover:border-[#9CB080] dark:hover:border-[#9CB080] transition-all duration-200 cursor-pointer"
          >
            {/* Top Row: Avatar, Name, Status, Score */}
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Avatar className="h-11 w-11 rounded-full border border-[#D8E2D6] dark:border-[#618764] shrink-0">
                    <AvatarFallback className="bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#2B5748] dark:text-[#9CB080] text-sm font-bold">
                      {contact.firstName?.[0] || ''}{contact.lastName?.[0] || ''}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold text-[#273338] dark:text-white truncate group-hover:text-[#2B5748] dark:group-hover:text-[#9CB080] transition-colors">
                      {contact.firstName} {contact.lastName}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs font-medium text-[#4A5D54] dark:text-[#A0B2A6]">
                        {contact.leadSource || 'Direct'}
                      </span>
                      <span className="text-[#D8E2D6] dark:text-[#618764]">·</span>
                      <span
                        className={cn(
                          'text-[10px] px-1.5 py-0.2 rounded border font-bold capitalize',
                          statusBadgeStyle(contact.status)
                        )}
                      >
                        {(contact.status || 'active').replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Score Pill */}
                <div className="flex flex-col items-end shrink-0">
                  <span
                    className={cn(
                      'inline-flex items-center justify-center min-w-[32px] px-2 py-0.5 rounded text-xs border',
                      scoreBadgeStyle(contact.leadScore)
                    )}
                    title={`Lead Score: ${contact.leadScore}`}
                  >
                    {contact.leadScore}
                  </span>
                  <span className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] mt-0.5 font-medium">
                    Score
                  </span>
                </div>
              </div>

              {/* Contact Details (Phone & Email) */}
              <div className="mt-3.5 space-y-1.5 text-xs">
                {/* WhatsApp Web Phone Link */}
                {contact.phone ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      const clean = contact.phone.replace(/\D/g, '')
                      window.open(`https://web.whatsapp.com/send?phone=${clean}`, '_blank')
                    }}
                    className="flex items-center gap-2 text-[#4A5D54] dark:text-[#C2D6C7] hover:text-[#008069] dark:hover:text-[#00a884] transition-colors cursor-pointer group/call w-full text-left truncate"
                    title="Call on WhatsApp Web"
                  >
                    <MaterialIcon
                      name="call"
                      size={15}
                      className="text-emerald-600 dark:text-emerald-400 group-hover/call:scale-110 transition-transform shrink-0"
                    />
                    <span className="font-medium group-hover/call:underline truncate">{contact.phone}</span>
                    <span className="text-[10px] text-[#008069] dark:text-[#00a884] opacity-0 group-hover/call:opacity-100 transition-opacity">
                      (WhatsApp)
                    </span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-[#75887E] dark:text-[#A0B2A6]">
                    <MaterialIcon name="call" size={15} className="opacity-50 shrink-0" />
                    <span>No phone provided</span>
                  </div>
                )}

                {/* Email Link */}
                {contact.email ? (
                  <div className="flex items-center gap-2 text-[#75887E] dark:text-[#A0B2A6] truncate" title={contact.email}>
                    <MaterialIcon name="mail" size={15} className="shrink-0" />
                    <span className="truncate">{contact.email}</span>
                  </div>
                ) : null}

                {/* Location (City, State) */}
                {(contact.city || contact.state) && (
                  <div className="flex items-center gap-2 text-[#75887E] dark:text-[#A0B2A6] truncate">
                    <MaterialIcon name="location_on" size={15} className="shrink-0" />
                    <span className="truncate">
                      {[contact.city, contact.state].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Tags */}
              {contact.tags && contact.tags.length > 0 && (
                <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                  {contact.tags.slice(0, 4).map((t) => (
                    <span
                      key={t}
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded border font-medium truncate max-w-[140px]',
                        tagBadgeStyle(t)
                      )}
                    >
                      {t}
                    </span>
                  ))}
                  {contact.tags.length > 4 && (
                    <span className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] font-bold">
                      +{contact.tags.length - 4}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Card Actions Footer */}
            <div className="mt-4 pt-2.5 border-t border-[#D8E2D6] dark:border-[#618764]/30 flex items-center justify-between gap-1">
              <span className="text-[11px] text-[#75887E] dark:text-[#A0B2A6]">
                {contact.lastContactedAt
                  ? `Contacted ${new Date(contact.lastContactedAt).toLocaleDateString()}`
                  : 'Not contacted yet'}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEditContact(contact)
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-[#273338] dark:text-[#E2ECE4] hover:bg-[#EDF2EB] dark:hover:bg-[#1A2E26] border border-[#D8E2D6] dark:border-[#618764]/40 transition-colors cursor-pointer"
                  title="Edit contact"
                >
                  <MaterialIcon name="edit" size={14} />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCredsContact(contact)
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-[#2B5748] dark:text-[#9CB080] hover:bg-[#9CB080]/15 border border-[#9CB080]/40 transition-colors cursor-pointer"
                  title="Generate portal credentials"
                >
                  <MaterialIcon name="key" size={14} />
                  <span>Creds</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    const clean = (contact.phone || '').replace(/\D/g, '')
                    if (clean) {
                      window.open(`https://web.whatsapp.com/send?phone=${clean}`, '_blank')
                    } else {
                      toast.error('No phone number available for this contact')
                    }
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-[#008069] dark:text-[#00a884] hover:bg-[#008069]/10 border border-[#008069]/40 transition-colors cursor-pointer"
                  title="Call on WhatsApp Web"
                >
                  <MaterialIcon name="call" size={14} />
                  <span>Call</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate('/inbox')
                  }}
                  className="p-1 rounded text-[#618764] dark:text-[#A8D5AE] hover:bg-[#618764]/15 border border-[#618764]/40 transition-colors cursor-pointer"
                  title="Message contact"
                >
                  <MaterialIcon name="chat" size={14} />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteContact(contact.id)
                  }}
                  className="p-1 rounded text-red-600 dark:text-red-400 hover:bg-red-500/15 border border-red-500/30 transition-colors cursor-pointer"
                  title="Delete contact"
                >
                  <MaterialIcon name="delete" size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Footer (25 contacts per page) */}
      <div className="rounded-lg px-4 py-3 flex items-center justify-between border border-[#D8E2D6] dark:border-[#618764] bg-[#EDF2EB]/60 dark:bg-[#1A2E26] shadow-xs">
        <p className="text-xs font-medium text-[#4A5D54] dark:text-[#C2D6C7]">
          Showing {contacts.length ? (page - 1) * limit + 1 : 0}–{Math.min(page * limit, total)} of {total} contacts
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="inline-flex items-center justify-center p-1.5 rounded border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-[#E2ECE4] bg-white dark:bg-[#254238] hover:bg-[#EDF2EB] dark:hover:bg-[#2E5246] disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            title="Previous page"
          >
            <MaterialIcon name="chevron_left" size={18} />
          </button>
          <span className="text-xs px-2 font-medium text-[#4A5D54] dark:text-[#C2D6C7]">
            Page {page} of {totalPages || 1}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="inline-flex items-center justify-center p-1.5 rounded border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-[#E2ECE4] bg-white dark:bg-[#254238] hover:bg-[#EDF2EB] dark:hover:bg-[#2E5246] disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            title="Next page"
          >
            <MaterialIcon name="chevron_right" size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
