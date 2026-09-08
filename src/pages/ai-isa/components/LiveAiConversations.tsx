import React, { useState } from 'react'
import {
  useGetConversationsQuery,
  useGetMessagesQuery,
  useSimulateWhatsAppInboundMutation,
  useToggleAiIsaMutation,
} from '@/store/api/communicationApi'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

export const LiveAiConversations: React.FC = () => {
  const navigate = useNavigate()
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
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

  const handleSimulateInbound = async (customText?: string) => {
    const textToSend = customText || inboundReplyText
    if (!textToSend.trim() || !activeConversation) return

    try {
      const phone = activeConversation.contactPhone || '13105550199'
      await simulateInbound({
        fromPhone: phone,
        text: textToSend.trim(),
      }).unwrap()

      toast.success('Inbound message processed by AI ISA')
      setInboundReplyText('')
      refetch()
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Failed to simulate inbound message')
    }
  }

  const handleToggleAutopilot = async (conversationId: string, currentStatus?: boolean) => {
    try {
      await toggleAiIsa({ conversationId, enabled: !currentStatus }).unwrap()
      toast.success(!currentStatus ? 'AI Autopilot active' : 'AI Autopilot paused')
    } catch {
      toast.error('Failed to toggle AI state')
    }
  }

  return (
    <div className="space-y-6">
      {/* Live AI Active Conversations Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[520px]">
        {/* Left Column: Active AI Lead Queue (5 cols on lg) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#254238] border border-[#D8E2D6] dark:border-[#618764] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/40">
            <div className="flex items-center gap-2">
              <MaterialIcon name="forum" size={18} className="text-[#2B5748] dark:text-[#9CB080]" />
              <h4 className="font-bold text-sm text-[#273338] dark:text-white">
                Active Conversations ({aiConversations.length})
              </h4>
            </div>

            <button
              type="button"
              onClick={() => navigate('/inbox')}
              className="text-xs font-semibold text-[#2B5748] dark:text-[#9CB080] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Full Inbox</span>
              <MaterialIcon name="open_in_new" size={14} />
            </button>
          </div>

          {loadingConversations ? (
            <div className="space-y-3 py-4">
              <div className="h-16 bg-[#EDF2EB] dark:bg-[#1A2E26] rounded-xl animate-pulse" />
              <div className="h-16 bg-[#EDF2EB] dark:bg-[#1A2E26] rounded-xl animate-pulse" />
              <div className="h-16 bg-[#EDF2EB] dark:bg-[#1A2E26] rounded-xl animate-pulse" />
            </div>
          ) : aiConversations.length === 0 ? (
            <div className="text-center py-12 text-[#75887E] dark:text-[#A0B2A6] text-xs space-y-1.5 my-auto">
              <MaterialIcon name="chat_bubble_outline" size={32} className="mx-auto opacity-40 text-[#4A5D54] dark:text-[#A0B2A6]" />
              <p className="font-semibold text-sm text-[#273338] dark:text-white">No active leads</p>
              <p className="text-[11px]">Incoming WhatsApp and email leads will appear here</p>
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[500px] pr-1">
              {aiConversations.map((c) => {
                const isSelected = c.id === activeConvId
                const isWhatsApp = c.lastChannel === 'whatsapp'

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedConversationId(c.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all text-xs space-y-1.5 ${
                      isSelected
                        ? 'bg-[#EDF2EB] dark:bg-[#1A2E26] border-[#9CB080] shadow-xs'
                        : 'bg-white dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764]/50 hover:bg-[#F5F7F4] dark:hover:bg-[#1E282D]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#273338] dark:text-white">
                          {c.contactName || c.contactPhone || 'Lead'}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            isWhatsApp
                              ? 'bg-[#9CB080]/20 text-[#2B5748] dark:text-[#9CB080] border border-[#9CB080]/40'
                              : 'bg-[#EDF2EB] dark:bg-[#2B5748] text-[#4A5D54] dark:text-[#E2ECE4] border border-[#D8E2D6] dark:border-[#618764]'
                          }`}
                        >
                          {c.lastChannel}
                        </span>
                      </div>

                      <span className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] font-mono">
                        {c.lastMessage?.createdAt
                          ? new Date(c.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : ''}
                      </span>
                    </div>

                    <p className="text-[#4A5D54] dark:text-[#A0B2A6] line-clamp-1 text-[11px]">
                      {c.lastMessage?.body || 'Conversation active'}
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[10px]">
                      <span className="text-[#75887E] dark:text-[#A0B2A6] font-mono">
                        {c.contactPhone || 'No phone'}
                      </span>
                      <span className="font-bold text-[#2B5748] dark:text-[#9CB080] flex items-center gap-1">
                        <MaterialIcon name="smart_toy" size={14} />
                        <span>Autopilot</span>
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Column: Live Conversation Transcript (7 cols on lg) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#254238] border border-[#D8E2D6] dark:border-[#618764] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 flex flex-col justify-between">
          {activeConversation ? (
            <>
              {/* Transcript Header */}
              <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/40 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#273338] dark:text-white">
                      {activeConversation.contactName || 'Lead'}
                    </span>
                    <span className="text-xs text-[#75887E] dark:text-[#A0B2A6] font-mono">
                      ({activeConversation.contactPhone || 'Channel'})
                    </span>
                  </div>
                  <span className="text-[11px] text-[#2B5748] dark:text-[#9CB080] font-semibold flex items-center gap-1 mt-0.5">
                    <MaterialIcon name="smart_toy" size={14} />
                    <span>Autonomous AI Qualification</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleAutopilot(activeConversation.id, activeConversation.aiIsaEnabled)}
                    className="px-3 py-1.5 rounded-lg border border-[#D8E2D6] dark:border-[#618764] hover:bg-[#EDF2EB] dark:hover:bg-[#202B2F] text-xs font-semibold text-[#273338] dark:text-white transition-all cursor-pointer"
                  >
                    {activeConversation.aiIsaEnabled !== false ? 'Pause AI' : 'Resume AI'}
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/inbox')}
                    className="px-3 py-1.5 rounded-lg bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] text-xs font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <span>Open Inbox</span>
                    <MaterialIcon name="open_in_new" size={14} />
                  </button>
                </div>
              </div>

              {/* Message Bubbles Container */}
              <div className="space-y-3 overflow-y-auto max-h-[380px] p-2">
                {loadingMessages ? (
                  <div className="text-center text-xs text-[#75887E] dark:text-[#A0B2A6] py-8">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-xs text-[#75887E] dark:text-[#A0B2A6] py-8">
                    No messages in thread yet.
                  </div>
                ) : (
                  messages.map((m) => {
                    const isLead = m.senderType === 'lead'
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isLead ? 'items-start' : 'items-end'}`}
                      >
                        <span className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] px-1 mb-0.5 font-medium">
                          {isLead ? `${activeConversation.contactName || 'Lead'}` : 'AI ISA'}
                        </span>
                        <div
                          className={`max-w-[85%] rounded-xl p-3 text-xs shadow-xs ${
                            isLead
                              ? 'bg-[#EDF2EB] dark:bg-[#202B2F] text-[#273338] dark:text-white border border-[#D8E2D6] dark:border-[#618764]/60 rounded-tl-xs'
                              : 'bg-[#2B5748] text-white border border-[#618764] rounded-tr-xs'
                          }`}
                        >
                          <p className="leading-relaxed whitespace-pre-wrap">{m.body}</p>
                          <span className="text-[9px] block text-right mt-1 opacity-75 font-mono">
                            {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Inbound Simulator Bar */}
              <div className="pt-3 border-t border-[#D8E2D6] dark:border-[#618764]/40 space-y-2">
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] font-semibold uppercase tracking-wider">
                    Quick Inquiry:
                  </span>
                  {[
                    'My budget is $750k in downtown, moving in 60 days.',
                    'Yes, I have pre-approval ready with Chase.',
                    'I need to sell my existing home first.',
                  ].map((quickText, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSimulateInbound(quickText)}
                      disabled={isSimulatingInbound}
                      className="text-[10px] px-2.5 py-1 rounded-md bg-[#EDF2EB] dark:bg-[#202B2F] hover:bg-[#D8E2D6] dark:hover:bg-[#1A2E26] border border-[#D8E2D6] dark:border-[#618764]/50 text-[#273338] dark:text-white transition-all truncate max-w-[200px] cursor-pointer"
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
                    placeholder="Type a lead reply to test AI qualification..."
                    className="flex-1 text-xs p-2.5 rounded-lg bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white placeholder-[#75887E] dark:placeholder-[#A0B2A6] focus:outline-none focus:border-[#9CB080]"
                  />
                  <button
                    type="submit"
                    disabled={isSimulatingInbound || !inboundReplyText.trim()}
                    className="px-4 py-2.5 rounded-lg bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] font-bold text-xs shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <MaterialIcon name="send" size={16} />
                    <span>{isSimulatingInbound ? 'Sending...' : 'Send'}</span>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="text-center my-auto py-16 text-[#75887E] dark:text-[#A0B2A6] text-xs space-y-2">
              <MaterialIcon name="chat" size={32} className="mx-auto opacity-40 text-[#4A5D54] dark:text-[#A0B2A6]" />
              <p className="font-bold text-sm text-[#273338] dark:text-white">Select Conversation</p>
              <p>Choose an active conversation from the list to view live qualification.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

