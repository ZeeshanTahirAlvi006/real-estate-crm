import { useState, useEffect } from 'react'
import {
  DocumentTextIcon,
  UserPlusIcon,
  PaperAirplaneIcon,
  TagIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useGetESignTemplatesQuery, usePrepareEnvelopeMutation } from '@/store/api/esignApi'
import { toast } from 'sonner'
import type { SignerInput, FieldInput } from '@/types/esign'

interface ESignPrepareModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transactionId?: string
  dealId?: string
  defaultClientName?: string
  defaultClientEmail?: string
  onEnvelopeCreated?: (envelopeId: string) => void
}

export function ESignPrepareModal({
  open,
  onOpenChange,
  transactionId,
  dealId,
  defaultClientName = '',
  defaultClientEmail = '',
  onEnvelopeCreated,
}: ESignPrepareModalProps) {
  const { data: templates = [] } = useGetESignTemplatesQuery()
  const [prepareEnvelope, { isLoading: isPreparing }] = usePrepareEnvelopeMutation()

  const [activeStep, setActiveStep] = useState<'template' | 'signers' | 'fields'>('template')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tpl-purchase-agreement')

  const [title, setTitle] = useState('Standard Residential Purchase & Sale Agreement')
  const [documentUrl, setDocumentUrl] = useState('/sample-contracts/purchase-agreement.pdf')
  const [fileName, setFileName] = useState('Purchase_Agreement_Ratified.pdf')
  const [pageCount, setPageCount] = useState(3)

  const [signers, setSigners] = useState<SignerInput[]>([
    { name: defaultClientName || 'Ayesha Khan', email: defaultClientEmail || 'ayesha.buyer@gmail.com', role: 'buyer' },
    { name: 'Tariq Mehmood', email: 'tariq.seller@gmail.com', role: 'seller' },
  ])

  const [fields, setFields] = useState<FieldInput[]>([])

  // When template changes, load default fields and signers
  useEffect(() => {
    const tpl = templates.find((t) => t.id === selectedTemplateId)
    if (tpl) {
      setTitle(tpl.title)
      setDocumentUrl(tpl.documentUrl)
      setFileName(`${tpl.title.replace(/\s+/g, '_')}.pdf`)
      setPageCount(tpl.pageCount)

      // Map template default fields to signers
      const mappedFields: FieldInput[] = tpl.defaultFields.map((f, idx) => {
        const matchingSigner = signers.find((s) => s.role === f.role) || signers[0]
        return {
          id: `fld-init-${idx}`,
          type: f.type,
          signerEmail: matchingSigner ? matchingSigner.email : signers[0]?.email || '',
          page: f.page,
          x: f.x,
          y: f.y,
          width: f.width,
          height: f.height,
          required: f.required,
          label: f.label,
        }
      })
      setFields(mappedFields)
    }
  }, [selectedTemplateId, templates])

  const handleAddSigner = () => {
    setSigners((prev) => [
      ...prev,
      { name: '', email: '', role: 'buyer' },
    ])
  }

  const handleRemoveSigner = (idx: number) => {
    if (signers.length <= 1) {
      toast.error('Envelope requires at least one recipient signer')
      return
    }
    const removedEmail = signers[idx].email
    setSigners((prev) => prev.filter((_, i) => i !== idx))
    setFields((prev) => prev.filter((f) => f.signerEmail !== removedEmail))
  }

  const handleAddField = (type: 'signature' | 'initials' | 'date') => {
    if (signers.length === 0) return
    const primarySigner = signers[0]
    setFields((prev) => [
      ...prev,
      {
        id: `fld-${Date.now()}`,
        type,
        signerEmail: primarySigner.email,
        page: 1,
        x: 20,
        y: 80,
        width: type === 'date' ? 20 : 30,
        height: 6,
        required: true,
        label: `${type.toUpperCase()} - ${primarySigner.name || 'Signer'}`,
      },
    ])
  }

  const handleRemoveField = (fieldId?: string) => {
    setFields((prev) => prev.filter((f) => f.id !== fieldId))
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Please provide an envelope title')
      return
    }
    for (const s of signers) {
      if (!s.name.trim() || !s.email.trim()) {
        toast.error('All signers must have a valid name and email address')
        return
      }
    }
    if (fields.length === 0) {
      toast.error('Please tag at least one signature or initials field')
      return
    }

    try {
      const res = await prepareEnvelope({
        transactionId,
        dealId,
        title,
        documentUrl,
        fileName,
        pageCount,
        signers,
        fields,
        sendImmediately: true,
      }).unwrap()

      toast.success('Digital signature envelope created & invitations dispatched!')
      if (onEnvelopeCreated) {
        onEnvelopeCreated(res.id)
      }
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to prepare signature envelope')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <DocumentTextIcon className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Prepare Digital Signature Envelope
              </DialogTitle>
              <DialogDescription className="text-xs">
                Legally binding eSignature execution under ESIGN & UETA with audit tracking.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Multi-step Header */}
        <div className="pt-2">
          <Tabs value={activeStep} onValueChange={(val: any) => setActiveStep(val)}>
            <TabsList className="grid grid-cols-3 bg-muted/60 p-1 rounded-xl text-xs">
              <TabsTrigger value="template" className="gap-1.5 py-1.5">
                <DocumentTextIcon className="w-3.5 h-3.5" />
                <span>1. Select Contract</span>
              </TabsTrigger>
              <TabsTrigger value="signers" className="gap-1.5 py-1.5">
                <UserPlusIcon className="w-3.5 h-3.5" />
                <span>2. Recipients ({signers.length})</span>
              </TabsTrigger>
              <TabsTrigger value="fields" className="gap-1.5 py-1.5">
                <TagIcon className="w-3.5 h-3.5" />
                <span>3. Tagged Fields ({fields.length})</span>
              </TabsTrigger>
            </TabsList>

            {/* Step 1: Template Selection */}
            <TabsContent value="template" className="space-y-4 pt-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Standard Real Estate Contracts</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {templates.map((tpl) => (
                    <div
                      key={tpl.id}
                      onClick={() => setSelectedTemplateId(tpl.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                        selectedTemplateId === tpl.id
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border/80 hover:border-primary/40 bg-card'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold">
                          {tpl.category}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-mono">{tpl.pageCount} Pages</span>
                      </div>
                      <p className="font-bold text-xs text-foreground line-clamp-2">{tpl.title}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-tight">
                        {tpl.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Envelope Title</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-9 text-xs"
                    placeholder="Document Title"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">File Name</Label>
                    <Input
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Document Reference URL</Label>
                    <Input
                      value={documentUrl}
                      onChange={(e) => setDocumentUrl(e.target.value)}
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <Button size="sm" onClick={() => setActiveStep('signers')} className="text-xs font-bold gap-1.5">
                  <span>Next: Configure Recipients</span>
                  <span>→</span>
                </Button>
              </div>
            </TabsContent>

            {/* Step 2: Signers Configuration */}
            <TabsContent value="signers" className="space-y-4 pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-foreground">Designate Document Signers</p>
                  <p className="text-[11px] text-muted-foreground">Each signer receives a unique, authenticated signing link.</p>
                </div>
                <Button size="sm" variant="outline" onClick={handleAddSigner} className="h-8 text-xs gap-1">
                  <PlusIcon className="w-3.5 h-3.5" />
                  <span>Add Signer</span>
                </Button>
              </div>

              <div className="space-y-3">
                {signers.map((signer, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-border/80 bg-muted/20 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                      <Input
                        placeholder="Full Legal Name"
                        value={signer.name}
                        onChange={(e) => {
                          const updated = [...signers]
                          updated[idx].name = e.target.value
                          setSigners(updated)
                        }}
                        className="h-8 text-xs"
                      />
                      <Input
                        placeholder="Signer Email Address"
                        value={signer.email}
                        onChange={(e) => {
                          const updated = [...signers]
                          updated[idx].email = e.target.value
                          setSigners(updated)
                        }}
                        className="h-8 text-xs"
                      />
                      <select
                        value={signer.role}
                        onChange={(e) => {
                          const updated = [...signers]
                          updated[idx].role = e.target.value as any
                          setSigners(updated)
                        }}
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium"
                      >
                        <option value="buyer">Buyer</option>
                        <option value="seller">Seller</option>
                        <option value="agent">Designated Agent</option>
                        <option value="broker">Broker of Record</option>
                        <option value="witness">Witness</option>
                      </select>
                    </div>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemoveSigner(idx)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-3">
                <Button size="sm" variant="ghost" onClick={() => setActiveStep('template')} className="text-xs">
                  ← Back
                </Button>
                <Button size="sm" onClick={() => setActiveStep('fields')} className="text-xs font-bold gap-1.5">
                  <span>Next: Review Tagged Fields</span>
                  <span>→</span>
                </Button>
              </div>
            </TabsContent>

            {/* Step 3: Fields Tagging */}
            <TabsContent value="fields" className="space-y-4 pt-3">
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-muted/40 border border-border/80 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">Add Field Tag:</span>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleAddField('signature')}>
                    ✍️ Signature
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleAddField('initials')}>
                    📝 Initials
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleAddField('date')}>
                    📅 Date
                  </Button>
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">{fields.length} Tagged Fields</span>
              </div>

              {/* Tagged Fields List */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {fields.map((field, idx) => (
                  <div key={field.id || idx} className="p-3 rounded-xl border border-border/70 bg-card flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <Badge variant="outline" className="text-[10px] uppercase font-bold">
                        {field.type}
                      </Badge>
                      <div>
                        <p className="font-semibold text-foreground">{field.label}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          Assigned: {field.signerEmail} • Page {field.page}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] font-mono">
                        X: {field.x}% | Y: {field.y}%
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveField(field.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Execution Actions */}
              <div className="flex justify-between items-center pt-3 border-t border-border">
                <Button size="sm" variant="ghost" onClick={() => setActiveStep('signers')} className="text-xs">
                  ← Back
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={isPreparing}
                  className="font-bold text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  <PaperAirplaneIcon className="w-4 h-4" />
                  <span>{isPreparing ? 'Preparing...' : 'Send Signing Requests'}</span>
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
