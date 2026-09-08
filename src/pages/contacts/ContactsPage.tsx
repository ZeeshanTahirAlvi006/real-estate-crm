import { useState } from 'react'
import { toast } from 'sonner'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import { ContactsTableView } from './components/ContactsTableView'
import { ContactsGridView } from './components/ContactsGridView'
import { TableGridToggleButton, type TableGridViewMode } from '@/components/shared/TableGridToggle'
import type { Contact, PortalCredentials } from '@/types'

export function ContactsPage() {
  const [view, setView] = useState<TableGridViewMode>(() => {
    const saved = localStorage.getItem('crm_contacts_view')
    return saved === 'grid' ? 'grid' : 'table'
  })
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [confirmCredsContact, setConfirmCredsContact] = useState<Contact | null>(null)
  const [portalModalContact, setPortalModalContact] = useState<Contact | null>(null)
  const [portalModalCredentials, setPortalModalCredentials] = useState<PortalCredentials | null>(null)

  // 25 contacts each page for both Table and Grid views
  const { data, isLoading } = useGetContactsQuery({
    search,
    page,
    limit: 25,
    source: sourceFilter,
  })

  const [createContact] = useCreateContactMutation()
  const [updateContact] = useUpdateContactMutation()
  const [deleteContact, { isLoading: deleting }] = useDeleteContactMutation()

  const handleViewChange = (newView: TableGridViewMode) => {
    setView(newView)
    localStorage.setItem('crm_contacts_view', newView)
  }

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
    const headers = ['First Name', 'Last Name', 'Phone', 'Email', 'Source', 'Score', 'Status', 'Tags']
    const rows = data.contacts.map((c) => [
      `"${c.firstName || ''}"`,
      `"${c.lastName || ''}"`,
      `"${c.phone || ''}"`,
      `"${c.email || ''}"`,
      `"${c.leadSource || ''}"`,
      c.leadScore ?? 0,
      `"${c.status || 'active'}"`,
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

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View Switcher Toggle (Table vs Grid: 2 per row) */}
          <TableGridToggleButton
            view={view}
            onViewChange={handleViewChange}
            tableTitle="Table View (25 per page)"
            gridTitle="Grid View (2 per row, 25 per page)"
          />

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

      {/* Search & Filter Bar */}
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

      {/* Main View Area: Unified Table & Grid (2 each row) Toggleable */}
      {view === 'grid' ? (
        <ContactsGridView
          contacts={data?.contacts || []}
          total={data?.total ?? 0}
          page={page}
          limit={25}
          isLoading={isLoading}
          onPageChange={setPage}
          onEditContact={(c) => setEditingContact(c)}
          onCredsContact={(c) => setConfirmCredsContact(c)}
          onDeleteContact={(id) => setDeleteId(id)}
        />
      ) : (
        <ContactsTableView
          contacts={data?.contacts || []}
          total={data?.total ?? 0}
          page={page}
          limit={25}
          isLoading={isLoading}
          onPageChange={setPage}
          onEditContact={(c) => setEditingContact(c)}
          onCredsContact={(c) => setConfirmCredsContact(c)}
          onDeleteContact={(id) => setDeleteId(id)}
        />
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
