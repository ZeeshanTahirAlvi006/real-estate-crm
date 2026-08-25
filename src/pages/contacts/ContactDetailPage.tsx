import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, PhoneIcon, EnvelopeIcon, MapPinIcon } from '@heroicons/react/24/outline'
import { useGetContactByIdQuery, useGetContactActivityQuery } from '@/store/api/contactsApi'
import { useAppDispatch } from '@/store/hooks'
import { openDialer, startDialingSession } from '@/store/slices/dialerSlice'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ActivityTimeline } from './components/ActivityTimeline'
import { cn } from '@/lib/utils'

function scoreColor(score: number) {
  if (score >= 80) return 'bg-emerald-500/15 text-emerald-500'
  if (score >= 60) return 'bg-blue-500/15 text-blue-500'
  if (score >= 40) return 'bg-amber-500/15 text-amber-500'
  return 'bg-red-500/15 text-red-500'
}

export function ContactDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: contact, isLoading } = useGetContactByIdQuery(id!)
  const { data: activities } = useGetContactActivityQuery(id!)

  if (isLoading) {
    return <div className="space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
  }

  if (!contact) {
    return <div className="py-20 text-center text-muted-foreground">Contact not found</div>
  }

  const dispatch = useAppDispatch()

  const handleCall = () => {
    if (!contact) return
    dispatch(openDialer({ lineCount: 1 }))
    dispatch(
      startDialingSession({
        targets: [
          {
            id: contact.id,
            name: `${contact.firstName} ${contact.lastName}`,
            phone: contact.phone,
          },
        ],
      })
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/contacts')}>
          <ArrowLeftIcon className="h-4 w-4" />
        </Button>
        <PageHeader title={`${contact.firstName} ${contact.lastName}`} />
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
              <Button variant="default" size="sm" className="justify-start shadow-xs" onClick={handleCall}>
                <PhoneIcon className="mr-2 h-4 w-4" />
                Call Lead
              </Button>
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
                💬 Send SMS
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
    </div>
  )
}
