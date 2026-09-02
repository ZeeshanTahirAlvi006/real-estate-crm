import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeftIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  DocumentArrowUpIcon,
  DocumentTextIcon,
  PhoneIcon,
  EnvelopeIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  CheckBadgeIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useGetTransactionByIdQuery,
  useDeleteDocumentMutation,
} from '@/store/api/transactionsApi'
import { MilestoneTracker } from './components/MilestoneTracker'
import { DocumentUploadModal } from './components/DocumentUploadModal'
import { toast } from 'sonner'

export function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [uploadOpen, setUploadOpen] = useState(false)

  const { data: tx, isLoading } = useGetTransactionByIdQuery(id!)
  const [deleteDoc] = useDeleteDocumentMutation()

  const handleDeleteDocument = async (docId: string) => {
    if (!tx) return
    try {
      await deleteDoc({ transactionId: tx.id, docId }).unwrap()
      toast.success('Document deleted')
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to delete document')
    }
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14 w-1/3 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!tx) {
    return (
      <div className="py-20 text-center space-y-4">
        <h3 className="text-lg font-bold text-foreground">Transaction Not Found</h3>
        <Button onClick={() => navigate('/transactions')}>Back to Transactions</Button>
      </div>
    )
  }

  const completedMilestones = tx.milestones.filter(
    (m) => m.status === 'completed' || m.status === 'skipped'
  ).length

  const estimatedCommission = Math.round(tx.purchasePrice * 0.025)

  return (
    <div className="space-y-6">
      {/* Top Navigation & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/transactions')}>
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-foreground">{tx.propertyAddress}</h1>
              <Badge variant="outline" className="text-xs font-bold uppercase tracking-wider">
                {tx.type} Closing
              </Badge>
              <Badge
                className={`text-xs font-bold uppercase ${
                  tx.status === 'closed'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                }`}
              >
                {tx.status.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Client: <strong>{tx.contactName}</strong> • Target Closing:{' '}
              {new Date(tx.closingDate).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setUploadOpen(true)}
            className="gap-1.5 font-semibold bg-primary text-primary-foreground shadow-xs"
          >
            <DocumentArrowUpIcon className="w-4 h-4" />
            <span>Upload Document</span>
          </Button>
        </div>
      </div>

      {/* Progress Header Strip */}
      <Card className="border-primary/30 bg-primary/5 shadow-xs">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <CheckBadgeIcon className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-bold text-foreground">
                Escrow Closing Progress: {tx.progressPercent}%
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              {completedMilestones} of {tx.milestones.length} closing milestones completed
            </p>
          </div>
          <div className="w-full sm:w-72 space-y-1.5">
            <Progress value={tx.progressPercent} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Main 2-Column Command Center */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Tabs for Milestones and Documents */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="milestones" className="w-full">
            <TabsList className="grid grid-cols-2 max-w-sm mb-4">
              <TabsTrigger value="milestones" className="text-xs font-semibold">
                Milestones Checklist ({tx.milestones.length})
              </TabsTrigger>
              <TabsTrigger value="documents" className="text-xs font-semibold">
                Documents ({tx.documents.length})
              </TabsTrigger>
            </TabsList>

            {/* Milestones Tab */}
            <TabsContent value="milestones" className="space-y-4 focus-visible:outline-hidden">
              <Card className="border-border/80 shadow-xs">
                <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Closing Contingencies & Milestone Sequence
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-5">
                  <MilestoneTracker transactionId={tx.id} milestones={tx.milestones} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="space-y-4 focus-visible:outline-hidden">
              <Card className="border-border/80 shadow-xs">
                <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                      Transaction Document Repository
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Purchase contracts, seller disclosures, inspections, and title commitments.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setUploadOpen(true)}
                    className="gap-1.5 text-xs font-semibold"
                  >
                    <DocumentArrowUpIcon className="w-3.5 h-3.5" />
                    <span>Upload File</span>
                  </Button>
                </CardHeader>

                <CardContent className="pt-4">
                  {tx.documents.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground border-2 border-dashed border-border/60 rounded-xl">
                      <DocumentTextIcon className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-xs font-semibold text-foreground">No documents attached yet</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Upload purchase agreements, inspections, or title disclosures.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 text-xs"
                        onClick={() => setUploadOpen(true)}
                      >
                        Upload First Document
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/60">
                      {tx.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="py-3.5 flex items-center justify-between gap-3 group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2.5 rounded-xl bg-muted/60 text-primary shrink-0">
                              <DocumentTextIcon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-bold text-foreground truncate">
                                  {doc.title}
                                </h4>
                                <Badge variant="secondary" className="text-[10px] uppercase font-mono">
                                  {doc.category.replace('_', ' ')}
                                </Badge>
                                {doc.clientVisible && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                  >
                                    Client Portal Visible
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                Uploaded on {new Date(doc.uploadedAt).toLocaleDateString()} by{' '}
                                {doc.uploadedByName} • {doc.fileName}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs gap-1"
                              onClick={() => window.open(doc.fileUrl, '_blank')}
                            >
                              <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                              <span>View / Download</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteDocument(doc.id)}
                            >
                              <TrashIcon className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right 1 Col: Parties, Escrow Team & Financials */}
        <div className="space-y-5">
          {/* Financial Breakdown */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <CurrencyDollarIcon className="w-4 h-4 text-emerald-500" />
                <span>Financial & Commission Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <span className="text-muted-foreground">Agreed Purchase Price:</span>
                <span className="font-bold text-sm text-foreground">
                  {formatCurrency(tx.purchasePrice)}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <span className="text-muted-foreground">Earnest Money Held:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(tx.earnestMoney)}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <span className="text-muted-foreground">Estimated Gross Commission (2.5%):</span>
                <span className="font-semibold text-primary">{formatCurrency(estimatedCommission)}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Contract Binding Date:</span>
                <span>{new Date(tx.contractDate).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Escrow & Title Partner */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ShieldCheckIcon className="w-4 h-4 text-primary" />
                <span>Escrow & Title Officer</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs">
              <div>
                <h4 className="font-bold text-sm text-foreground">
                  {tx.escrowOfficer || 'Sarah Jenkins'}
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  {tx.escrowCompany || 'First American Title & Escrow'}
                </p>
              </div>

              <div className="space-y-2 pt-1">
                {tx.escrowOfficerPhone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <PhoneIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="font-mono">{tx.escrowOfficerPhone}</span>
                  </div>
                )}
                {tx.escrowOfficerEmail && (
                  <div className="flex items-center gap-2 text-muted-foreground truncate">
                    <EnvelopeIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                    <a
                      href={`mailto:${tx.escrowOfficerEmail}`}
                      className="hover:underline truncate"
                    >
                      {tx.escrowOfficerEmail}
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Client & Agent Contacts */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <UserIcon className="w-4 h-4 text-primary" />
                <span>Transaction Parties</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                  Primary Client ({tx.type})
                </span>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-foreground">{tx.contactName}</h4>
                    <p className="text-[11px] text-muted-foreground font-mono">{tx.contactPhone}</p>
                  </div>
                  {tx.contactPhone && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs bg-emerald-500/10 text-emerald-600 hover:bg-emerald-600 hover:text-white border-emerald-500/30"
                      onClick={() => {
                        const clean = tx.contactPhone?.replace(/\D/g, '')
                        window.open(`https://wa.me/${clean}`, '_blank')
                      }}
                    >
                      WhatsApp
                    </Button>
                  )}
                </div>
              </div>

              <div className="border-t border-border/40 pt-3">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                  Assigned Listing / Buyer Agent
                </span>
                <h4 className="font-bold text-foreground">{tx.assignedAgentName}</h4>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Document Upload Modal */}
      <DocumentUploadModal
        transactionId={tx.id}
        open={uploadOpen}
        onOpenChange={setUploadOpen}
      />
    </div>
  )
}
