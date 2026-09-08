import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useGetContactsQuery } from '@/store/api/contactsApi'
import { useStartConversationMutation } from '@/store/api/communicationApi'
import type { Contact } from '@/types'
import type { ChannelType, QuickReplyTemplate } from '@/types/communication'
import { toast } from 'sonner'
import {
  MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  PhoneIcon,
  UserIcon,
  CheckCircleIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

interface StartConversationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConversationCreated: (conversationId: string) => void
  quickTemplates?: QuickReplyTemplate[]
  defaultChannel?: ChannelType
}

const scoreColor = (score: number) => {
  if (score >= 80) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
  if (score >= 50) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
  return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
}

export const StartConversationModal: React.FC<StartConversationModalProps> = ({
  open,
  onOpenChange,
  onConversationCreated,
  quickTemplates = [],
  defaultChannel = 'whatsapp',
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<ChannelType>(defaultChannel)
  const [initialMessage, setInitialMessage] = useState('')

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 250)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Reset form on open/close
  useEffect(() => {
    if (!open) {
      setSearchTerm('')
      setSelectedContact(null)
      setSelectedChannel(defaultChannel)
      setInitialMessage('')
    } else {
      setSelectedChannel(defaultChannel)
    }
  }, [open, defaultChannel])

  // Fetch contacts matching search
  const { data: contactsData, isLoading: loadingContacts } = useGetContactsQuery(
    {
      search: debouncedSearch.trim() || undefined,
      limit: 15,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    },
    { skip: !open }
  )

  const contacts = contactsData?.contacts || []

  // Mutation
  const [startConversation, { isLoading: isStarting }] = useStartConversationMutation()

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact)
    if (defaultChannel === 'email' && contact.email) {
      setSelectedChannel('email')
    } else if (defaultChannel === 'whatsapp' && contact.phone) {
      setSelectedChannel('whatsapp')
    } else if (contact.phone) {
      setSelectedChannel('whatsapp')
    } else if (contact.email) {
      setSelectedChannel('email')
    } else {
      setSelectedChannel(defaultChannel)
    }
  }

  const handleApplyTemplate = (templateBody: string) => {
    if (!selectedContact) return
    const personalized = templateBody
      .replace(/{{first_name}}/gi, selectedContact.firstName)
      .replace(/{{last_name}}/gi, selectedContact.lastName)
    setInitialMessage(personalized)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedContact) {
      toast.error('Please select a contact')
      return
    }

    if (selectedChannel === 'email' && !selectedContact.email) {
      toast.error('Selected contact does not have a valid email address')
      return
    }

    if ((selectedChannel === 'sms' || selectedChannel === 'whatsapp') && !selectedContact.phone) {
      toast.error(`Selected contact does not have a phone number for ${selectedChannel.toUpperCase()}`)
      return
    }

    try {
      const result = await startConversation({
        contactId: selectedContact.id,
        channel: selectedChannel,
        initialMessage: initialMessage.trim() || undefined,
      }).unwrap()

      toast.success(
        initialMessage.trim()
          ? `Message sent to ${selectedContact.firstName} ${selectedContact.lastName}`
          : `Conversation opened with ${selectedContact.firstName} ${selectedContact.lastName}`
      )

      onOpenChange(false)
      if (result?.id) {
        onConversationCreated(result.id)
      }
    } catch {
      toast.error('Failed to start conversation. Please try again.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <ChatBubbleLeftRightIcon className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">Start New Conversation</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Reach out to any contact in your directory via SMS, WhatsApp, or Email.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. Contact Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center justify-between">
              <span>1. Select Contact</span>
              {selectedContact && (
                <button
                  type="button"
                  onClick={() => setSelectedContact(null)}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  <XMarkIcon className="w-3.5 h-3.5" /> Change Contact
                </button>
              )}
            </label>

            {selectedContact ? (
              <div className="p-3.5 rounded-xl border border-primary/40 bg-primary/5 flex items-center justify-between gap-3 animate-in fade-in-50">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary/20 text-primary font-bold text-sm flex items-center justify-center shrink-0">
                    {selectedContact.firstName?.[0]}
                    {selectedContact.lastName?.[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground truncate">
                        {selectedContact.firstName} {selectedContact.lastName}
                      </span>
                      <Badge variant="outline" className={`text-[10px] font-bold ${scoreColor(selectedContact.leadScore || 50)}`}>
                        Score {selectedContact.leadScore || 50}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 truncate">
                      {selectedContact.phone && (
                        <span className="flex items-center gap-1">
                          <PhoneIcon className="w-3.5 h-3.5" /> {selectedContact.phone}
                        </span>
                      )}
                      {selectedContact.email && (
                        <span className="flex items-center gap-1">
                          <EnvelopeIcon className="w-3.5 h-3.5" /> {selectedContact.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <CheckCircleIcon className="w-5 h-5 text-primary shrink-0" />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <MagnifyingGlassIcon className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by contact name, phone, or email..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-muted/40 border border-border/70 focus:outline-none focus:ring-1 focus:ring-primary"
                    autoFocus
                  />
                </div>

                {/* Contact Search Results List */}
                <div className="max-h-48 overflow-y-auto divide-y divide-border/40 border border-border/60 rounded-xl bg-muted/10">
                  {loadingContacts ? (
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-9 w-full rounded-lg" />
                      <Skeleton className="h-9 w-full rounded-lg" />
                      <Skeleton className="h-9 w-full rounded-lg" />
                    </div>
                  ) : contacts.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground space-y-1">
                      <UserIcon className="w-6 h-6 mx-auto text-muted-foreground/60" />
                      <p className="font-semibold text-foreground">No contacts found</p>
                      <p>Try searching with another name, phone number, or email.</p>
                    </div>
                  ) : (
                    contacts.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => handleSelectContact(c)}
                        className="p-2.5 px-3 flex items-center justify-between hover:bg-primary/10 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground font-bold text-xs flex items-center justify-center shrink-0">
                            {c.firstName?.[0]}
                            {c.lastName?.[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">
                              {c.firstName} {c.lastName}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {c.phone || c.email || 'No direct phone/email'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {c.tags?.slice(0, 1).map((t, idx) => (
                            <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium truncate max-w-22.5">
                              {t}
                            </span>
                          ))}
                          <Badge variant="outline" className={`text-[10px] font-bold ${scoreColor(c.leadScore || 50)}`}>
                            {c.leadScore || 50}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. Communication Channel */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider">
              2. Select Channel
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* WhatsApp Option */}
              <button
                type="button"
                onClick={() => setSelectedChannel('whatsapp')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1.5 ${selectedChannel === 'whatsapp'
                    ? 'border-emerald-500 bg-emerald-500/10 shadow-xs ring-1 ring-emerald-500'
                    : 'border-border/80 bg-card hover:bg-muted/30'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">WhatsApp</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold">
                    Instant
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground">WhatsApp business chat</span>
              </button>

              {/* Email Option */}
              <button
                type="button"
                onClick={() => setSelectedChannel('email')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1.5 ${selectedChannel === 'email'
                    ? 'border-blue-500 bg-blue-500/10 shadow-xs ring-1 ring-blue-500'
                    : 'border-border/80 bg-card hover:bg-muted/30'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Email</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold">
                    Inbound Thread
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground">Direct email message</span>
              </button>
            </div>

            {/* Validation warning hints */}
            {selectedContact && selectedChannel === 'whatsapp' && !selectedContact.phone && (
              <p className="text-xs text-destructive flex items-center gap-1 font-medium">
                ⚠️ Warning: {selectedContact.firstName} does not have a phone number saved for WhatsApp.
              </p>
            )}
            {selectedContact && selectedChannel === 'email' && !selectedContact.email && (
              <p className="text-xs text-destructive flex items-center gap-1 font-medium">
                ⚠️ Warning: {selectedContact.firstName} does not have an email address saved.
              </p>
            )}
          </div>

          {/* 3. Initial Message */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                3. Initial Message <span className="text-muted-foreground font-normal lowercase">(optional)</span>
              </label>
              {quickTemplates.length > 0 && selectedContact && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <SparklesIcon className="w-3.5 h-3.5 text-primary" /> Quick templates available
                </span>
              )}
            </div>

            {/* Quick Template Chips */}
            {quickTemplates.length > 0 && selectedContact && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {quickTemplates.slice(0, 4).map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl.body)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-primary/10 hover:text-primary hover:border-primary/40 border border-border/60 transition-colors whitespace-nowrap font-medium"
                  >
                    {tmpl.title}
                  </button>
                ))}
              </div>
            )}

            <Textarea
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              placeholder="Type your opening message here, or leave blank to open an empty conversation..."
              className="text-xs rounded-xl min-h-22.5 resize-none"
            />
          </div>
        </form>

        <DialogFooter className="p-4 px-6 border-t border-border/60 bg-muted/20 flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isStarting}
            className="text-xs rounded-xl"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedContact || isStarting}
            className="text-xs font-bold rounded-xl gap-2 shadow-sm"
          >
            {isStarting ? (
              'Initiating...'
            ) : initialMessage.trim() ? (
              <>
                <ChatBubbleLeftRightIcon className="w-4 h-4" /> Send & Start Conversation
              </>
            ) : (
              <>
                <ChatBubbleLeftRightIcon className="w-4 h-4" /> Open Conversation Thread
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
