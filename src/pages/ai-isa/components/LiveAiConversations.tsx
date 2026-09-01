import React, { useState } from 'react'
import {
  useGetConversationsQuery,
  useGetMessagesQuery,
  useTestWhatsAppHandshakeMutation,
  useSimulateWhatsAppInboundMutation,
  useToggleAiIsaMutation,
} from '@/store/api/communicationApi'
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  ArrowTopRightOnSquareIcon,
  DevicePhoneMobileIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

export const LiveAiConversations: React.FC = () => {
  const navigate = useNavigate()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [leadName, setLeadName] = useState('')
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)

  const [sendHandshake, { isLoading: isSendingHandshake }] = useTestWhatsAppHandshakeMutation()
  const [simulateInbound, { isLoading: isSimulatingInbound }] = useSimulateWhatsAppInboundMutation()
  const [toggleAiIsa] = useToggleAiIsaMutation()
  const [inboundReplyText, setInboundReplyText] = useState('')

  // Fetch real live conversations
  const { data: conversations = [], isLoading: loadingConversations, refetch } = useGetConversationsQuery()

  // Filter conversations where AI ISA is active or has messages
  const aiConversations = conversations.filter(
    (c) => c.lastChannel === 'whatsapp' || c.lastChannel === 'sms' || c.aiIsaEnabled
  )

  const activeConvId = selectedConversationId || (aiConversations[0]?.id ?? null)
  const activeConversation = conversations.find((c) => c.id === activeConvId)

  // Fetch live messages for active conversation
  const { data: messages = [], isLoading: loadingMessages } = useGetMessagesQuery(activeConvId || '', {
    skip: !activeConvId,
  })

  const handleSendTestHandshake = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phoneNumber.trim()) {
      toast.error('Please enter a WhatsApp phone number')
      return
    }

    try {
      const res = await sendHandshake({
        phone: phoneNumber.trim(),
        leadName: leadName.trim() || 'My WhatsApp Lead',
      }).unwrap()

      toast.success(res.message || 'WhatsApp message sent! Check your phone.')
      setSelectedConversationId(res.conversationId)
      refetch()
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Failed to send WhatsApp message')
    }
  }

  const handleSimulateInbound = async (customText?: string) => {
    const textToSend = customText || inboundReplyText
    if (!textToSend.trim() || !activeConversation) return

    try {
      const phone = activeConversation.contactPhone || phoneNumber || '13105550199'
      await simulateInbound({
        fromPhone: phone,
        text: textToSend.trim(),
      }).unwrap()

      toast.success('Inbound WhatsApp message processed by AI ISA!')
      setInboundReplyText('')
      refetch()
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Failed to simulate inbound message')
    }
  }

  const handleToggleAutopilot = async (conversationId: string, currentStatus?: boolean) => {
    try {
      await toggleAiIsa({ conversationId, enabled: !currentStatus }).unwrap()
      toast.success(!currentStatus ? 'AI Autopilot enabled for lead' : 'AI Autopilot paused (Human Takeover)')
    } catch {
      toast.error('Failed to toggle AI state')
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner: Interactive WhatsApp Test Launcher */}
      <div className="bg-linear-to-br from-emerald-500/10 via-card to-card border border-emerald-500/30 rounded-3xl p-6 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-6 space-y-2">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
              <DevicePhoneMobileIcon className="w-4 h-4" />
              <span>Live WhatsApp Omnichannel AI Connection</span>
            </div>
            <h3 className="text-xl font-extrabold text-foreground">
              Experience the AI ISA on Your WhatsApp Phone
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Enter your WhatsApp number below to receive an instant live inquiry greeting from the AI ISA. When you reply from your phone, the AI ISA will qualify you autonomously in real time!
            </p>
          </div>

          <div className="lg:col-span-6">
            <form onSubmit={handleSendTestHandshake} className="bg-background/80 backdrop-blur-sm border border-border/80 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full p-2.5 rounded-xl bg-card border border-border/70 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    WhatsApp Phone Number (with Country Code)
                  </label>
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g. +1 512 555 0199 or +92 300..."
                    className="w-full p-2.5 rounded-xl bg-card border border-border/70 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Verified Meta WhatsApp Cloud API / Simulator</span>
                </div>

                <button
                  type="submit"
                  disabled={isSendingHandshake}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all hover:scale-[1.02] flex items-center gap-1.5 disabled:opacity-50"
                >
                  <PaperAirplaneIcon className="w-3.5 h-3.5" />
                  <span>{isSendingHandshake ? 'Dispatching...' : 'Send WhatsApp Message'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Live AI Active Conversations Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-125">
        {/* Left Column: Active AI Lead Queue */}
        <div className="lg:col-span-5 bg-card border border-border/80 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <ChatBubbleLeftRightIcon className="w-4 h-4 text-primary" />
              <h4 className="font-bold text-sm text-foreground">
                Active AI Lead Conversations ({aiConversations.length})
              </h4>
            </div>

            <button
              type="button"
              onClick={() => navigate('/inbox')}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span>Full Inbox</span>
              <ArrowTopRightOnSquareIcon className="w-3 h-3" />
            </button>
          </div>

          {loadingConversations ? (
            <div className="space-y-3 py-4">
              <div className="h-16 bg-muted/40 rounded-2xl animate-pulse" />
              <div className="h-16 bg-muted/40 rounded-2xl animate-pulse" />
              <div className="h-16 bg-muted/40 rounded-2xl animate-pulse" />
            </div>
          ) : aiConversations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-xs space-y-2 my-auto">
              <p>No active conversations yet.</p>
              <p className="text-[11px]">Send a test WhatsApp message above to start a live lead conversation!</p>
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-130 pr-1">
              {aiConversations.map((c) => {
                const isSelected = c.id === activeConvId
                const isWhatsApp = c.lastChannel === 'whatsapp'

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedConversationId(c.id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all text-xs space-y-1.5 ${isSelected
                        ? 'bg-primary/10 border-primary shadow-sm'
                        : 'bg-muted/20 border-border/60 hover:bg-muted/40'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">
                          {c.contactName || c.contactPhone || 'Unknown Lead'}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${isWhatsApp
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                            }`}
                        >
                          {c.lastChannel}
                        </span>
                      </div>

                      <span className="text-[10px] text-muted-foreground font-mono">
                        {c.lastMessage?.createdAt
                          ? new Date(c.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : ''}
                      </span>
                    </div>

                    <p className="text-muted-foreground line-clamp-1 text-[11px]">
                      {c.lastMessage?.body || 'Conversation active'}
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[10px]">
                      <span className="text-muted-foreground font-mono">
                        {c.contactPhone || 'No phone'}
                      </span>
                      <span className="font-bold text-emerald-500 flex items-center gap-1">
                        <SparklesIcon className="w-3 h-3" />
                        <span>AI Autopilot</span>
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Column: Live Conversation Transcript & AI Lead Qualification Card */}
        <div className="lg:col-span-7 bg-card border border-border/80 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          {activeConversation ? (
            <>
              {/* Transcript Header */}
              <div className="flex flex-wrap items-center justify-between pb-3 border-b border-border/60 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">
                      {activeConversation.contactName || 'Lead'}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      ({activeConversation.contactPhone || 'WhatsApp'})
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-500 font-semibold flex items-center gap-1 mt-0.5">
                    <SparklesIcon className="w-3 h-3" />
                    <span>Autonomous AI Qualification in Progress</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleAutopilot(activeConversation.id, activeConversation.aiIsaEnabled)}
                    className="px-3 py-1.5 rounded-xl border border-border/70 hover:bg-muted text-xs font-semibold transition-all"
                  >
                    {activeConversation.aiIsaEnabled !== false ? 'Pause AI (Takeover)' : 'Resume AI'}
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/inbox')}
                    className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all flex items-center gap-1"
                  >
                    <span>Open in Unified Inbox</span>
                    <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Message Bubbles Container */}
              <div className="space-y-3 overflow-y-auto max-h-95 p-2">
                {loadingMessages ? (
                  <div className="text-center text-xs text-muted-foreground py-8">Loading live messages...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-xs text-muted-foreground py-8">
                    No messages yet in this thread. Text from your phone to start chatting!
                  </div>
                ) : (
                  messages.map((m) => {
                    const isLead = m.senderType === 'lead'
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isLead ? 'items-start' : 'items-end'}`}
                      >
                        <span className="text-[10px] text-muted-foreground px-1 mb-0.5 font-medium">
                          {isLead ? `${activeConversation.contactName || 'Lead'} (via WhatsApp)` : 'AI ISA Engine'}
                        </span>
                        <div
                          className={`max-w-[85%] rounded-2xl p-3.5 text-xs shadow-sm ${isLead
                              ? 'bg-muted/60 text-foreground border border-border/70 rounded-tl-sm'
                              : 'bg-emerald-600 text-white rounded-tr-sm'
                            }`}
                        >
                          <p className="leading-relaxed whitespace-pre-wrap">{m.body}</p>
                          <span className={`text-[9px] block text-right mt-1 opacity-75 font-mono`}>
                            {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Interactive Inbound Webhook Simulator Bar */}
              <div className="pt-3 border-t border-border/60 space-y-2">
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    Quick Buyer Inquiry:
                  </span>
                  {[
                    'My budget is around $750k in downtown, looking to move in 60 days.',
                    'Yes, I have pre-approval ready with Chase. Can someone call me?',
                    'I need to sell my existing home first before buying.',
                  ].map((quickText, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSimulateInbound(quickText)}
                      disabled={isSimulatingInbound}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-muted/40 hover:bg-muted border border-border/60 text-foreground transition-all truncate max-w-70"
                    >
                      {quickText}
                    </button>
                  ))}
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleSimulateInbound(); }} className="flex gap-2">
                  <input
                    type="text"
                    value={inboundReplyText}
                    onChange={(e) => setInboundReplyText(e.target.value)}
                    placeholder="Type a lead reply to trigger Meta WhatsApp Inbound Webhook & AI ISA qualification..."
                    className="flex-1 text-xs p-2.5 rounded-xl bg-background border border-border/70 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={isSimulatingInbound || !inboundReplyText.trim()}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <PaperAirplaneIcon className="w-3.5 h-3.5" />
                    <span>{isSimulatingInbound ? 'Processing...' : 'Send as Lead'}</span>
                  </button>
                </form>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live Webhook Pipeline Active</span>
                  </div>
                  <span>Triggering this webhook runs full AI ISA extraction, Fair Housing check & auto-reply</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center my-auto py-16 text-muted-foreground text-xs space-y-2">
              <ChatBubbleLeftRightIcon className="w-8 h-8 mx-auto opacity-40 text-primary" />
              <p className="font-bold text-sm text-foreground">Select a Live Conversation</p>
              <p>Or send a test WhatsApp message using the tool above to see live qualification.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
