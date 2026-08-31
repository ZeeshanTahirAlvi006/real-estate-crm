import { useState } from 'react'
import {
  SparklesIcon,
  PaperAirplaneIcon,
  PhoneArrowUpRightIcon,
  UserIcon,
  CheckBadgeIcon,
  ArrowPathIcon,
  SpeakerWaveIcon
} from '@heroicons/react/24/outline'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useSimulateAiChatMutation } from '@/store/api/communicationApi'

interface Message {
  id: string
  sender: 'lead' | 'ai'
  text: string
  timestamp: string
  extractedData?: Record<string, string>
  fairHousingPassed?: boolean
  fairHousingFlags?: string[]
}

const samplePrompts = [
  'Hi, I saw 1204 Pine St on Zillow. Can I tour it Saturday at 2 PM?',
  'What is the price on the downtown condo? I don’t have pre-approval yet.',
  'I need to sell my home in Dallas before I can buy in Austin. Budget is around $850k.',
  'Looking for a 4-bedroom home with a pool under $600k in Round Rock, ready now.',
]

const personas = [
  { id: 'consultative', name: 'Warm Consultative', desc: 'Empathic, friendly, guides first-time buyers' },
  { id: 'luxury', name: 'Luxury Concierge', desc: 'Polished, discreet, high-net-worth vernacular' },
  { id: 'investor', name: 'Analytical & Direct', desc: 'ROI-focused, cap rates, swift action' },
]

export const AiIsaSimulator: React.FC = () => {
  const [selectedPersona, setSelectedPersona] = useState('consultative')
  const [channel, setChannel] = useState<'sms' | 'whatsapp' | 'voice'>('sms')
  const [inputMessage, setInputMessage] = useState('')
  const [warmTransferTriggered, setWarmTransferTriggered] = useState(false)
  const [warmTransferReason, setWarmTransferReason] = useState<string | null>(null)

  const [simulateChat, { isLoading: isTyping }] = useSimulateAiChatMutation()

  const [extractedLead, setExtractedLead] = useState({
    budget: '$650,000 - $800,000',
    timeline: 'Within 30 Days',
    location: 'Austin / Round Rock',
    preApproved: 'In Progress (Chase)',
    hasHomeToSell: 'Yes (Dallas)',
    score: 88,
  })

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm-1',
      sender: 'lead',
      text: 'Hi, I saw your listing on Highland Ave. Is it still available for a private showing?',
      timestamp: '10:42 AM',
      fairHousingPassed: true,
    },
    {
      id: 'm-2',
      sender: 'ai',
      text: 'Hi there! Yes, 1420 Highland Ave is currently active. We have private walkthrough slots available this Saturday at 11:00 AM and 2:00 PM. Would either of those work for you?',
      timestamp: '10:42 AM',
      fairHousingPassed: true,
    },
  ])

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage
    if (!text.trim()) return

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'lead',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    setInputMessage('')

    try {
      const res = await simulateChat({
        leadMessage: text.trim(),
        currentCriteriaState: {
          budget: extractedLead.budget !== 'Pending' ? extractedLead.budget : undefined,
          timeline: extractedLead.timeline !== 'Pending' ? extractedLead.timeline : undefined,
          location: extractedLead.location !== 'Pending' ? extractedLead.location : undefined,
        },
      }).unwrap()

      if (res.extractedCriteria) {
        setExtractedLead((prev) => ({
          ...prev,
          budget: res.extractedCriteria.budget || prev.budget,
          timeline: res.extractedCriteria.timeline || prev.timeline,
          location: res.extractedCriteria.location || prev.location,
          preApproved: res.extractedCriteria.preApproval
            ? res.extractedCriteria.preApproval === 'approved'
              ? 'Pre-Approved'
              : res.extractedCriteria.preApproval === 'cash'
                ? 'Cash Buyer'
                : 'Needs Lender Intro'
            : prev.preApproved,
          hasHomeToSell: res.extractedCriteria.homeToSell
            ? res.extractedCriteria.homeToSell === 'selling_first'
              ? 'Must Sell First'
              : res.extractedCriteria.homeToSell === 'yes'
                ? 'Owns Home'
                : 'No'
            : prev.hasHomeToSell,
          score: res.isQualified ? 95 : Math.min(100, prev.score + 5),
        }))
      }

      if (res.handoffTriggered) {
        setWarmTransferTriggered(true)
        setWarmTransferReason(res.handoffReason || 'Lead Qualified for Human Handoff')
      }

      const aiMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        sender: 'ai',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        fairHousingPassed: res.fairHousingPassed,
        fairHousingFlags: res.fairHousingFlags,
      }

      setMessages((prev) => [...prev, aiMsg])
    } catch {
      toast.error('Simulation error')
    }
  }

  const handleResetSimulation = () => {
    setMessages([
      {
        id: 'm-1',
        sender: 'lead',
        text: 'Hi, I saw your listing on Highland Ave. Is it still available for a private showing?',
        timestamp: '10:42 AM',
        fairHousingPassed: true,
      },
      {
        id: 'm-2',
        sender: 'ai',
        text: 'Hi there! Yes, 1420 Highland Ave is currently active. We have private walkthrough slots available this Saturday at 11:00 AM and 2:00 PM. Would either of those work for you?',
        timestamp: '10:42 AM',
        fairHousingPassed: true,
      },
    ])
    setWarmTransferTriggered(false)
    setWarmTransferReason(null)
    setExtractedLead({
      budget: '$650,000 - $800,000',
      timeline: 'Within 30 Days',
      location: 'Austin / Round Rock',
      preApproved: 'In Progress (Chase)',
      hasHomeToSell: 'Yes (Dallas)',
      score: 88,
    })
    toast.info('AI ISA Simulator reset')
  }

  return (
    <div className="space-y-6">
      {/* Simulation Controls Header */}
      <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">
              Live AI Sandbox (Low-Latency &lt;600ms)
            </span>
          </div>
          <h3 className="text-xl font-bold text-foreground">
            Omnichannel Conversational ISA Simulator
          </h3>
          <p className="text-xs text-muted-foreground max-w-xl">
            Test how the AI ISA interacts with inbound buyers, dynamically extracts intent criteria, and initiates warm agent handoffs.
          </p>
        </div>

        {/* Channel & Persona Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Channel */}
          <div className="flex items-center bg-muted/50 p-1 rounded-xl border border-border/60">
            <button
              type="button"
              onClick={() => setChannel('sms')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                channel === 'sms' ? 'bg-background text-foreground shadow-xs font-semibold' : 'text-muted-foreground'
              )}
            >
              SMS / RCS
            </button>
            <button
              type="button"
              onClick={() => setChannel('whatsapp')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                channel === 'whatsapp' ? 'bg-background text-foreground shadow-xs font-semibold' : 'text-muted-foreground'
              )}
            >
              WhatsApp
            </button>
            <button
              type="button"
              onClick={() => setChannel('voice')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1',
                channel === 'voice' ? 'bg-background text-foreground shadow-xs font-semibold' : 'text-muted-foreground'
              )}
            >
              <SpeakerWaveIcon className="w-3.5 h-3.5" />
              Voice AI
            </button>
          </div>

          {/* Reset */}
          <Button variant="outline" size="sm" onClick={handleResetSimulation} className="h-9">
            <ArrowPathIcon className="w-3.5 h-3.5 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      {/* Main Simulator Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Chat Feed (2 Cols) */}
        <div className="lg:col-span-2 bg-card border border-border/80 rounded-3xl overflow-hidden shadow-sm flex flex-col h-140">
          {/* Chat Header */}
          <div className="px-6 py-3.5 border-b border-border/60 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                AI
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground">PropPulse AI ISA</span>
                  <Badge variant="secondary" className="text-[10px] h-4.5">
                    {personas.find((p) => p.id === selectedPersona)?.name}
                  </Badge>
                </div>
                <p className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                  Latency: 480ms (Streaming)
                </p>
              </div>
            </div>

            {/* Persona Preset Selector */}
            <div className="flex items-center gap-1">
              {personas.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPersona(p.id)}
                  className={cn(
                    'px-2.5 py-1 text-[11px] rounded-lg border transition-colors',
                    selectedPersona === p.id
                      ? 'bg-primary/10 border-primary/30 text-primary font-semibold'
                      : 'border-border/50 text-muted-foreground hover:bg-muted'
                  )}
                  title={p.desc}
                >
                  {p.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Messages Scroll View */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-muted/5">
            {messages.map((m) => {
              const isLead = m.sender === 'lead'
              return (
                <div
                  key={m.id}
                  className={cn(
                    'flex items-end gap-2 max-w-[82%]',
                    isLead ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  )}
                >
                  <div
                    className={cn(
                      'h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-xs',
                      isLead ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground'
                    )}
                  >
                    {isLead ? <UserIcon className="w-3.5 h-3.5" /> : <SparklesIcon className="w-3.5 h-3.5" />}
                  </div>

                  <div
                    className={cn(
                      'p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs',
                      isLead
                        ? 'bg-primary text-primary-foreground rounded-br-xs'
                        : 'bg-card border border-border/80 text-foreground rounded-bl-xs'
                    )}
                  >
                    <p>{m.text}</p>
                    <span
                      className={cn(
                        'block text-[10px] mt-1 text-right opacity-70',
                        isLead ? 'text-primary-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {m.timestamp}
                    </span>
                  </div>
                </div>
              )
            })}

            {isTyping && (
              <div className="flex items-center gap-2 mr-auto text-xs text-muted-foreground bg-card border border-border/60 px-3 py-2 rounded-xl">
                <span className="flex gap-1 items-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.2s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.4s]" />
                </span>
                <span>AI ISA is typing...</span>
              </div>
            )}
          </div>

          {/* Quick Prompts Bar */}
          <div className="px-4 py-2 border-t border-border/40 bg-muted/30 flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase shrink-0">
              Test Inquiries:
            </span>
            {samplePrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(p)}
                className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full bg-background border border-border/60 hover:border-primary/40 hover:text-primary transition-colors text-muted-foreground truncate max-w-xs"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="p-4 border-t border-border/60 bg-card flex items-center gap-3">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage()
              }}
              placeholder="Type simulated lead message (e.g., 'What is the HOA fee on 1420 Highland?')..."
              className="flex-1 text-xs rounded-xl bg-muted/40 border border-border/70 px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button
              size="sm"
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || isTyping}
              className="h-9 px-4 rounded-xl shadow-xs"
            >
              <PaperAirplaneIcon className="w-4 h-4 mr-1" />
              Send
            </Button>
          </div>
        </div>

        {/* Right: Live Extracted Intelligence Card (1 Col) */}
        <div className="space-y-4">
          {/* Warm Transfer Banner when triggered */}
          {warmTransferTriggered && (
            <div className="p-4 rounded-2xl bg-linear-to-r from-emerald-500/15 to-primary/15 border border-emerald-500/30 text-card-foreground shadow-sm animate-in fade-in duration-300">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-500 text-white font-bold shrink-0">
                  <PhoneArrowUpRightIcon className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Human Agent Hand-Off Ready</h4>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                    {warmTransferReason || 'Lead is qualified. Take over conversation with 1 tap.'}
                  </p>
                  <Button
                    size="sm"
                    className="mt-3 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs"
                    onClick={() => toast.success('Agent Takeover Successful')}
                  >
                    1-Tap Human Agent Takeover
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Qualification Intelligence Card */}
          <div className="bg-card border border-border/80 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div>
                <h4 className="font-bold text-sm text-foreground">Live Extracted Data</h4>
                <p className="text-[11px] text-muted-foreground">NLP Entity Recognition</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-primary">{extractedLead.score}%</span>
                <span className="text-[10px] text-muted-foreground block">Qualification</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Budget Range:</span>
                <span className="font-bold text-foreground">{extractedLead.budget}</span>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Purchase Timeline:</span>
                <span className="font-bold text-emerald-500">{extractedLead.timeline}</span>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Target Locations:</span>
                <span className="font-bold text-foreground">{extractedLead.location}</span>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Pre-Approval:</span>
                <span className="font-semibold text-primary">{extractedLead.preApproved}</span>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Home to Sell:</span>
                <span className="font-semibold text-foreground">{extractedLead.hasHomeToSell}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckBadgeIcon className="w-4 h-4 text-emerald-500" />
                TCPA Compliance Verified
              </span>
              <span>Model: GPT-4o</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
