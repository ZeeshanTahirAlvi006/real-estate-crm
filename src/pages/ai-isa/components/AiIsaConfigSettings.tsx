import React, { useState, useEffect } from 'react'
import {
  useGetAiIsaConfigQuery,
  useUpdateAiIsaConfigMutation,
} from '@/store/api/communicationApi'
import type { AiIsaConfig } from '@/types/communication'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { toast } from 'sonner'

export const AiIsaConfigSettings: React.FC = () => {
  const { data: config, isLoading, refetch } = useGetAiIsaConfigQuery()
  const [updateConfig, { isLoading: isSaving }] = useUpdateAiIsaConfigMutation()

  const [formData, setFormData] = useState<Partial<AiIsaConfig>>({
    isEnabled: true,
    autoPilotEnabled: true,
    officeHoursOnly: false,
    autoReplyChannels: ['whatsapp', 'email'],
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
        autoReplyChannels: config.autoReplyChannels || ['whatsapp', 'email'],
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

  const handleChannelToggle = (channel: 'whatsapp' | 'email') => {
    const current = (formData.autoReplyChannels || []).filter((c) => c === 'whatsapp' || c === 'email') as ('whatsapp' | 'email')[]
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
      toast.success('Settings updated successfully')
    } catch {
      toast.error('Failed to update settings')
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-[#254238] border border-[#D8E2D6] dark:border-[#618764] rounded-2xl p-6 animate-pulse space-y-6">
        <div className="h-6 w-48 bg-[#EDF2EB] dark:bg-[#1A2E26] rounded-xl" />
        <div className="h-24 w-full bg-[#EDF2EB] dark:bg-[#1A2E26] rounded-xl" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-32 bg-[#EDF2EB] dark:bg-[#1A2E26] rounded-xl" />
          <div className="h-32 bg-[#EDF2EB] dark:bg-[#1A2E26] rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#254238] border border-[#D8E2D6] dark:border-[#618764] rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <MaterialIcon name="settings" size={20} className="text-[#2B5748] dark:text-[#9CB080]" />
            <h3 className="font-bold text-base text-[#273338] dark:text-white">
              ISA Settings
            </h3>
          </div>
          <p className="text-xs text-[#4A5D54] dark:text-[#A0B2A6] mt-0.5">
            Configure autonomous engine parameters, persona voice, and handoff rules
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => refetch()}
            className="p-2.5 rounded-xl border border-[#D8E2D6] dark:border-[#618764] hover:bg-[#EDF2EB] dark:hover:bg-[#202B2F] text-[#75887E] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white transition-all cursor-pointer"
            title="Reload"
          >
            <MaterialIcon name="refresh" size={18} />
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <MaterialIcon name="save" size={16} />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Core Engine Controls & Status */}
        <div className="space-y-6">
          {/* Master Switches Card */}
          <div className="bg-white dark:bg-[#254238] border border-[#D8E2D6] dark:border-[#618764] rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/40">
              <MaterialIcon name="security" size={18} className="text-[#2B5748] dark:text-[#9CB080]" />
              <h4 className="text-sm font-bold text-[#273338] dark:text-white">Core Engine</h4>
            </div>

            {/* Master Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/40">
              <div>
                <span className="text-xs font-bold text-[#273338] dark:text-white block">Master Engine</span>
                <span className="text-[11px] text-[#75887E] dark:text-[#A0B2A6]">
                  {formData.isEnabled ? 'Engine active' : 'Engine paused'}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isEnabled}
                  onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#D8E2D6] dark:bg-[#1A2E26] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#9CB080]"></div>
              </label>
            </div>

            {/* Autopilot Mode */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/40">
              <div>
                <span className="text-xs font-bold text-[#273338] dark:text-white block">Autopilot Dispatch</span>
                <span className="text-[11px] text-[#75887E] dark:text-[#A0B2A6]">
                  {formData.autoPilotEnabled
                    ? 'Instant autonomous replies'
                    : 'Drafts to agent queue'}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.autoPilotEnabled}
                  onChange={(e) => setFormData({ ...formData, autoPilotEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#D8E2D6] dark:bg-[#1A2E26] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#9CB080]"></div>
              </label>
            </div>

            {/* Office Hours Only */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/40">
              <div>
                <span className="text-xs font-bold text-[#273338] dark:text-white block">Office Hours Guard</span>
                <span className="text-[11px] text-[#75887E] dark:text-[#A0B2A6]">
                  {formData.officeHoursOnly
                    ? '08:00 AM - 08:00 PM'
                    : '24/7 round-the-clock'}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.officeHoursOnly}
                  onChange={(e) => setFormData({ ...formData, officeHoursOnly: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#D8E2D6] dark:bg-[#1A2E26] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#9CB080]"></div>
              </label>
            </div>
          </div>

          {/* Active Channels */}
          <div className="bg-white dark:bg-[#254238] border border-[#D8E2D6] dark:border-[#618764] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/40">
              <MaterialIcon name="chat" size={18} className="text-[#2B5748] dark:text-[#9CB080]" />
              <h4 className="text-sm font-bold text-[#273338] dark:text-white">Active Channels</h4>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(['whatsapp', 'email'] as const).map((channel) => {
                const isSelected = formData.autoReplyChannels?.includes(channel)
                return (
                  <button
                    key={channel}
                    type="button"
                    onClick={() => handleChannelToggle(channel)}
                    className={`py-3 px-2 rounded-xl border text-center font-bold text-xs transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-[#9CB080]/20 border-[#9CB080] text-[#2B5748] dark:text-[#9CB080] shadow-xs'
                        : 'bg-[#F5F7F4] dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764]/50 text-[#75887E] dark:text-[#A0B2A6]'
                    }`}
                  >
                    <MaterialIcon name={channel === 'whatsapp' ? 'chat' : 'mail'} size={18} />
                    <span className="capitalize text-xs tracking-wider">{channel === 'whatsapp' ? 'WhatsApp' : 'Email'}</span>
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
          <div className="bg-white dark:bg-[#254238] border border-[#D8E2D6] dark:border-[#618764] rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/40">
              <MaterialIcon name="person" size={18} className="text-[#2B5748] dark:text-[#9CB080]" />
              <h4 className="text-sm font-bold text-[#273338] dark:text-white">Persona Voice</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#4A5D54] dark:text-[#A0B2A6] block mb-1.5">
                  Persona Name
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
                  className="w-full text-xs rounded-xl bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white p-3 focus:outline-none focus:border-[#9CB080]"
                  placeholder="e.g. Maya"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#4A5D54] dark:text-[#A0B2A6] block mb-1.5">
                  Agent Name
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
                  className="w-full text-xs rounded-xl bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white p-3 focus:outline-none focus:border-[#9CB080]"
                  placeholder="e.g. Sarah Jenkins"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#4A5D54] dark:text-[#A0B2A6] block mb-1.5">
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
                  className="w-full text-xs rounded-xl bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white p-3 focus:outline-none focus:border-[#9CB080]"
                  placeholder="e.g. PropPulse Group"
                />
              </div>
            </div>

            {/* Persona Tone Selector Cards */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#4A5D54] dark:text-[#A0B2A6] block">
                Conversational Style
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    id: 'professional',
                    title: 'Professional',
                    desc: 'Polished and authoritative advisory',
                  },
                  {
                    id: 'friendly',
                    title: 'Friendly',
                    desc: 'Warm and approachable engagement',
                  },
                  {
                    id: 'concise',
                    title: 'Concise',
                    desc: 'Fast and direct questions',
                  },
                  {
                    id: 'consultative',
                    title: 'Consultative',
                    desc: 'Advisory and discovery focused',
                  },
                ].map((tone) => {
                  const isSelected = formData.persona?.tone === tone.id
                  return (
                    <button
                      key={tone.id}
                      type="button"
                      onClick={() => handleToneSelect(tone.id as any)}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#9CB080]/20 border-[#9CB080] text-[#273338] dark:text-white shadow-xs'
                          : 'bg-[#F5F7F4] dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764]/40 text-[#75887E] dark:text-[#A0B2A6]'
                      }`}
                    >
                      <span className={`text-xs font-bold block ${isSelected ? 'text-[#2B5748] dark:text-[#9CB080]' : ''}`}>
                        {tone.title}
                      </span>
                      <span className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] leading-tight block mt-1">
                        {tone.desc}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Custom Directive Prompts */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#4A5D54] dark:text-[#A0B2A6] block">
                Directives & Guardrails
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
                className="w-full text-xs rounded-xl bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white p-3 focus:outline-none focus:border-[#9CB080] leading-relaxed"
                placeholder="e.g. Always emphasize our exclusive off-market listings."
              />
            </div>
          </div>

          {/* Handoff & Latency Thresholds */}
          <div className="bg-white dark:bg-[#254238] border border-[#D8E2D6] dark:border-[#618764] rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/40">
              <MaterialIcon name="schedule" size={18} className="text-[#2B5748] dark:text-[#9CB080]" />
              <h4 className="text-sm font-bold text-[#273338] dark:text-white">Handoff Thresholds</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Human Handoff Delay */}
              <div className="p-4 rounded-xl bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/40 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[#273338] dark:text-white">Transfer Window</span>
                  <span className="text-xs font-mono font-bold text-[#2B5748] dark:text-[#9CB080]">
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
                  className="w-full h-1.5 bg-[#D8E2D6] dark:bg-[#1A2E26] rounded-lg appearance-none cursor-pointer accent-[#9CB080]"
                />
                <p className="text-[10px] text-[#75887E] dark:text-[#A0B2A6]">
                  Window for human agent to accept warm transfer before fallback.
                </p>
              </div>

              {/* Qualification Threshold */}
              <div className="p-4 rounded-xl bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/40 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[#273338] dark:text-white">Score Target</span>
                  <span className="text-xs font-mono font-bold text-[#2B5748] dark:text-[#9CB080]">
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
                  className="w-full h-1.5 bg-[#D8E2D6] dark:bg-[#1A2E26] rounded-lg appearance-none cursor-pointer accent-[#9CB080]"
                />
                <p className="text-[10px] text-[#75887E] dark:text-[#A0B2A6]">
                  Minimum score required before auto-booking private showings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}

