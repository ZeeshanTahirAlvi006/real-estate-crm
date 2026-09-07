import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  useGetContactsQuery,
  useCreateContactMutation,
  useUpdateContactMutation,
  useDeleteContactMutation,
} from '@/store/api/contactsApi'
import { ContactForm } from './components/ContactForm'
import { SharePortalModal } from './components/SharePortalModal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { cn } from '@/lib/utils'
import type { Contact, PortalCredentials } from '@/types'

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

export function ContactsPage() {
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [confirmCredsContact, setConfirmCredsContact] = useState<Contact | null>(null)
  const [portalModalContact, setPortalModalContact] = useState<Contact | null>(null)
  const [portalModalCredentials, setPortalModalCredentials] = useState<PortalCredentials | null>(null)

  const { data, isLoading } = useGetContactsQuery({ search, page, limit: 25, source: sourceFilter })
  const [createContact] = useCreateContactMutation()
  const [updateContact] = useUpdateContactMutation()
  const [deleteContact, { isLoading: deleting }] = useDeleteContactMutation()
  const navigate = useNavigate()

  const handleCreate = async (formData: Record<string, unknown>) => {
    try {
      const created = await createContact(formData).unwrap()
      toast.success('Contact created')
      setShowCreate(false)
      if (created) {
        setPortalModalContact(created)
        setPortalModalCredentials(created.portalCredentials || null)
      }
    } catch (err: any) {
      if (err?.status === 409) {
        toast.error('Contact already exists with matching details')
      } else {
        toast.error('Failed to create contact')
      }
    }
  }

  const handleUpdate = async (formData: Record<string, unknown>) => {
    if (!editingContact) return
    try {
      await updateContact({ id: editingContact.id, data: formData }).unwrap()
      toast.success('Contact updated')
      setEditingContact(null)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to update contact')
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteContact(deleteId).unwrap()
      toast.success('Contact deleted')
      setDeleteId(null)
    } catch {
      toast.error('Failed to delete contact')
    }
  }

  const handleExportCSV = () => {
    if (!data?.contacts || data.contacts.length === 0) {
      toast.error('No contacts available to export')
      return
    }
    const headers = ['First Name', 'Last Name', 'Phone', 'Email', 'Source', 'Score', 'Tags']
    const rows = data.contacts.map((c) => [
      `"${c.firstName || ''}"`,
      `"${c.lastName || ''}"`,
      `"${c.phone || ''}"`,
      `"${c.email || ''}"`,
      `"${c.leadSource || ''}"`,
      c.leadScore ?? 0,
      `"${(c.tags || []).join('; ')}"`,
    ])
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `contacts_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('Contacts exported')
  }

  const totalPages = Math.ceil((data?.total ?? 0) / 25)

  return (
    <div className="-m-4 sm:-m-6 min-h-[calc(100vh-4rem)] p-4 sm:p-6 pb-20 md:pb-8 bg-[#F5F7F4] dark:bg-[#1E282D] space-y-5 transition-colors duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#273338] dark:text-white">
            Contacts
          </h1>
          <p className="mt-1 text-sm text-[#4A5D54] dark:text-[#A0B2A6]">
            Directory of client records, contact details, and portal access.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center justify-center px-3.5 py-2 text-sm font-semibold rounded-md border border-[#D8E2D6] dark:border-[#618764] bg-white dark:bg-[#1A2E26] text-[#273338] dark:text-[#E2ECE4] hover:bg-[#EDF2EB] dark:hover:bg-[#254238] transition-colors cursor-pointer shadow-xs"
            title="Export contacts as CSV"
          >
            <MaterialIcon name="download" size={18} className="mr-2 text-[#4A5D54] dark:text-[#A0B2A6]" />
            Export CSV
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-extrabold rounded-md bg-[#9CB080] hover:bg-[#B2C696] text-[#1A2E26] transition-colors cursor-pointer shadow-sm"
            title="Add contact"
          >
            <MaterialIcon name="person_add" size={18} className="mr-2" />
            Add Contact
          </button>
        </div>
      </div>

      {/* Search & Filter Bar (Surface Card) */}
      <div className="p-3 sm:p-4 rounded-lg border border-[#D8E2D6] dark:border-[#618764] bg-white dark:bg-[#254238] flex flex-col md:flex-row gap-3 items-center justify-between shadow-md shadow-black/10">
        <div className="relative flex-1 w-full">
          <MaterialIcon
            name="search"
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#75887E] dark:text-[#A0B2A6]"
          />
          <input
            type="text"
            placeholder="Search contacts by name, email, or phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-md bg-[#F5F7F4] dark:bg-[#1A2E26] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white placeholder-[#75887E] dark:placeholder-[#A0B2A6] focus:outline-none focus:border-[#9CB080] focus:ring-1 focus:ring-[#9CB080] transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Select
            value={sourceFilter}
            onValueChange={(v) => {
              if (v) setSourceFilter(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full md:w-44 bg-[#F5F7F4] dark:bg-[#1A2E26] border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white text-sm">
              <SelectValue placeholder="Lead Source" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-[#1A2E26] border-[#D8E2D6] dark:border-[#618764]">
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="Zillow">Zillow</SelectItem>
              <SelectItem value="Meta Ads">Meta Ads</SelectItem>
              <SelectItem value="Google Ads">Google Ads</SelectItem>
              <SelectItem value="Realtor.com">Realtor.com</SelectItem>
              <SelectItem value="Website">Website</SelectItem>
              <SelectItem value="Referral">Referral</SelectItem>
            </SelectContent>
          </Select>

          <div className="text-xs font-bold px-3 py-2 rounded-md bg-[#EDF2EB] dark:bg-[#1A2E26] border border-[#D8E2D6] dark:border-[#618764] text-[#2B5748] dark:text-[#9CB080] whitespace-nowrap">
            {data?.total ?? 0} Contacts
          </div>
        </div>
      </div>

      {/* Table Container (Surface Card) */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg bg-[#EDF2EB] dark:bg-[#254238]" />
          ))}
        </div>
      ) : (
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
                {data?.contacts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="h-32 text-center text-[#75887E] dark:text-[#A0B2A6] text-sm">
                      No contacts found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  data?.contacts.map((c, idx) => (
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
                        <div className="flex items-center gap-1.5 text-[#4A5D54] dark:text-[#E2ECE4]">
                          <MaterialIcon name="call" size={15} className="text-[#75887E] dark:text-[#A0B2A6]" />
                          <span>{c.phone || '—'}</span>
                        </div>
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
                              setEditingContact(c)
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
                              setConfirmCredsContact(c)
                            }}
                            title="Generate portal credentials"
                          >
                            <MaterialIcon name="key" size={15} />
                            <span>Creds</span>
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
                              setDeleteId(c.id)
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
              Showing {data?.contacts.length ? (page - 1) * 25 + 1 : 0}–{Math.min(page * 25, data?.total ?? 0)} of {data?.total ?? 0} contacts
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center justify-center p-1.5 rounded border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-[#E2ECE4] bg-white dark:bg-[#254238] hover:bg-[#EDF2EB] dark:hover:bg-[#2E5246] disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Next page"
              >
                <MaterialIcon name="chevron_right" size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share VIP Portal Modal */}
      <SharePortalModal
        open={!!portalModalContact}
        onOpenChange={(open) => {
          if (!open) {
            setPortalModalContact(null)
            setPortalModalCredentials(null)
          }
        }}
        contact={portalModalContact}
        initialCredentials={portalModalCredentials}
      />

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg bg-white dark:bg-[#254238] border border-[#D8E2D6] dark:border-[#618764] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#273338] dark:text-white">
              Add Contact
            </DialogTitle>
            <DialogDescription className="text-xs text-[#4A5D54] dark:text-[#C2D6C7]">
              Enter contact details to create a new client record.
            </DialogDescription>
          </DialogHeader>
          <ContactForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingContact} onOpenChange={(open) => !open && setEditingContact(null)}>
        <DialogContent className="sm:max-w-lg bg-white dark:bg-[#254238] border border-[#D8E2D6] dark:border-[#618764] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#273338] dark:text-white">
              Edit Contact
            </DialogTitle>
            <DialogDescription className="text-xs text-[#4A5D54] dark:text-[#C2D6C7]">
              Update contact information and details.
            </DialogDescription>
          </DialogHeader>
          {editingContact && (
            <ContactForm
              contact={editingContact}
              onSubmit={handleUpdate}
              onCancel={() => setEditingContact(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Generate Credentials Confirm Dialog */}
      <ConfirmDialog
        open={!!confirmCredsContact}
        onOpenChange={(open) => !open && setConfirmCredsContact(null)}
        title="Generate Client Portal Credentials"
        description={`Create portal login credentials for ${confirmCredsContact?.firstName} ${confirmCredsContact?.lastName}.`}
        confirmLabel="Generate Credentials"
        cancelLabel="Cancel"
        variant="default"
        onConfirm={() => {
          if (confirmCredsContact) {
            const target = confirmCredsContact
            setConfirmCredsContact(null)
            setPortalModalContact(target)
            setPortalModalCredentials(target.portalCredentials || null)
          }
        }}
      />

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Contact"
        description="Permanently delete this contact record."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
