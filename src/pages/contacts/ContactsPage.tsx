import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PlusIcon, MagnifyingGlassIcon, PhoneIcon } from '@heroicons/react/24/outline'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useGetContactsQuery, useCreateContactMutation, useDeleteContactMutation } from '@/store/api/contactsApi'
import { useAppDispatch } from '@/store/hooks'
import { openDialer, startDialingSession } from '@/store/slices/dialerSlice'
import { ContactForm } from './components/ContactForm'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { cn } from '@/lib/utils'

function scoreColor(score: number) {
  if (score >= 80) return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
  if (score >= 60) return 'bg-blue-500/15 text-blue-500 border-blue-500/30'
  if (score >= 40) return 'bg-amber-500/15 text-amber-500 border-amber-500/30'
  return 'bg-red-500/15 text-red-500 border-red-500/30'
}

export function ContactsPage() {
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, isLoading } = useGetContactsQuery({ search, page, limit: 25, source: sourceFilter })
  const [createContact] = useCreateContactMutation()
  const [deleteContact, { isLoading: deleting }] = useDeleteContactMutation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const handleCallContact = (e: React.MouseEvent, c: { id: string; firstName: string; lastName: string; phone: string }) => {
    e.stopPropagation()
    dispatch(openDialer({ lineCount: 1 }))
    dispatch(
      startDialingSession({
        targets: [{ id: c.id, name: `${c.firstName} ${c.lastName}`, phone: c.phone }],
      })
    )
  }

  const handleCreate = async (formData: Record<string, unknown>) => {
    try {
      await createContact(formData).unwrap()
      toast.success('Contact created successfully')
      setShowCreate(false)
    } catch (err: any) {
      if (err?.status === 409) {
        toast.error('Contact exists: A contact with matching information already exists')
      } else {
        toast.error('Failed to create contact')
      }
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteContact(deleteId).unwrap()
      toast.success('Contact deleted')
      setDeleteId(null)
    } catch { toast.error('Failed to delete contact') }
  }

  const totalPages = Math.ceil((data?.total ?? 0) / 25)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts"
        description={`${data?.total ?? 0} total contacts`}
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <PlusIcon className="mr-2 h-4 w-4" /> Add Contact
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search contacts..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="pl-9" />
        </div>
        <Select value={sourceFilter} onValueChange={v => { if (v) setSourceFilter(v); setPage(1) }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Lead Source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="Zillow">Zillow</SelectItem>
            <SelectItem value="Meta Ads">Meta Ads</SelectItem>
            <SelectItem value="Google Ads">Google Ads</SelectItem>
            <SelectItem value="Realtor.com">Realtor.com</SelectItem>
            <SelectItem value="Website">Website</SelectItem>
            <SelectItem value="Referral">Referral</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-[250px]">Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.contacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground text-sm">
                    No contacts found matching the selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                data?.contacts.map(c => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => navigate(`/contacts/${c.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">{c.firstName[0]}{c.lastName[0]}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{c.firstName} {c.lastName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.phone}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{c.email}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{c.leadSource}</Badge></TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn('text-xs font-bold', scoreColor(c.leadScore))}>{c.leadScore}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">{c.tags.slice(0, 2).map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary hover:bg-primary/10 hover:text-primary"
                          onClick={(e) => handleCallContact(e, c)}
                          title={`Call ${c.firstName}`}
                        >
                          <PhoneIcon className="h-4 w-4 mr-1" />
                          Call
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteId(c.id)
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
          </div>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Add New Contact</DialogTitle></DialogHeader>
          <ContactForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} />
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Contact" description="Are you sure you want to delete this contact? This action cannot be undone." confirmLabel="Delete" onConfirm={handleDelete} loading={deleting} />
    </div>
  )
}
