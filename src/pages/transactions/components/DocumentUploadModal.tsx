import React, { useState } from 'react'
import {
  DocumentArrowUpIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUploadDocumentMutation } from '@/store/api/transactionsApi'
import { toast } from 'sonner'
import type { DocumentCategory } from '@/types/transaction'

interface DocumentUploadModalProps {
  transactionId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  transactionId,
  open,
  onOpenChange,
}) => {
  const [uploadDoc, { isLoading }] = useUploadDocumentMutation()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<DocumentCategory>('contract')
  const [fileName, setFileName] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [clientVisible, setClientVisible] = useState(true)

  const handleSimulateFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFileName(file.name)
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''))
      }
      // Create local object URL for preview and retrieval
      const generatedUrl = URL.createObjectURL(file)
      setFileUrl(generatedUrl)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('Please enter a document title')
      return
    }

    try {
      await uploadDoc({
        transactionId,
        payload: {
          title: title.trim(),
          category,
          fileName: fileName || `${title.toLowerCase().replace(/\s+/g, '-')}.pdf`,
          fileUrl: fileUrl || `https://documents.proppulse.com/escrow/${encodeURIComponent(title)}.pdf`,
          fileSize: 1024 * 142, // ~142 KB
          mimeType: 'application/pdf',
          clientVisible,
        },
      }).unwrap()

      toast.success('Document uploaded and attached to transaction')
      onOpenChange(false)
      setTitle('')
      setFileName('')
      setFileUrl('')
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to upload document')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DocumentArrowUpIcon className="w-5 h-5 text-primary" />
            <span>Upload Transaction Document</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* File Picker */}
          <div className="border-2 border-dashed border-border/80 hover:border-primary/60 rounded-xl p-6 text-center transition-colors">
            <DocumentTextIcon className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-xs font-semibold text-foreground">
              {fileName ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{fileName}</span>
              ) : (
                'Select PDF, DOCX, or scanned disclosure file'
              )}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Maximum file size: 25MB</p>
            <input
              type="file"
              id="file-upload-input"
              className="hidden"
              accept=".pdf,.doc,.docx,.png,.jpg"
              onChange={handleSimulateFilePick}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 text-xs"
              onClick={() => document.getElementById('file-upload-input')?.click()}
            >
              Choose File
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doc-title" className="text-xs font-semibold">
              Document Title *
            </Label>
            <Input
              id="doc-title"
              placeholder="e.g. Purchase & Sale Agreement Signed"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doc-category" className="text-xs font-semibold">
              Category
            </Label>
            <Select
              value={category}
              onValueChange={(val) => val && setCategory(val as DocumentCategory)}
            >
              <SelectTrigger id="doc-category">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contract">Purchase Contract / Addendum</SelectItem>
                <SelectItem value="disclosure">Property Seller Disclosures</SelectItem>
                <SelectItem value="inspection_report">Inspection & Engineering Report</SelectItem>
                <SelectItem value="appraisal">Lender Appraisal Report</SelectItem>
                <SelectItem value="title_commitment">Title Commitment & HOA Docs</SelectItem>
                <SelectItem value="closing_disclosure">Closing Disclosure / Settlement</SelectItem>
                <SelectItem value="other">Other Closing Document</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Client Portal Visibility Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/60">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <ShieldCheckIcon className="w-4 h-4 text-emerald-500" />
                <span>Show in Client VIP Portal</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Client can download this document directly from their portal.
              </p>
            </div>
            <input
              type="checkbox"
              checked={clientVisible}
              onChange={(e) => setClientVisible(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="font-semibold">
              {isLoading ? 'Attaching...' : 'Attach Document'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
