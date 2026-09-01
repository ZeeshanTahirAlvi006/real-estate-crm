import React, { useState, useEffect } from 'react'
import {
  useGetAiIsaConfigQuery,
  useUpdateAiIsaConfigMutation,
} from '@/store/api/communicationApi'
import type { AiIsaConfig } from '@/types/communication'
import {
  Cog6ToothIcon,
  SparklesIcon,
  UserIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { toast } from 'sonner'

export const AiIsaConfigSettings: React.FC = () => {
  const { data: config, isLoading, refetch } = useGetAiIsaConfigQuery()
  const [updateConfig, { isLoading: isSaving }] = useUpdateAiIsaConfigMutation()

  const [formData, setFormData] = useState<Partial<AiIsaConfig>>({
    isEnabled: true,
    autoPilotEnabled: true,
    officeHoursOnly: false,
    autoReplyChannels: ['sms', 'whatsapp', 'email'],
    humanHandoffDelaySeconds: 30,
    qualificationThresholdScore: 80,
    persona: {
      name: 'Maya',
      tone: 'professional',
      agentName: 'AI ISA Specialist',
      brokerageName: '',
      customInstructions: '',
    },
  })

  useEffect(() => {
    if (config) {
      setFormData({
        isEnabled: config.isEnabled,
        autoPilotEnabled: config.autoPilotEnabled,
        officeHoursOnly: config.officeHoursOnly,
        autoReplyChannels: config.autoReplyChannels || ['sms', 'whatsapp', 'email'],
        humanHandoffDelaySeconds: config.humanHandoffDelaySeconds ?? 30,
        qualificationThresholdScore: config.qualificationThresholdScore ?? 80,
        persona: {
          name: config.persona?.name || 'Maya',
          tone: config.persona?.tone || 'professional',
          agentName: config.persona?.agentName || 'AI ISA Specialist',
          brokerageName: config.persona?.brokerageName || '',
          customInstructions: config.persona?.customInstructions || '',
        },
      })
    }
  }, [config])

  const handleChannelToggle = (channel: 'sms' | 'whatsapp' | 'email') => {
    const current = formData.autoReplyChannels || []
    const updated = current.includes(channel)
      ? current.filter((c) => c !== channel)
      : [...current, channel]
    setFormData({ ...formData, autoReplyChannels: updated })
  }

  const handleToneSelect = (tone: 'professional' | 'friendly' | 'concise' | 'consultative') => {
    setFormData({
      ...formData,
      persona: {
        ...(formData.persona as any),
        tone,
      },
    })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await updateConfig(formData).unwrap()
      toast.success('AI ISA configuration & persona updated successfully')
    } catch {
      toast.error('Failed to update AI ISA configuration')
    }
  }

  if (isLoading) {
    return (
      <div className="bg-card border border-border/80 rounded-3xl p-8 animate-pulse space-y-6">
        <div className="h-6 w-48 bg-muted rounded-xl" />
        <div className="h-24 w-full bg-muted/40 rounded-2xl" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-32 bg-muted/40 rounded-2xl" />
          <div className="h-32 bg-muted/40 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Header Banner */}
      <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Cog6ToothIcon className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-base text-foreground">
              AI ISA Engine & Persona Configuration
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Fine-tune the autonomous qualification engine, persona tone, active communication channels, and human handoff thresholds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => refetch()}
            className="p-2.5 rounded-xl border border-border/70 hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-all"
            title="Reload Config"
          >
            <ArrowPathIcon className="w-4 h-4" />
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-md transition-all hover:scale-[1.02] flex items-center gap-1.5 disabled:opacity-50"
          >
            <SparklesIcon className="w-4 h-4" />
            <span>{isSaving ? 'Saving Changes...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Core Engine Controls & Status */}
        <div className="space-y-6">
          {/* Master Switches Card */}
          <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-border/60">
              <ShieldCheckIcon className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-bold text-foreground">Autonomous Engine Controls</h4>
            </div>

            {/* Master Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/30 border border-border/60">
              <div>
                <span className="text-xs font-bold text-foreground block">AI ISA Master Engine</span>
                <span className="text-[11px] text-muted-foreground">
                  {formData.isEnabled ? 'Engine active & responding' : 'Engine temporarily disabled'}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isEnabled}
                  onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {/* Autopilot Mode */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/30 border border-border/60">
              <div>
                <span className="text-xs font-bold text-foreground block">Autopilot Dispatch</span>
                <span className="text-[11px] text-muted-foreground">
                  {formData.autoPilotEnabled
                    ? 'Replies sent autonomously (<30s)'
                    : 'Draft suggestions to agent queue'}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.autoPilotEnabled}
                  onChange={(e) => setFormData({ ...formData, autoPilotEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {/* Office Hours Only */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/30 border border-border/60">
              <div>
                <span className="text-xs font-bold text-foreground block">Office Hours Guard</span>
                <span className="text-[11px] text-muted-foreground">
                  {formData.officeHoursOnly
                    ? 'Only respond 08:00 AM - 08:00 PM'
                    : '24/7 round-the-clock instant replies'}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.officeHoursOnly}
                  onChange={(e) => setFormData({ ...formData, officeHoursOnly: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>

          {/* Active Channels */}
          <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-border/60">
              <ChatBubbleLeftRightIcon className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-bold text-foreground">Inbound Auto-Reply Channels</h4>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(['sms', 'whatsapp', 'email'] as const).map((channel) => {
                const isSelected = formData.autoReplyChannels?.includes(channel)
                return (
                  <button
                    key={channel}
                    type="button"
                    onClick={() => handleChannelToggle(channel)}
                    className={`py-3 px-2 rounded-2xl border text-center font-bold text-xs transition-all flex flex-col items-center gap-1.5 ${isSelected
                        ? 'bg-primary/10 border-primary text-primary shadow-sm'
                        : 'bg-muted/20 border-border/60 text-muted-foreground hover:bg-muted/40'
                      }`}
                  >
                    <span className="uppercase text-[11px] tracking-wider">{channel}</span>
                    <span className="text-[10px] font-normal opacity-80">
                      {isSelected ? 'Enabled' : 'Disabled'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Center & Right Columns: Persona & Behavioral Directives */}
        <div className="lg:col-span-2 space-y-6">
          {/* Persona Identity & Tone */}
          <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-border/60">
              <UserIcon className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-bold text-foreground">AI Persona Identity & Voice</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  AI Persona Name
                </label>
                <input
                  type="text"
                  value={formData.persona?.name || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      persona: { ...(formData.persona as any), name: e.target.value },
                    })
                  }
                  className="w-full text-xs rounded-xl bg-background border border-border/70 p-3 focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="e.g. Maya, Alex, Sophia"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Designated Agent Name
                </label>
                <input
                  type="text"
                  value={formData.persona?.agentName || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      persona: { ...(formData.persona as any), agentName: e.target.value },
                    })
                  }
                  className="w-full text-xs rounded-xl bg-background border border-border/70 p-3 focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="e.g. Sarah Jenkins"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Brokerage Name
                </label>
                <input
                  type="text"
                  value={formData.persona?.brokerageName || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      persona: { ...(formData.persona as any), brokerageName: e.target.value },
                    })
                  }
                  className="w-full text-xs rounded-xl bg-background border border-border/70 p-3 focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="e.g. PropPulse Realty Group"
                />
              </div>
            </div>

            {/* Persona Tone Selector Cards */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                Conversational Tone & Voice Style
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    id: 'professional',
                    title: 'Professional',
                    desc: 'Polished, authoritative, polished real estate advisory',
                  },
                  {
                    id: 'friendly',
                    title: 'Warm & Friendly',
                    desc: 'Approachable, warm, energetic first impression',
                  },
                  {
                    id: 'concise',
                    title: 'Concise & Direct',
                    desc: 'Fast, to-the-point questions for busy buyers',
                  },
                  {
                    id: 'consultative',
                    title: 'Consultative',
                    desc: 'Advisory, discovery-focused questions',
                  },
                ].map((tone) => {
                  const isSelected = formData.persona?.tone === tone.id
                  return (
                    <button
                      key={tone.id}
                      type="button"
                      onClick={() => handleToneSelect(tone.id as any)}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${isSelected
                          ? 'bg-primary/10 border-primary text-foreground shadow-sm'
                          : 'bg-muted/20 border-border/60 hover:bg-muted/40 text-muted-foreground'
                        }`}
                    >
                      <span className={`text-xs font-bold block ${isSelected ? 'text-primary' : ''}`}>
                        {tone.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground leading-tight block mt-1">
                        {tone.desc}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Custom Directive Prompts */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                Custom Persona Behavioral Directives
              </label>
              <textarea
                value={formData.persona?.customInstructions || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    persona: { ...(formData.persona as any), customInstructions: e.target.value },
                  })
                }
                rows={3}
                className="w-full text-xs rounded-xl bg-background border border-border/70 p-3 focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                placeholder="e.g. Always emphasize our brokerage's exclusive off-market listings in Downtown. If the lead is relocating from out-of-state, offer our complimentary Neighborhood Video Tour link."
              />
            </div>
          </div>

          {/* Handoff & Latency Thresholds */}
          <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-border/60">
              <ClockIcon className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-bold text-foreground">Handoff & Qualification Thresholds</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Human Handoff Delay */}
              <div className="p-4 rounded-2xl bg-muted/20 border border-border/60 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-foreground">Human Transfer Window</span>
                  <span className="text-xs font-mono font-bold text-primary">
                    {formData.humanHandoffDelaySeconds}s
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="120"
                  step="5"
                  value={formData.humanHandoffDelaySeconds ?? 30}
                  onChange={(e) =>
                    setFormData({ ...formData, humanHandoffDelaySeconds: Number(e.target.value) })
                  }
                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <p className="text-[10px] text-muted-foreground">
                  Time allocated for agent to accept live warm transfer before routing to voice overflow.
                </p>
              </div>

              {/* Qualification Threshold */}
              <div className="p-4 rounded-2xl bg-muted/20 border border-border/60 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-foreground">Qualification Score Target</span>
                  <span className="text-xs font-mono font-bold text-emerald-500">
                    {formData.qualificationThresholdScore} / 100
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="5"
                  value={formData.qualificationThresholdScore ?? 80}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      qualificationThresholdScore: Number(e.target.value),
                    })
                  }
                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <p className="text-[10px] text-muted-foreground">
                  Minimum AI lead qualification score required before auto-scheduling private showings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
