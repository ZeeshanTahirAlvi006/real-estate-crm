import React, { useState } from 'react'
import {
  useGetWhatsAppTemplatesQuery,
  useSendWhatsAppMessageMutation,
} from '@/store/api/communicationApi'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  PaperAirplaneIcon,
  DocumentTextIcon,
  InformationCircleIcon, SparklesIcon,
} from '@heroicons/react/24/outline'
import type { ConversationThread } from '@/types/communication'
import { toast } from 'sonner'

interface WhatsAppTemplateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversation: ConversationThread
}

export const WhatsAppTemplateModal: React.FC<WhatsAppTemplateModalProps> = ({
  open,
  onOpenChange,
  conversation,
}) => {
  const { data: templates = [], isLoading } = useGetWhatsAppTemplatesQuery()
  const [sendWhatsApp, { isLoading: isSending }] = useSendWhatsAppMessageMutation()

  const [selectedTemplateName, setSelectedTemplateName] = useState<string>('hello_world')
  const [variableValues, setVariableValues] = useState<Record<string, string>>({
    firstName: conversation.contactName ? conversation.contactName.split(' ')[0] : 'Valued Client',
    propertyAddress: '120 Ocean View Dr, Malibu',
    estimatedValue: '$875,000',
    cmaLink: 'https://proppulse.io/cma',
    showingTime: 'Saturday at 2:00 PM',
    agentName: 'Your Dedicated Advisor',
    neighborhood: 'Downtown Malibu',
    priceDropAmount: '$25,000',
    newPrice: '$850,000',
  })

  const selectedTemplate = templates.find((t) => t.name === selectedTemplateName) || templates[0]

  const handleSend = async () => {
    if (!selectedTemplate) return

    try {
      const payload = {
        conversationId: conversation.id,
        contactId: conversation.contactId || undefined,
        toPhone: conversation.contactPhone || '+13105550199',
        type: 'template' as const,
        templateName: selectedTemplate.name,
        templateVariables: variableValues,
      }

      await sendWhatsApp(payload).unwrap()

      toast.success(`WhatsApp template "${selectedTemplate.title}" dispatched!`)
      onOpenChange(false)
    } catch (err: any) {
      const errorMsg = err?.data?.message || err?.message || 'Failed to send WhatsApp template'
      toast.error(errorMsg, { duration: 7000 })
    }
  }

  const renderPreviewText = () => {
    if (!selectedTemplate) return ''
    let text = selectedTemplate.bodyText
    for (const [k, v] of Object.entries(variableValues)) {
      text = text.replace(new RegExp(`{{${k}}}`, 'g'), v || `[${k}]`)
    }
    return text
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <DocumentTextIcon className="w-5 h-5" />
            </div>
            <span>Send WhatsApp Business Template</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Meta Cloud API template delivery to{' '}
            <span className="font-semibold text-foreground">{conversation.contactName || 'Lead'}</span>{' '}
            ({conversation.contactPhone || 'Phone unassigned'}).
          </DialogDescription>
        </DialogHeader>

        {/* Sandbox Notice Banner */}
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-2.5 text-xs">
          <InformationCircleIcon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-muted-foreground">
            <p>
              <strong className="text-foreground">Meta Sandbox Testing Notice:</strong> Use{' '}
              <span className="font-mono text-primary font-semibold">hello_world</span> to test instant live delivery. Custom templates (like Property Brochure) require approval in your Meta Business Account.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Template Selector Grid */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Select WhatsApp Template</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {templates.map((tmpl) => {
                  const isHelloWorld = tmpl.name === 'hello_world'
                  const isSelected = selectedTemplateName === tmpl.name

                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => setSelectedTemplateName(tmpl.name)}
                      className={`p-3 rounded-xl border text-left transition-all ${isSelected
                        ? 'border-emerald-500 bg-emerald-500/10 shadow-xs'
                        : 'border-border bg-card hover:bg-muted/40'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isHelloWorld && <SparklesIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                          <span className="font-bold text-xs text-foreground truncate">{tmpl.title}</span>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[9px] uppercase tracking-wider ${isHelloWorld ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : ''
                            }`}
                        >
                          {isHelloWorld ? 'Meta Pre-Approved' : tmpl.category}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">{tmpl.bodyText}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Variable Inputs */}
            {selectedTemplate && selectedTemplate.variables.length > 0 && (
              <div className="space-y-2 bg-muted/30 p-3.5 rounded-xl border border-border/70">
                <span className="text-xs font-semibold text-foreground block">
                  Template Variables Configuration
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {selectedTemplate.variables.map((v) => (
                    <div key={v} className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground font-mono">
                        {`{{${v}}}`}
                      </Label>
                      <Input
                        value={variableValues[v] || ''}
                        onChange={(e) =>
                          setVariableValues((prev) => ({ ...prev, [v]: e.target.value }))
                        }
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live WhatsApp Message Bubble Preview */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Live WhatsApp Message Preview</Label>
              <div className="p-4 rounded-2xl bg-[#0b141a] dark:bg-[#0b141a] text-white border border-[#222e35] shadow-inner font-sans space-y-2">
                <div className="max-w-md bg-[#005c4b] p-3.5 rounded-2xl rounded-tr-none text-xs leading-relaxed space-y-2 ml-auto shadow-md">
                  {selectedTemplate?.headerText && (
                    <p className="font-bold text-emerald-200 text-xs border-b border-emerald-400/20 pb-1">
                      {selectedTemplate.headerText}
                    </p>
                  )}
                  <p className="whitespace-pre-line">{renderPreviewText()}</p>
                  {selectedTemplate?.footerText && (
                    <p className="text-[10px] text-white/60 pt-1">{selectedTemplate.footerText}</p>
                  )}
                </div>

                {/* WhatsApp Interactive Buttons */}
                {selectedTemplate?.buttons && selectedTemplate.buttons.length > 0 && (
                  <div className="max-w-md ml-auto space-y-1">
                    {selectedTemplate.buttons.map((btn, idx) => (
                      <div
                        key={idx}
                        className="bg-[#202c33] hover:bg-[#2a3942] text-[#00a884] text-xs font-semibold p-2 rounded-xl text-center border border-[#374248] cursor-pointer"
                      >
                        {btn.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSend}
            disabled={isSending || !selectedTemplate}
            className="text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <PaperAirplaneIcon className="w-3.5 h-3.5" />
            <span>{isSending ? 'Sending...' : 'Send WhatsApp Template'}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
