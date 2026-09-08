import { useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { useGetLeadPortalQuery } from '@/store/api/dashboardApi'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  PhoneIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  SparklesIcon,
  BuildingOffice2Icon,
  ClipboardDocumentCheckIcon,
  ChatBubbleLeftEllipsisIcon,
  CalendarDaysIcon,
  HomeModernIcon,
} from '@heroicons/react/24/outline'
import { toast } from 'sonner'

export function LeadPortalPage() {
  const user = useAppSelector((state) => state.auth.user)
  const [scheduleSent, setScheduleSent] = useState(false)

  const { data: portalData, isLoading } = useGetLeadPortalQuery()

  const assignedAgent = portalData?.assignedAgent || {
    name: 'Brokerage Support Team',
    email: user?.email ? `support@${user.email.split('@')[1] || 'proppulse.com'}` : 'support@proppulse.com',
    phone: '+92 300 1234567',
  }

  const deals = portalData?.deals || []

  // Dynamic deal milestones for client
  const milestones = [
    { title: 'Search & Discovery', completed: true, current: false, date: 'Completed' },
    { title: 'Private Home Tours', completed: true, current: false, date: 'Completed' },
    { title: 'Offer & Terms Negotiation', completed: true, current: false, date: 'Accepted' },
    { title: 'Under Contract & Escrow', completed: deals.length > 0, current: deals.length > 0, date: 'In Progress' },
    { title: 'Final Walkthrough & Keys', completed: false, current: false, date: 'Pending Closing' },
  ]

  const documentChecklist = [
    { title: 'Mortgage Pre-Approval Letter', status: 'Verified', done: true },
    { title: 'Earnest Money Deposit Receipt', status: 'Submitted', done: true },
    { title: 'Property Inspection Report', status: 'Reviewing with Agent', done: false },
    { title: 'Homeowner Insurance Policy', status: 'Pending Upload', done: false },
    { title: 'Final Closing Disclosure', status: 'Scheduled', done: false },
  ]

  const handleRequestTour = () => {
    setScheduleSent(true)
    toast.success(`Tour request sent to ${assignedAgent.name}! They will reach out shortly.`)
  }

  if (isLoading) {
    return (
      <div className="space-y-6 pb-12">
        <Skeleton className="h-40 w-full rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Hero Banner */}
      <div className="rounded-3xl bg-linear-to-r from-primary/15 via-primary/5 to-background border border-primary/20 p-6 md:p-8 shadow-xs relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-2">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs font-semibold px-2.5 py-0.5">
            Client & Business Lead Portal
          </Badge>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
            Welcome, {user?.firstName || 'Valued Client'}!
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Track your live property transactions, review curated property wishlists, and coordinate directly with your assigned real estate advisor.
          </p>
        </div>
        <div className="absolute right-6 -bottom-6 opacity-10 hidden lg:block">
          <BuildingOffice2Icon className="w-48 h-48 text-primary" />
        </div>
      </div>

      {/* Main Grid: 2 Columns on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Deal Journey & Saved Properties */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Transaction Milestone Progress Tracker */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-primary" />
                    Transaction Milestone Tracker
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {deals.length > 0
                      ? `Active property transaction: ${deals[0].title}`
                      : 'Live closing progress on your home acquisition'}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs font-bold">
                  On Schedule
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="relative space-y-4">
                {milestones.map((m, idx) => (
                  <div key={m.title} className="flex items-start gap-3.5">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          m.completed
                            ? 'bg-emerald-500 text-white shadow-xs'
                            : m.current
                              ? 'bg-primary text-primary-foreground ring-4 ring-primary/20 animate-pulse'
                              : 'bg-muted text-muted-foreground border border-border'
                        }`}
                      >
                        {m.completed ? <CheckCircleIcon className="w-4 h-4" /> : idx + 1}
                      </div>
                      {idx < milestones.length - 1 && (
                        <div
                          className={`w-0.5 h-8 my-1 ${
                            m.completed ? 'bg-emerald-500/60' : 'bg-border'
                          }`}
                        />
                      )}
                    </div>
                    <div className="flex-1 pt-0.5">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-semibold ${m.current ? 'text-primary' : 'text-foreground'}`}>
                          {m.title}
                        </p>
                        <span className="text-xs text-muted-foreground font-mono">{m.date}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Properties of Interest / Active Deals */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <HomeModernIcon className="w-5 h-5 text-primary" />
                Your Properties & Deals Under Review
              </CardTitle>
              <CardDescription className="text-xs">
                Active real estate files linked to your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {deals.length === 0 ? (
                <div className="p-6 text-center border border-dashed rounded-2xl text-sm text-muted-foreground">
                  <p>No active property deals linked yet.</p>
                  <p className="text-xs mt-1">Your advisor will add matched properties and deal proposals here.</p>
                </div>
              ) : (
                deals.map((deal) => (
                  <div
                    key={deal.id}
                    className="p-4 rounded-2xl border border-border/80 bg-muted/20 hover:bg-muted/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm text-foreground">{deal.title}</p>
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-500 border-emerald-500/30">
                          Active Transaction
                        </Badge>
                      </div>
                      <p className="text-base font-black font-mono text-primary">
                        ${deal.value.toLocaleString()}
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5 shrink-0"
                      onClick={handleRequestTour}
                      disabled={scheduleSent}
                    >
                      <CalendarDaysIcon className="w-4 h-4" />
                      {scheduleSent ? 'Tour Requested' : 'Request Walkthrough'}
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Document & Next Steps Checklist */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ClipboardDocumentCheckIcon className="w-5 h-5 text-primary" />
                Closing Readiness Checklist
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border/60">
                {documentChecklist.map((doc) => (
                  <div key={doc.title} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2 h-2 rounded-full ${doc.done ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <span className={doc.done ? 'text-muted-foreground line-through' : 'font-semibold text-foreground'}>
                        {doc.title}
                      </span>
                    </div>
                    <Badge variant={doc.done ? 'secondary' : 'outline'} className="text-[10px]">
                      {doc.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Assigned Agent Card & Direct Actions */}
        <div className="space-y-6">
          {/* Assigned Agent Profile Card */}
          <Card className="border-border/80 shadow-xs bg-card/90">
            <CardHeader className="pb-3 text-center">
              <Avatar className="h-20 w-20 mx-auto shadow-md ring-4 ring-primary/10">
                <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xl">
                  {assignedAgent.name ? `${assignedAgent.name[0]}${assignedAgent.name.split(' ')[1]?.[0] || ''}` : 'AG'}
                </AvatarFallback>
              </Avatar>
              <CardTitle className="text-lg font-black mt-2 text-foreground">
                {assignedAgent.name}
              </CardTitle>
              <p className="text-xs text-primary font-semibold">Real Estate Property Advisor</p>
              <p className="text-[11px] text-muted-foreground">{user?.brokerageName || 'PropPulse Real Estate'}</p>
            </CardHeader>

            <CardContent className="space-y-3 pt-0">
              <div className="rounded-xl bg-muted/40 p-3 space-y-2 text-xs">
                {assignedAgent.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <PhoneIcon className="w-4 h-4 text-primary shrink-0" />
                    <span>{assignedAgent.phone}</span>
                  </div>
                )}
                {assignedAgent.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <EnvelopeIcon className="w-4 h-4 text-primary shrink-0" />
                    <span className="truncate">{assignedAgent.email}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 gap-2 pt-1">
                {assignedAgent.phone && (
                  <Button
                    className="w-full text-xs font-bold gap-2 shadow-xs"
                    onClick={() => {
                      window.location.href = `tel:${assignedAgent.phone}`
                    }}
                  >
                    <PhoneIcon className="w-4 h-4" />
                    Call {assignedAgent.name.split(' ')[0]}
                  </Button>
                )}

                {assignedAgent.email && (
                  <Button
                    variant="outline"
                    className="w-full text-xs font-semibold gap-2"
                    onClick={() => {
                      window.location.href = `mailto:${assignedAgent.email}?subject=Question regarding property purchase`
                    }}
                  >
                    <EnvelopeIcon className="w-4 h-4" />
                    Send Direct Email
                  </Button>
                )}

                <Button
                  variant="ghost"
                  className="w-full text-xs text-muted-foreground hover:text-foreground gap-1.5"
                  onClick={() => {
                    toast.info(`Connecting to ${assignedAgent.name}'s secure direct message thread...`)
                  }}
                >
                  <ChatBubbleLeftEllipsisIcon className="w-4 h-4" />
                  Direct Client Chat
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Escrow & Closing Helper */}
          <Card className="border-primary/20 shadow-xs bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-primary">
                Closing Escrow Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>
                • <strong>Do not open new credit lines</strong> or make large purchases before closing day.
              </p>
              <p>
                • Wire transfers should only be confirmed via direct verbal phone call with your escrow officer.
              </p>
              <p>
                • Reach out to your advisor anytime for contract amendments or HOA disclosures.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
