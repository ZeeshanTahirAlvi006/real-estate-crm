import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeftIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  PencilSquareIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import {
  useGetContactByIdQuery,
  useGetContactActivityQuery,
  useUpdateContactMutation,
} from '@/store/api/contactsApi'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ActivityTimeline } from './components/ActivityTimeline'
import { ContactForm } from './components/ContactForm'
import { SharePortalModal } from './components/SharePortalModal'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

function scoreColor(score: number) {
  if (score >= 80) return 'bg-emerald-500/15 text-emerald-500'
  if (score >= 60) return 'bg-blue-500/15 text-blue-500'
  if (score >= 40) return 'bg-amber-500/15 text-amber-500'
  return 'bg-red-500/15 text-red-500'
}

export function ContactDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isPortalOpen, setIsPortalOpen] = useState(false)
  const { data: contact, isLoading } = useGetContactByIdQuery(id!)
  const { data: activities } = useGetContactActivityQuery(id!)
  const [updateContact] = useUpdateContactMutation()

  const handleUpdate = async (formData: Record<string, unknown>) => {
    if (!contact) return
    try {
      await updateContact({ id: contact.id, data: formData }).unwrap()
      toast.success('Contact details updated successfully')
      setIsEditOpen(false)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to update contact')
    }
  }

  if (isLoading) {
    return <div className="space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
  }

  if (!contact) {
    return <div className="py-20 text-center text-muted-foreground">Contact not found</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/contacts')}>
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
          <PageHeader title={`${contact.firstName} ${contact.lastName}`} />
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsPortalOpen(true)}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
          >
            <SparklesIcon className="w-4 h-4" />
            <span>Share VIP Portal</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsEditOpen(true)}
            className="gap-1.5 shadow-xs font-semibold"
          >
            <PencilSquareIcon className="w-4 h-4" />
            <span>Edit Contact</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Contact Info Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                    {contact.firstName[0]}{contact.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-lg font-semibold">{contact.firstName} {contact.lastName}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={cn('font-bold', scoreColor(contact.leadScore))}>
                      Score: {contact.leadScore}
                    </Badge>
                    <Badge variant="secondary">{contact.leadSource}</Badge>
                    <Badge variant={contact.status === 'active' ? 'default' : 'secondary'}>
                      {contact.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3 text-sm">
                  <PhoneIcon className="h-4 w-4 text-muted-foreground" />
                  <span>{contact.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <EnvelopeIcon className="h-4 w-4 text-muted-foreground" />
                  <span>{contact.email}</span>
                </div>
                {contact.address && (
                  <div className="flex items-center gap-3 text-sm sm:col-span-2">
                    <MapPinIcon className="h-4 w-4 text-muted-foreground" />
                    <span>{contact.address}, {contact.city}, {contact.state} {contact.zipCode}</span>
                  </div>
                )}
              </div>
              {contact.notes && (
                <div className="mt-4 rounded-lg bg-muted/50 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{contact.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline activities={activities ?? []} />
            </CardContent>
          </Card>
        </div>

        {/* Right: Sidebar info */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {contact.phone ? (
                <Button
                  variant="default"
                  size="sm"
                  className="justify-start bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  onClick={() => window.open(`https://wa.me/${contact.phone.replace(/\D/g, '')}`, '_blank')}
                  title="Open WhatsApp Voice Call & Chat"
                >
                  <PhoneIcon className="mr-2 h-4 w-4" />
                  WhatsApp Call
                </Button>
              ) : (
                <Button variant="secondary" size="sm" disabled className="justify-start">
                  No Phone
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => {
                  window.location.href = `mailto:${contact.email}`
                }}
              >
                <EnvelopeIcon className="mr-2 h-4 w-4" />
                Email
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start col-span-2"
                onClick={() => navigate('/inbox')}
              >
                💬 Open Inbox Thread
              </Button>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Tags</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {contact.tags.map(t => <Badge key={t} variant="secondary">{t}</Badge>)}
              </div>
            </CardContent>
          </Card>

          {/* VIP Client Portal Card */}
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <SparklesIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>VIP Client Portal</span>
                </CardTitle>
                <Badge
                  variant="outline"
                  className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold"
                >
                  {contact.portalEnabled ? 'Active' : 'Ready'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <p className="text-muted-foreground">
                Self-service client portal for {contact.firstName} to track transactions, search properties, and view closing milestones.
              </p>
              <div className="p-2.5 rounded-lg bg-background/80 border border-border/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Portal Email:</span>
                  <span className="font-mono font-bold text-foreground truncate max-w-[140px]">
                    {contact.portalAccessEmail || contact.email || 'Auto-Provisioned'}
                  </span>
                </div>
              </div>
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 text-xs shadow-xs"
                onClick={() => setIsPortalOpen(true)}
              >
                <span>Share VIP Portal via WhatsApp</span>
              </Button>
            </CardContent>
          </Card>

          {/* Assigned Agent */}
          {contact.assignedAgentName && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Assigned Agent</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {contact.assignedAgentName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{contact.assignedAgentName}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Share VIP Portal Modal */}
      <SharePortalModal
        open={isPortalOpen}
        onOpenChange={setIsPortalOpen}
        contact={contact}
      />

      {/* Edit Contact Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Contact Details</DialogTitle>
          </DialogHeader>
          <ContactForm
            contact={contact}
            onSubmit={handleUpdate}
            onCancel={() => setIsEditOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
