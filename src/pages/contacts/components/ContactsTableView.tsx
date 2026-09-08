import { useNavigate } from 'react-router-dom'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Contact } from '@/types'

interface ContactsTableViewProps {
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

export function ContactsTableView({
  contacts,
  total,
  page,
  limit,
  isLoading,
  onPageChange,
  onEditContact,
  onCredsContact,
  onDeleteContact,
}: ContactsTableViewProps) {
  const navigate = useNavigate()
  const totalPages = Math.ceil(total / limit)

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(7)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg bg-[#EDF2EB] dark:bg-[#254238]" />
        ))}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-[#D8E2D6] dark:border-[#618764] overflow-hidden bg-white dark:bg-[#254238] shadow-md shadow-black/10">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#EDF2EB] dark:bg-[#1A2E26] border-b border-[#D8E2D6] dark:border-[#618764]">
              <th className="py-3.5 px-4 text-xs font-bold tracking-wider text-[#4A5D54] dark:text-[#C2D6C7]">
                NAME
              </th>
              <th className="py-3.5 px-4 text-xs font-bold tracking-wider text-[#4A5D54] dark:text-[#C2D6C7]">
                PHONE
              </th>
              <th className="py-3.5 px-4 text-xs font-bold tracking-wider text-[#4A5D54] dark:text-[#C2D6C7]">
                EMAIL
              </th>
              <th className="py-3.5 px-4 text-xs font-bold tracking-wider text-[#4A5D54] dark:text-[#C2D6C7]">
                SOURCE
              </th>
              <th className="py-3.5 px-4 text-xs font-bold tracking-wider text-[#4A5D54] dark:text-[#C2D6C7] text-center">
                SCORE
              </th>
              <th className="py-3.5 px-4 text-xs font-bold tracking-wider text-[#4A5D54] dark:text-[#C2D6C7]">
                TAGS
              </th>
              <th className="py-3.5 px-4 text-xs font-bold tracking-wider text-[#4A5D54] dark:text-[#C2D6C7] text-right">
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-[#D8E2D6] dark:divide-[#618764]/30">
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={7} className="h-32 text-center text-[#75887E] dark:text-[#A0B2A6] text-sm">
                  No contacts found matching the selected filters.
                </td>
              </tr>
            ) : (
              contacts.map((c, idx) => (
                <tr
                  key={c.id}
                  className={cn(
                    'cursor-pointer transition-colors hover:bg-[#EDF2EB]/80 dark:hover:bg-[#2E5246]',
                    idx % 2 === 1 ? 'dark:bg-[#203930]/40' : 'dark:bg-transparent'
                  )}
                  onClick={() => navigate(`/contacts/${c.id}`)}
                >
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 rounded-full border border-[#D8E2D6] dark:border-[#618764]">
                        <AvatarFallback className="bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#2B5748] dark:text-[#9CB080] text-xs font-bold">
                          {c.firstName?.[0] || ''}{c.lastName?.[0] || ''}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-semibold text-[#273338] dark:text-white">
                        {c.firstName} {c.lastName}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    {c.phone ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          const clean = c.phone.replace(/\D/g, '')
                          window.open(`https://web.whatsapp.com/send?phone=${clean}`, '_blank')
                        }}
                        className="inline-flex items-center gap-1.5 text-[#4A5D54] dark:text-[#E2ECE4] hover:text-[#008069] dark:hover:text-[#00a884] transition-colors cursor-pointer group"
                        title="Call on WhatsApp Web"
                      >
                        <MaterialIcon name="call" size={15} className="text-emerald-600 group-hover:scale-110 transition-transform" />
                        <span className="group-hover:underline">{c.phone}</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[#75887E] dark:text-[#A0B2A6]">
                        <MaterialIcon name="call" size={15} className="text-[#75887E] dark:text-[#A0B2A6]" />
                        <span>—</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 text-[#75887E] dark:text-[#A0B2A6]">
                      <MaterialIcon name="mail" size={15} className="text-[#75887E] dark:text-[#A0B2A6]" />
                      <span className="truncate max-w-[200px]">{c.email || '—'}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-block px-2.5 py-0.5 text-xs font-medium rounded border border-[#D8E2D6] dark:border-[#618764] bg-[#F5F7F4] dark:bg-[#1A2E26] text-[#4A5D54] dark:text-[#C2D6C7]">
                      {c.leadSource || 'Direct'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={cn(
                        'inline-flex items-center justify-center min-w-[34px] px-2 py-0.5 rounded text-xs border',
                        scoreBadgeStyle(c.leadScore)
                      )}
                    >
                      {c.leadScore}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex gap-1.5 flex-wrap">
                      {(c.tags || []).slice(0, 2).map((t) => (
                        <span
                          key={t}
                          className={cn(
                            'text-xs px-2.5 py-0.5 rounded border font-medium',
                            tagBadgeStyle(t)
                          )}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-[#273338] dark:text-[#E2ECE4] bg-transparent hover:bg-[#EDF2EB] dark:bg-[#1A2E26]/50 dark:hover:bg-[#1A2E26] border border-transparent dark:border-[#618764]/40 transition-colors cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          onEditContact(c)
                        }}
                        title="Edit contact"
                      >
                        <MaterialIcon name="edit" size={15} />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-[#2B5748] dark:text-[#9CB080] hover:bg-[#9CB080]/15 dark:bg-[#9CB080]/10 dark:hover:bg-[#9CB080]/25 border border-[#9CB080]/30 transition-colors cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          onCredsContact(c)
                        }}
                        title="Generate portal credentials"
                      >
                        <MaterialIcon name="key" size={15} />
                        <span>Creds</span>
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-[#008069] dark:text-[#00a884] hover:bg-[#008069]/10 border border-[#008069]/30 transition-colors cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          const clean = (c.phone || '').replace(/\D/g, '')
                          if (clean) {
                            window.open(`https://web.whatsapp.com/send?phone=${clean}`, '_blank')
                          } else {
                            toast.error('No phone number available for this contact')
                          }
                        }}
                        title="Call on WhatsApp Web"
                      >
                        <MaterialIcon name="call" size={15} />
                        <span>Call</span>
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-[#618764] dark:text-[#A8D5AE] hover:bg-[#618764]/15 dark:bg-[#618764]/15 dark:hover:bg-[#618764]/30 border border-[#618764]/40 transition-colors cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate('/inbox')
                        }}
                        title="Message contact"
                      >
                        <MaterialIcon name="chat" size={15} />
                        <span>Message</span>
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-red-600 dark:text-red-300 hover:bg-red-500/15 dark:bg-red-500/10 dark:hover:bg-red-500/25 border border-red-500/30 transition-colors cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteContact(c.id)
                        }}
                        title="Delete contact"
                      >
                        <MaterialIcon name="delete" size={15} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-4 py-3 flex items-center justify-between border-t border-[#D8E2D6] dark:border-[#618764] bg-[#EDF2EB]/60 dark:bg-[#1A2E26]">
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
