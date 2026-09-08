import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useGetTransactionByIdQuery,
  useDeleteDocumentMutation,
} from '@/store/api/transactionsApi'
import { useGetEnvelopesQuery } from '@/store/api/esignApi'
import { MilestoneTracker } from './components/MilestoneTracker'
import { DocumentUploadModal } from './components/DocumentUploadModal'
import { CommissionCalculatorModal } from '@/pages/pipeline/components/CommissionCalculatorModal'
import { ESignPrepareModal } from '@/pages/esign/components/ESignPrepareModal'
import { ESignAuditTrailModal } from '@/pages/esign/components/ESignAuditTrailModal'
import { useCountUp } from '@/hooks/useCountUp'
import type { ESignEnvelope } from '@/types/esign'
import { toast } from 'sonner'

export function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [calcModalOpen, setCalcModalOpen] = useState(false)
  const [esignPrepareOpen, setEsignPrepareOpen] = useState(false)
  const [selectedEnvelopeForAudit, setSelectedEnvelopeForAudit] = useState<ESignEnvelope | null>(null)

  const { data: tx, isLoading } = useGetTransactionByIdQuery(id!)
  const { data: envelopesData } = useGetEnvelopesQuery({ transactionId: id })
  const envelopes = envelopesData?.envelopes || []
  const [deleteDoc] = useDeleteDocumentMutation()

  const animatedProgress = useCountUp({
    end: tx?.progressPercent ?? 0,
    duration: 1500,
  })

  const handleDeleteDocument = async (docId: string) => {
    if (!tx) return
    try {
      await deleteDoc({ transactionId: tx.id, docId }).unwrap()
      toast.success('Document deleted successfully')
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

  // Dynamic progress bar color calculation based on completion percentage
  const getProgressVisuals = (pct: number) => {
    if (pct <= 25) {
      return {
        fill: 'bg-red-500',
        text: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-500/10 dark:bg-red-500/20',
        border: 'border-red-500/30',
        badge: 'bg-red-600 text-white',
        phase: 'Initial Contingencies',
      }
    }
    if (pct <= 50) {
      return {
        fill: 'bg-amber-500',
        text: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-500/10 dark:bg-amber-500/20',
        border: 'border-amber-500/30',
        badge: 'bg-amber-600 text-white',
        phase: 'Inspections & Disclosures',
      }
    }
    if (pct <= 75) {
      return {
        fill: 'bg-[#618764]',
        text: 'text-[#2B5748] dark:text-[#9CB080]',
        bg: 'bg-[#618764]/10 dark:bg-[#618764]/20',
        border: 'border-[#618764]/40',
        badge: 'bg-[#618764] text-white',
        phase: 'Appraisal & Underwriting',
      }
    }
    return {
      fill: 'bg-[#9CB080]',
      text: 'text-[#2B5748] dark:text-[#9CB080]',
      bg: 'bg-[#9CB080]/15 dark:bg-[#9CB080]/25',
      border: 'border-[#9CB080]/40',
      badge: 'bg-[#9CB080] text-[#273338]',
      phase: 'Clear to Close & Funding',
    }
  }

  if (isLoading) {
    return (
      <div className="-m-4 sm:-m-6 min-h-[calc(100vh-4rem)] p-4 sm:p-6 pb-20 md:pb-8 bg-[#F5F7F4] dark:bg-[#1E282D] space-y-6">
        <Skeleton className="h-14 w-80 rounded-xl bg-[#EDF2EB] dark:bg-[#1A2E26]" />
        <Skeleton className="h-24 w-full rounded-xl bg-[#EDF2EB] dark:bg-[#1A2E26]" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2 rounded-xl bg-[#EDF2EB] dark:bg-[#1A2E26]" />
          <Skeleton className="h-96 rounded-xl bg-[#EDF2EB] dark:bg-[#1A2E26]" />
        </div>
      </div>
    )
  }

  if (!tx) {
    return (
      <div className="-m-4 sm:-m-6 min-h-[calc(100vh-4rem)] p-6 bg-[#F5F7F4] dark:bg-[#1E282D] flex items-center justify-center">
        <Card className="max-w-md p-8 text-center border-[#D8E2D6] dark:border-[#618764] bg-white dark:bg-[#254238] rounded-2xl shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#75887E] dark:text-[#A0B2A6] flex items-center justify-center mx-auto mb-4">
            <MaterialIcon name="search_off" size={26} />
          </div>
          <h3 className="text-base font-bold text-[#273338] dark:text-white">Transaction Not Found</h3>
          <p className="text-xs text-[#75887E] dark:text-[#A0B2A6] mt-1 mb-5">
            The requested escrow record does not exist or may have been archived.
          </p>
          <Button
            onClick={() => navigate('/transactions')}
            className="bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] font-bold text-xs"
          >
            Back to Escrow Hub
          </Button>
        </Card>
      </div>
    )
  }

  const completedMilestones = tx.milestones.filter(
    (m) => m.status === 'completed' || m.status === 'skipped'
  ).length

  const estimatedCommission = Math.round(tx.purchasePrice * 0.025)
  const progressVisuals = getProgressVisuals(animatedProgress)

  return (
    <div className="-m-4 sm:-m-6 min-h-[calc(100vh-4rem)] p-4 sm:p-6 pb-20 md:pb-8 bg-[#F5F7F4] dark:bg-[#1E282D] space-y-6 transition-colors duration-200">
      
      {/* ═══════ Top Header Navigation & Status ═══════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D8E2D6] dark:border-[#618764]/40">
        <div className="flex items-start sm:items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/transactions')}
            className="h-9 w-9 shrink-0 border-[#D8E2D6] dark:border-[#618764] bg-white dark:bg-[#254238] text-[#273338] dark:text-white hover:bg-[#EDF2EB] dark:hover:bg-[#1A2E26] cursor-pointer"
            title="Back to Transactions Hub"
          >
            <MaterialIcon name="arrow_back" size={18} />
          </Button>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#273338] dark:text-white">
                {tx.propertyAddress}
              </h1>

              {/* Status Badge: Prominent RED for pending, themed for others */}
              {tx.status === 'pending' ? (
                <Badge className="text-[11px] font-bold uppercase tracking-wider bg-red-600 hover:bg-red-700 text-white shadow-xs border-transparent">
                  Pending Escrow
                </Badge>
              ) : tx.status === 'closed' ? (
                <Badge className="text-[11px] font-bold uppercase tracking-wider bg-[#9CB080]/25 text-[#2B5748] dark:text-[#9CB080] border border-[#9CB080]/40">
                  Closed & Recorded
                </Badge>
              ) : (
                <Badge className="text-[11px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                  Under Contract
                </Badge>
              )}
            </div>

            <p className="text-xs text-[#4A5D54] dark:text-[#A0B2A6] mt-1 flex items-center gap-2 flex-wrap">
              <span>Client: <strong className="text-[#273338] dark:text-white font-semibold">{tx.contactName}</strong></span>
              <span className="opacity-40">•</span>
              <span>Target Closing: <strong className="text-[#273338] dark:text-white font-semibold">{new Date(tx.closingDate).toLocaleDateString()}</strong></span>
              <span className="opacity-40">•</span>
              <span className="capitalize">{tx.type} Representation</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => setUploadOpen(true)}
            className="gap-1.5 text-xs font-bold bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] shadow-xs transition-all duration-200 cursor-pointer"
          >
            <MaterialIcon name="upload_file" size={16} />
            <span>Upload Document</span>
          </Button>
        </div>
      </div>

      {/* ═══════ Escrow Closing Dynamic Progress Bar Strip ═══════ */}
      <Card className="rounded-xl border border-[#D8E2D6] dark:border-[#618764] bg-white dark:bg-[#254238] shadow-md shadow-black/10 transition-colors duration-200 overflow-hidden">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2.5">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${progressVisuals.bg} ${progressVisuals.text} border ${progressVisuals.border}`}>
                <MaterialIcon name="checklist" size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#273338] dark:text-white">
                    Escrow Closing Progress: <span className={`font-mono tabular-nums ${progressVisuals.text}`}>{animatedProgress}%</span>
                  </h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${progressVisuals.badge}`}>
                    {progressVisuals.phase}
                  </span>
                </div>
                <p className="text-xs text-[#75887E] dark:text-[#A0B2A6]">
                  {completedMilestones} of {tx.milestones.length} closing contingencies completed
                </p>
              </div>
            </div>

            <div className="text-xs font-mono font-semibold text-[#75887E] dark:text-[#A0B2A6] text-right hidden sm:block">
              Target: {new Date(tx.closingDate).toLocaleDateString()}
            </div>
          </div>

          {/* Dynamic Color Fill Bar based on Percentage */}
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-[#EDF2EB] dark:bg-[#1A2E26] border border-[#D8E2D6]/40 dark:border-[#618764]/30">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out will-change-[width] ${progressVisuals.fill}`}
              style={{ width: `${Math.min(100, Math.max(0, animatedProgress))}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* ═══════ Main Command Center: Responsive Grid ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ─── LEFT COLUMN (col-span-2): Tabs for Milestones, Documents, and eSign ─── */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="milestones" className="w-full">
            <TabsList className="grid grid-cols-3 max-w-md mb-4 bg-[#EDF2EB] dark:bg-[#1A2E26] p-1 rounded-xl border border-[#D8E2D6] dark:border-[#618764]/60">
              <TabsTrigger
                value="milestones"
                className="text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-[#254238] data-[state=active]:text-[#273338] dark:data-[state=active]:text-white data-[state=active]:shadow-xs rounded-lg transition-all"
              >
                Milestones ({tx.milestones.length})
              </TabsTrigger>
              <TabsTrigger
                value="documents"
                className="text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-[#254238] data-[state=active]:text-[#273338] dark:data-[state=active]:text-white data-[state=active]:shadow-xs rounded-lg transition-all"
              >
                Documents ({tx.documents.length})
              </TabsTrigger>
              <TabsTrigger
                value="esign"
                className="text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-[#254238] data-[state=active]:text-[#273338] dark:data-[state=active]:text-white data-[state=active]:shadow-xs rounded-lg transition-all"
              >
                eSign ({envelopes.length})
              </TabsTrigger>
            </TabsList>

            {/* ── Tab 1: Milestones Sequence with Cascade & Parallax ── */}
            <TabsContent value="milestones" className="space-y-4 focus-visible:outline-none">
              <Card className="rounded-xl border border-[#D8E2D6] dark:border-[#618764] bg-white dark:bg-[#254238] shadow-md shadow-black/10 overflow-hidden">
                <CardHeader className="p-4 sm:p-5 pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/40 bg-[#EDF2EB]/40 dark:bg-[#1A2E26]/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold text-[#273338] dark:text-white flex items-center gap-2">
                        <MaterialIcon name="timeline" size={18} className="text-[#618764] dark:text-[#9CB080]" />
                        <span>Closing Contingencies & Milestone Sequence</span>
                      </CardTitle>
                      <p className="text-xs text-[#4A5D54] dark:text-[#A0B2A6] mt-0.5">
                        Interactive checklist for escrow conditions, inspections, and title recording.
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-5">
                  <MilestoneTracker transactionId={tx.id} milestones={tx.milestones} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Tab 2: Document Repository ── */}
            <TabsContent value="documents" className="space-y-4 focus-visible:outline-none">
              <Card className="rounded-xl border border-[#D8E2D6] dark:border-[#618764] bg-white dark:bg-[#254238] shadow-md shadow-black/10 overflow-hidden">
                <CardHeader className="p-4 sm:p-5 pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/40 bg-[#EDF2EB]/40 dark:bg-[#1A2E26]/40 flex flex-row items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-bold text-[#273338] dark:text-white flex items-center gap-2">
                      <MaterialIcon name="folder_open" size={18} className="text-[#618764] dark:text-[#9CB080]" />
                      <span>Transaction Document Repository</span>
                    </CardTitle>
                    <p className="text-xs text-[#4A5D54] dark:text-[#A0B2A6] mt-0.5">
                      Purchase agreements, disclosures, inspection notes, and title commitments.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setUploadOpen(true)}
                    className="gap-1.5 text-xs font-bold bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] shrink-0"
                  >
                    <MaterialIcon name="upload_file" size={15} />
                    <span className="hidden sm:inline">Upload</span>
                  </Button>
                </CardHeader>

                <CardContent className="p-4 sm:p-5">
                  {tx.documents.length === 0 ? (
                    <div className="py-12 text-center border border-dashed border-[#D8E2D6] dark:border-[#618764] rounded-xl bg-[#EDF2EB]/30 dark:bg-[#1A2E26]/30">
                      <div className="w-12 h-12 rounded-xl bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#75887E] dark:text-[#A0B2A6] flex items-center justify-center mx-auto mb-2">
                        <MaterialIcon name="description" size={24} />
                      </div>
                      <p className="text-xs font-bold text-[#273338] dark:text-white">No documents attached yet</p>
                      <p className="text-[11px] text-[#75887E] dark:text-[#A0B2A6] mt-0.5">
                        Upload purchase agreements, inspections, or title disclosures.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 text-xs font-semibold border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white bg-white dark:bg-[#202B2F]"
                        onClick={() => setUploadOpen(true)}
                      >
                        Upload First Document
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#D8E2D6]/60 dark:divide-[#618764]/40">
                      {tx.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="py-3 flex items-center justify-between gap-3 group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-lg bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#2B5748] dark:text-[#9CB080] shrink-0">
                              <MaterialIcon name="description" size={20} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-bold text-[#273338] dark:text-white truncate">
                                  {doc.title}
                                </h4>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-semibold uppercase font-mono border-[#D8E2D6] dark:border-[#618764] text-[#4A5D54] dark:text-[#A0B2A6]"
                                >
                                  {doc.category.replace('_', ' ')}
                                </Badge>
                                {doc.clientVisible && (
                                  <Badge className="text-[10px] font-bold bg-[#9CB080]/20 text-[#2B5748] dark:text-[#9CB080] border-[#9CB080]/30">
                                    Client Visible
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-[#75887E] dark:text-[#A0B2A6] mt-0.5">
                                Uploaded {new Date(doc.uploadedAt).toLocaleDateString()} by {doc.uploadedByName}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs gap-1 border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white bg-white dark:bg-[#202B2F] hover:bg-[#EDF2EB]"
                              onClick={() => window.open(doc.fileUrl, '_blank')}
                            >
                              <MaterialIcon name="download" size={14} />
                              <span className="hidden sm:inline">View</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-[#75887E] hover:text-red-600 dark:hover:text-red-400"
                              onClick={() => handleDeleteDocument(doc.id)}
                            >
                              <MaterialIcon name="delete" size={15} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Tab 3: eSign Digital Envelopes ── */}
            <TabsContent value="esign" className="space-y-4 focus-visible:outline-none">
              <Card className="rounded-xl border border-[#D8E2D6] dark:border-[#618764] bg-white dark:bg-[#254238] shadow-md shadow-black/10 overflow-hidden">
                <CardHeader className="p-4 sm:p-5 pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/40 bg-[#EDF2EB]/40 dark:bg-[#1A2E26]/40 flex flex-row items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-bold text-[#273338] dark:text-white flex items-center gap-2">
                      <MaterialIcon name="draw" size={18} className="text-[#618764] dark:text-[#9CB080]" />
                      <span>Digital eSignature Envelopes</span>
                    </CardTitle>
                    <p className="text-xs text-[#4A5D54] dark:text-[#A0B2A6] mt-0.5">
                      Legally certified contracts and disclosure sign-offs.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setEsignPrepareOpen(true)}
                    className="gap-1.5 text-xs font-bold bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] shrink-0"
                  >
                    <MaterialIcon name="send" size={15} />
                    <span className="hidden sm:inline">New eSign</span>
                  </Button>
                </CardHeader>

                <CardContent className="p-4 sm:p-5">
                  {envelopes.length === 0 ? (
                    <div className="py-12 text-center border border-dashed border-[#D8E2D6] dark:border-[#618764] rounded-xl bg-[#EDF2EB]/30 dark:bg-[#1A2E26]/30">
                      <div className="w-12 h-12 rounded-xl bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#75887E] dark:text-[#A0B2A6] flex items-center justify-center mx-auto mb-2">
                        <MaterialIcon name="mark_email_read" size={24} />
                      </div>
                      <p className="text-xs font-bold text-[#273338] dark:text-white">No signature requests dispatched yet</p>
                      <p className="text-[11px] text-[#75887E] dark:text-[#A0B2A6] mt-0.5">
                        Prepare purchase contracts or disclosures for 1-click digital execution.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 text-xs font-semibold border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white bg-white dark:bg-[#202B2F]"
                        onClick={() => setEsignPrepareOpen(true)}
                      >
                        Send First Contract
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#D8E2D6]/60 dark:divide-[#618764]/40">
                      {envelopes.map((env) => (
                        <div key={env.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-[#273338] dark:text-white truncate">
                                {env.title}
                              </h4>
                              <Badge
                                className={
                                  env.status === 'completed'
                                    ? 'bg-[#9CB080]/20 text-[#2B5748] dark:text-[#9CB080] border-[#9CB080]/30 font-bold'
                                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold'
                                }
                              >
                                {env.status.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-[#75887E] dark:text-[#A0B2A6] font-mono">
                              File: {env.fileName} • {env.signers.length} Signer(s) • Created {new Date(env.createdAt).toLocaleDateString()}
                            </p>
                            <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                              {env.signers.map((s) => (
                                <Badge
                                  key={s.id}
                                  variant="outline"
                                  className={`text-[10px] gap-1 font-semibold ${
                                    s.status === 'signed'
                                      ? 'bg-[#9CB080]/15 text-[#2B5748] dark:text-[#9CB080] border-[#9CB080]/30'
                                      : 'bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#75887E] dark:text-[#A0B2A6] border-[#D8E2D6] dark:border-[#618764]/40'
                                  }`}
                                >
                                  <MaterialIcon name={s.status === 'signed' ? 'check' : 'schedule'} size={12} />
                                  <span>{s.name} ({s.role})</span>
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            {env.signers[0]?.signingUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs gap-1 border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white bg-white dark:bg-[#202B2F]"
                                onClick={() => {
                                  navigator.clipboard.writeText(env.signers[0].signingUrl!)
                                  toast.success('Signing link copied to clipboard!')
                                }}
                              >
                                <MaterialIcon name="content_copy" size={13} />
                                <span>Copy Link</span>
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs gap-1 border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white bg-white dark:bg-[#202B2F]"
                              onClick={() => setSelectedEnvelopeForAudit(env)}
                            >
                              <MaterialIcon name="verified_user" size={14} className="text-[#618764] dark:text-[#9CB080]" />
                              <span>Audit Trail</span>
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

        {/* ─── RIGHT COLUMN (col-span-1): Financials, Escrow Officer & Contact Cards ─── */}
        <div className="space-y-5">

          {/* Card 1: Financial & Commission Breakdown */}
          <Card className="rounded-xl border border-[#D8E2D6] dark:border-[#618764] bg-white dark:bg-[#254238] shadow-md shadow-black/10 overflow-hidden">
            <CardHeader className="p-4 pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/40 bg-[#EDF2EB]/40 dark:bg-[#1A2E26]/40">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#4A5D54] dark:text-[#A0B2A6] flex items-center gap-1.5">
                <MaterialIcon name="payments" size={16} className="text-[#618764] dark:text-[#9CB080]" />
                <span>Financial & Commission Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#D8E2D6]/60 dark:border-[#618764]/30">
                <span className="text-[#75887E] dark:text-[#A0B2A6]">Agreed Purchase Price:</span>
                <span className="font-bold text-sm text-[#273338] dark:text-white font-mono tabular-nums">
                  {formatCurrency(tx.purchasePrice)}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-[#D8E2D6]/60 dark:border-[#618764]/30">
                <span className="text-[#75887E] dark:text-[#A0B2A6]">Earnest Money Held:</span>
                <span className="font-semibold text-[#2B5748] dark:text-[#9CB080] font-mono tabular-nums">
                  {formatCurrency(tx.earnestMoney)}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-[#D8E2D6]/60 dark:border-[#618764]/30">
                <span className="text-[#75887E] dark:text-[#A0B2A6]">Est. Gross Commission (2.5%):</span>
                <span className="font-semibold text-[#2B5748] dark:text-[#9CB080] font-mono tabular-nums">
                  {formatCurrency(estimatedCommission)}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-[#D8E2D6]/60 dark:border-[#618764]/30 text-[#75887E] dark:text-[#A0B2A6]">
                <span>Contract Binding Date:</span>
                <span className="font-mono">{new Date(tx.contractDate).toLocaleDateString()}</span>
              </div>
              <div className="pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs font-semibold gap-1.5 border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white bg-transparent hover:bg-[#EDF2EB] dark:hover:bg-[#1A2E26] cursor-pointer"
                  onClick={() => setCalcModalOpen(true)}
                >
                  <MaterialIcon name="calculate" size={15} className="text-[#618764] dark:text-[#9CB080]" />
                  <span>Settle Commission Split</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Escrow & Title Officer */}
          <Card className="rounded-xl border border-[#D8E2D6] dark:border-[#618764] bg-white dark:bg-[#254238] shadow-md shadow-black/10 overflow-hidden">
            <CardHeader className="p-4 pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/40 bg-[#EDF2EB]/40 dark:bg-[#1A2E26]/40">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#4A5D54] dark:text-[#A0B2A6] flex items-center gap-1.5">
                <MaterialIcon name="assured_workload" size={16} className="text-[#618764] dark:text-[#9CB080]" />
                <span>Escrow & Title Officer</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div>
                <h4 className="font-bold text-sm text-[#273338] dark:text-white">
                  {tx.escrowOfficer || 'Sarah Jenkins'}
                </h4>
                <p className="text-[11px] text-[#75887E] dark:text-[#A0B2A6]">
                  {tx.escrowCompany || 'First American Title & Escrow'}
                </p>
              </div>

              <div className="space-y-2 pt-1 border-t border-[#D8E2D6]/60 dark:border-[#618764]/30">
                {tx.escrowOfficerPhone && (
                  <div className="flex items-center gap-2 text-[#75887E] dark:text-[#A0B2A6]">
                    <MaterialIcon name="call" size={14} className="text-[#618764] dark:text-[#9CB080] shrink-0" />
                    <span className="font-mono">{tx.escrowOfficerPhone}</span>
                  </div>
                )}
                {tx.escrowOfficerEmail && (
                  <div className="flex items-center gap-2 text-[#75887E] dark:text-[#A0B2A6] truncate">
                    <MaterialIcon name="mail" size={14} className="text-[#618764] dark:text-[#9CB080] shrink-0" />
                    <a
                      href={`mailto:${tx.escrowOfficerEmail}`}
                      className="hover:underline text-[#2B5748] dark:text-[#9CB080] truncate"
                    >
                      {tx.escrowOfficerEmail}
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Transaction Parties */}
          <Card className="rounded-xl border border-[#D8E2D6] dark:border-[#618764] bg-white dark:bg-[#254238] shadow-md shadow-black/10 overflow-hidden">
            <CardHeader className="p-4 pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/40 bg-[#EDF2EB]/40 dark:bg-[#1A2E26]/40">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#4A5D54] dark:text-[#A0B2A6] flex items-center gap-1.5">
                <MaterialIcon name="group" size={16} className="text-[#618764] dark:text-[#9CB080]" />
                <span>Transaction Parties</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3.5 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#75887E] dark:text-[#A0B2A6] block mb-1">
                  Primary Client ({tx.type})
                </span>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-[#273338] dark:text-white">{tx.contactName}</h4>
                    <p className="text-[11px] text-[#75887E] dark:text-[#A0B2A6] font-mono">{tx.contactPhone}</p>
                  </div>
                  {tx.contactPhone && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs font-semibold bg-[#9CB080]/15 hover:bg-[#9CB080] text-[#2B5748] dark:text-[#9CB080] hover:text-[#273338] border-[#9CB080]/30"
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

              <div className="border-t border-[#D8E2D6]/60 dark:border-[#618764]/30 pt-3">
                <span className="text-[10px] uppercase font-bold text-[#75887E] dark:text-[#A0B2A6] block mb-1">
                  Assigned Agent
                </span>
                <h4 className="font-bold text-[#273338] dark:text-white">{tx.assignedAgentName}</h4>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══════ Modal Dialogs ═══════ */}
      <DocumentUploadModal
        transactionId={tx.id}
        open={uploadOpen}
        onOpenChange={setUploadOpen}
      />

      <CommissionCalculatorModal
        open={calcModalOpen}
        onOpenChange={setCalcModalOpen}
        defaultPrice={tx.purchasePrice}
        transactionId={tx.id}
        dealId={tx.dealId}
      />

      <ESignPrepareModal
        open={esignPrepareOpen}
        onOpenChange={setEsignPrepareOpen}
        transactionId={tx.id}
        dealId={tx.dealId}
        defaultClientName={tx.contactName}
        defaultClientEmail={tx.contactEmail}
      />

      <ESignAuditTrailModal
        open={!!selectedEnvelopeForAudit}
        onOpenChange={(open) => !open && setSelectedEnvelopeForAudit(null)}
        envelope={selectedEnvelopeForAudit}
      />
    </div>
  )
}
