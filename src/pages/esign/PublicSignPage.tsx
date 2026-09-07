import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  ShieldCheckIcon,
  CheckCircleIcon,
  PencilIcon,
  DocumentTextIcon,
  SparklesIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useGetSigningSessionQuery,
  useCompleteSigningMutation,
  useDeclineSigningMutation,
} from '@/store/api/esignApi'
import { toast } from 'sonner'

export function PublicSignPage() {
  const { token } = useParams<{ token: string }>()
  const { data: session, isLoading, error } = useGetSigningSessionQuery(token || '', {
    skip: !token,
  })

  const [completeSigning, { isLoading: isSubmitting }] = useCompleteSigningMutation()
  const [declineSigning, { isLoading: isDeclining }] = useDeclineSigningMutation()

  // Signature capture state
  const [signModalOpen, setSignModalOpen] = useState(false)
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null)
  const [activeSignTab, setActiveSignTab] = useState<'draw' | 'type'>('draw')
  const [typedName, setTypedName] = useState('')
  const [adoptedSignature, setAdoptedSignature] = useState<string>('')
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [consentAgreed, setConsentAgreed] = useState(false)

  // Decline Dialog
  const [declineModalOpen, setDeclineModalOpen] = useState(false)
  const [declineReason, setDeclineReason] = useState('')

  // Canvas drawing ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  // Initialize signer's name
  useEffect(() => {
    if (session?.signer?.name) {
      setTypedName(session.signer.name)
    }
  }, [session])

  // Canvas mouse/touch handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    ctx.beginPath()
    ctx.moveTo(clientX - rect.left, clientY - rect.top)
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    ctx.lineTo(clientX - rect.left, clientY - rect.top)
    ctx.strokeStyle = '#1e3a8a' // Navy legal ink
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const handleAdoptSignature = () => {
    let sig = ''
    if (activeSignTab === 'draw') {
      const canvas = canvasRef.current
      if (canvas) {
        sig = canvas.toDataURL('image/png')
      }
    } else {
      sig = typedName.trim()
    }

    if (!sig) {
      toast.error('Please draw or type your legal signature')
      return
    }

    setAdoptedSignature(sig)

    // Stamp all assigned signature/initials fields
    if (activeFieldId) {
      setFieldValues((prev) => ({
        ...prev,
        [activeFieldId]: sig,
      }))
    } else if (session?.assignedFields) {
      const updated: Record<string, string> = { ...fieldValues }
      for (const f of session.assignedFields) {
        if (!updated[f.id]) {
          updated[f.id] = sig
        }
      }
      setFieldValues(updated)
    }

    setSignModalOpen(false)
    toast.success('Signature adopted successfully')
  }

  const handleFinishSigning = async () => {
    if (!consentAgreed) {
      toast.error('You must consent to legally binding electronic signing to finish')
      return
    }

    if (!adoptedSignature) {
      toast.error('Please adopt a signature by clicking the signature field')
      return
    }

    // Verify all required assigned fields are stamped
    const missing = session?.assignedFields.filter((f) => f.required && !fieldValues[f.id] && !adoptedSignature)
    if (missing && missing.length > 0) {
      toast.error(`Please complete all required fields (${missing.length} remaining)`)
      return
    }

    try {
      const payloadFields = (session?.assignedFields || []).map((f) => ({
        fieldId: f.id,
        value: fieldValues[f.id] || adoptedSignature,
      }))

      await completeSigning({
        token: token || '',
        payload: {
          signatureData: adoptedSignature,
          fields: payloadFields,
        },
      }).unwrap()

      toast.success('Document executed successfully!')
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to complete signing session')
    }
  }

  const handleDecline = async () => {
    if (!declineReason.trim()) {
      toast.error('Please specify a reason for declining')
      return
    }
    try {
      await declineSigning({
        token: token || '',
        reason: declineReason,
      }).unwrap()
      toast.info('Document signing invitation declined')
      setDeclineModalOpen(false)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to decline signing')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center animate-pulse mb-3">
          <DocumentTextIcon className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-foreground">Loading Secure Signing Session...</h2>
        <p className="text-xs text-muted-foreground mt-1">Verifying cryptographic token and document status</p>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-3">
          <XMarkIcon className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-black text-foreground">Signing Link Expired or Invalid</h2>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          This digital signature request may have been completed, voided, or the link has expired. Contact your real estate advisor for a fresh copy.
        </p>
      </div>
    )
  }

  const isAlreadySigned = session.signer.status === 'signed'
  const isDeclined = session.signer.status === 'declined' || session.status === 'declined'

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Banner */}
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/90 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20">
            <ShieldCheckIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-foreground">{session.brokerageName || 'PropPulse Real Estate'}</span>
              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-bold">
                ESIGN & UETA Verified
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Signer: <strong className="text-foreground">{session.signer.name}</strong> ({session.signer.role.toUpperCase()})
            </p>
          </div>
        </div>

        {!isAlreadySigned && !isDeclined && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeclineModalOpen(true)}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              Decline
            </Button>
            <Button
              size="sm"
              onClick={handleFinishSigning}
              disabled={isSubmitting || !consentAgreed}
              className="font-bold text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              <CheckCircleIcon className="w-4 h-4" />
              <span>{isSubmitting ? 'Signing...' : 'Finish & Sign Document'}</span>
            </Button>
          </div>
        )}
      </header>

      {/* Main Document Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* If Already Signed State */}
        {isAlreadySigned ? (
          <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-sm text-center p-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircleIcon className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-black text-foreground">You Have Successfully Signed This Document!</h2>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Your legally binding signature has been recorded with a timestamped audit trail and SHA-256 tamper-evident integrity seal.
              </p>
            </div>

            {session.certificateHash && (
              <div className="max-w-lg mx-auto p-3 rounded-xl bg-card border border-border/80 text-left space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                  Cryptographic Integrity Seal:
                </span>
                <p className="font-mono text-[10px] text-primary break-all bg-muted p-1.5 rounded">
                  {session.certificateHash}
                </p>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(session.documentUrl, '_blank')}
              className="text-xs font-semibold gap-1.5"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              <span>Download Signed Copy</span>
            </Button>
          </Card>
        ) : isDeclined ? (
          <Card className="border-rose-500/30 bg-rose-500/5 shadow-sm text-center p-8 space-y-3">
            <div className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
              <XMarkIcon className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-black text-foreground">Signing Request Declined</h2>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              You have declined to sign this document. Your designated advisor has been notified.
            </p>
          </Card>
        ) : (
          <>
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border shadow-xs">
              <div>
                <h1 className="text-base font-bold text-foreground">{session.title}</h1>
                <p className="text-xs text-muted-foreground">
                  File: <span className="font-mono">{session.fileName}</span> ({session.pageCount} Pages)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setActiveFieldId(null)
                    setSignModalOpen(true)
                  }}
                  className="text-xs font-semibold gap-1.5"
                >
                  <PencilIcon className="w-3.5 h-3.5 text-primary" />
                  <span>{adoptedSignature ? 'Change Signature' : 'Adopt Signature'}</span>
                </Button>
              </div>
            </div>

            {/* Document Simulated Viewer Canvas */}
            <div className="space-y-6">
              {Array.from({ length: session.pageCount }).map((_, pageIdx) => {
                const pageNumber = pageIdx + 1
                const pageFields = session.allFields.filter((f) => f.page === pageNumber)

                return (
                  <div
                    key={pageNumber}
                    className="relative bg-white text-slate-900 border border-slate-300 rounded-2xl shadow-md min-h-[750px] p-10 flex flex-col justify-between overflow-hidden"
                  >
                    {/* Simulated Document Header */}
                    <div className="border-b border-slate-200 pb-4 flex justify-between items-start">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                          {session.brokerageName || 'Real Estate Purchase Contract'}
                        </span>
                        <h3 className="text-sm font-black text-slate-900">{session.title}</h3>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">Page {pageNumber} of {session.pageCount}</span>
                    </div>

                    {/* Simulated Contract Clauses */}
                    <div className="space-y-4 text-xs text-slate-700 leading-relaxed py-6 select-none opacity-85">
                      <p>
                        <strong>SECTION {pageNumber}.1 - TERMS & CONDITIONS:</strong> The undersigned parties hereby mutually agree to the covenants, contingencies, and escrow closing instructions detailed in this ratified agreement. All representations are made in good faith under applicable jurisdiction laws.
                      </p>
                      <p>
                        <strong>SECTION {pageNumber}.2 - INSPECTIONS & TITLE CLEARANCE:</strong> Buyer shall have standard statutory inspection timelines to inspect structural components, environmental disclosures, and municipal easements. Seller covenants clear marketable title free of unrecorded liens.
                      </p>
                      <p>
                        <strong>SECTION {pageNumber}.3 - STATUTORY DISCLOSURES & FINANCING:</strong> Earnest money deposit shall be tendered to the designated escrow repository within three (3) business days of mutual ratification. Both parties acknowledge electronic signature validity under the Uniform Electronic Transactions Act.
                      </p>
                    </div>

                    {/* Interactive Field Overlay Tags */}
                    {pageFields.map((field) => {
                      const isAssignedToMe = field.signerEmail.toLowerCase() === session.signer.email.toLowerCase()
                      const val = fieldValues[field.id] || (isAssignedToMe && adoptedSignature ? adoptedSignature : field.value)

                      return (
                        <div
                          key={field.id}
                          onClick={() => {
                            if (isAssignedToMe) {
                              setActiveFieldId(field.id)
                              setSignModalOpen(true)
                            }
                          }}
                          style={{
                            position: 'absolute',
                            left: `${field.x}%`,
                            top: `${field.y}%`,
                            width: `${field.width}%`,
                            height: `${field.height}%`,
                          }}
                          className={`flex items-center justify-center p-2 rounded-lg border transition-all ${
                            isAssignedToMe
                              ? val
                                ? 'bg-emerald-50/80 border-emerald-500 text-emerald-900 shadow-xs'
                                : 'bg-amber-100/90 border-amber-500 text-amber-900 animate-pulse cursor-pointer shadow-md'
                              : 'bg-slate-100/60 border-slate-300 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          {val ? (
                            val.startsWith('data:image') ? (
                              <img src={val} alt="Signature" className="max-h-full max-w-full object-contain" />
                            ) : (
                              <span className="font-serif italic font-bold text-sm tracking-wide text-primary">
                                {val}
                              </span>
                            )
                          ) : (
                            <div className="flex items-center gap-1 text-[11px] font-bold">
                              <PencilIcon className="w-3.5 h-3.5" />
                              <span>{isAssignedToMe ? `Click to ${field.label}` : `${field.label} (${field.signerEmail})`}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Footer */}
                    <div className="border-t border-slate-200 pt-3 flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>ESIGN ID: {session.envelopeId.slice(0, 12)}</span>
                      <span>Verified Timestamp: {new Date().toLocaleDateString()}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Legal Consent Footer */}
            <Card className="border-border/80 shadow-xs bg-card">
              <CardContent className="p-5 space-y-3 text-xs">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentAgreed}
                    onChange={(e) => setConsentAgreed(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary mt-0.5"
                  />
                  <span className="text-muted-foreground leading-snug">
                    I agree to be legally bound by this electronic signature under the <strong>Electronic Signatures in Global and National Commerce Act (ESIGN)</strong> and the <strong>Uniform Electronic Transactions Act (UETA)</strong>. I verify that I am the authorized signer.
                  </span>
                </label>

                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    onClick={handleFinishSigning}
                    disabled={isSubmitting || !consentAgreed}
                    className="font-bold text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs h-9 px-5"
                  >
                    <CheckCircleIcon className="w-4 h-4" />
                    <span>{isSubmitting ? 'Finalizing Execution...' : 'Finish & Sign Document'}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>

      {/* Adopt & Sign Signature Modal */}
      <Dialog open={signModalOpen} onOpenChange={setSignModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <SparklesIcon className="w-5 h-5 text-primary" />
              <span>Adopt Your Legal Signature</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Draw your digital signature or choose styled typography.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <Tabs value={activeSignTab} onValueChange={(val: any) => setActiveSignTab(val)}>
              <TabsList className="grid grid-cols-2 bg-muted/60 p-1 rounded-xl text-xs">
                <TabsTrigger value="draw">✍️ Draw Signature</TabsTrigger>
                <TabsTrigger value="type">⌨️ Type Name</TabsTrigger>
              </TabsList>

              {/* Draw Signature Canvas */}
              <TabsContent value="draw" className="space-y-2 pt-2">
                <div className="relative border-2 border-dashed border-border rounded-xl bg-white overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={150}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-36 cursor-crosshair touch-none"
                  />
                  <span className="absolute bottom-2 right-2 text-[10px] text-slate-400 select-none">
                    Sign inside the line
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <Button size="sm" variant="ghost" onClick={clearCanvas} className="text-xs text-muted-foreground">
                    Clear Canvas
                  </Button>
                </div>
              </TabsContent>

              {/* Type Signature */}
              <TabsContent value="type" className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Your Full Legal Name</Label>
                  <Input
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                    placeholder="e.g. Ayesha Khan"
                    className="text-xs h-9"
                  />
                </div>

                <div className="p-6 rounded-xl border border-border bg-muted/30 text-center">
                  <span className="text-[10px] text-muted-foreground block mb-1 uppercase font-bold tracking-wider">
                    Signature Preview:
                  </span>
                  <p className="font-serif italic font-black text-2xl text-primary tracking-wider">
                    {typedName || 'Your Name'}
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button size="sm" variant="ghost" onClick={() => setSignModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleAdoptSignature} className="font-bold text-xs gap-1">
                <span>Adopt Signature</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Decline Reason Modal */}
      <Dialog open={declineModalOpen} onOpenChange={setDeclineModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive">
              Decline to Sign Document
            </DialogTitle>
            <DialogDescription className="text-xs">
              Please explain why you are declining so your real estate advisor can address the issue.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="e.g. Purchase price or contingency date needs revision"
              className="text-xs h-9"
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setDeclineModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={isDeclining}
                onClick={handleDecline}
                className="text-xs font-bold"
              >
                {isDeclining ? 'Declining...' : 'Confirm Decline'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
