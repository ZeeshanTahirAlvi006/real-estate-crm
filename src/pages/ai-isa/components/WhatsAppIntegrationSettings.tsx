import React, { useState, useEffect } from 'react'
import {
  useGetWhatsAppConfigQuery,
  useUpdateWhatsAppConfigMutation,
  useTestWhatsAppConnectionMutation,
  useDisconnectWhatsAppMutation,
} from '@/store/api/communicationApi'
import {
  ShieldCheckIcon,
  ArrowPathIcon,
  DevicePhoneMobileIcon,
  InformationCircleIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline'
import { toast } from 'sonner'

export const WhatsAppIntegrationSettings: React.FC = () => {
  const { data: config, isLoading, refetch } = useGetWhatsAppConfigQuery()
  const [updateConfig, { isLoading: isSaving }] = useUpdateWhatsAppConfigMutation()
  const [testConnection, { isLoading: isTesting }] = useTestWhatsAppConnectionMutation()
  const [disconnectWhatsApp, { isLoading: isDisconnecting }] = useDisconnectWhatsAppMutation()

  const [wabaId, setWabaId] = useState('')
  const [phoneNumberId, setPhoneNumberId] = useState('')
  const [displayPhoneNumber, setDisplayPhoneNumber] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [testPhone, setTestPhone] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => {
    if (config) {
      setWabaId(config.wabaId || '')
      setPhoneNumberId(config.phoneNumberId || '')
      setDisplayPhoneNumber(config.displayPhoneNumber || '')
    }
  }, [config])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phoneNumberId.trim()) {
      toast.error('Please provide a Phone Number ID')
      return
    }

    try {
      await updateConfig({
        wabaId: wabaId.trim(),
        phoneNumberId: phoneNumberId.trim(),
        displayPhoneNumber: displayPhoneNumber.trim(),
        ...(accessToken.trim() ? { accessToken: accessToken.trim() } : {}),
      }).unwrap()

      toast.success('WhatsApp credentials verified and saved successfully!')
      setAccessToken('')
      refetch()
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Failed to save WhatsApp settings')
    }
  }

  const handleTest = async () => {
    try {
      const res = await testConnection({
        testPhone: testPhone.trim() || undefined,
      }).unwrap()

      toast.success(res.message || 'Meta connection verified successfully!')
      refetch()
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Meta WhatsApp test failed')
    }
  }

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect this WhatsApp Business Account?')) return
    try {
      await disconnectWhatsApp().unwrap()
      toast.success('WhatsApp integration disconnected')
      setAccessToken('')
      refetch()
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Failed to disconnect')
    }
  }

  if (isLoading) {
    return (
      <div className="p-12 text-center text-xs text-muted-foreground animate-pulse">
        Loading WhatsApp integration settings...
      </div>
    )
  }

  const isConnected = config?.status === 'connected'

  return (
    <div className="space-y-6">
      {/* 1. Live Status Card */}
      <div
        className={`p-6 rounded-3xl border transition-all ${isConnected
            ? 'bg-linear-to-br from-emerald-500/10 via-card to-card border-emerald-500/30'
            : config?.isUsingSystemFallback
              ? 'bg-linear-to-br from-blue-500/10 via-card to-card border-blue-500/30'
              : 'bg-card border-border/80'
          }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-2xl ${isConnected
                  ? 'bg-emerald-500/20 text-emerald-500'
                  : config?.isUsingSystemFallback
                    ? 'bg-blue-500/20 text-blue-500'
                    : 'bg-muted text-muted-foreground'
                }`}
            >
              <DevicePhoneMobileIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">
                  {isConnected
                    ? config.verifiedName || 'WhatsApp Business Connected'
                    : config?.isUsingSystemFallback
                      ? 'Using Platform Development WhatsApp'
                      : 'WhatsApp Cloud API Not Connected'}
                </h3>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isConnected
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : config?.isUsingSystemFallback
                        ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                        : 'bg-muted text-muted-foreground'
                    }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'
                      }`}
                  />
                  {isConnected ? 'LIVE CLOUD API' : config?.isUsingSystemFallback ? 'DEV FALLBACK' : 'DISCONNECTED'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isConnected
                  ? `Active Phone: ${config.displayPhoneNumber || config.phoneNumberId} • Quality Rating: ${config.qualityRating || 'GREEN'
                  } • Tier: ${config.tier || 'TIER_1K'}`
                  : config?.isUsingSystemFallback
                    ? 'Your brokerage is using the default platform testing sandbox. Connect your own WABA for production.'
                    : 'Connect your Meta WhatsApp Business Account to allow AI ISA to message unlimited leads from your own number.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting || (!isConnected && !config?.isUsingSystemFallback)}
              className="px-3.5 py-2 rounded-xl bg-card border border-border hover:bg-muted font-bold text-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
            </button>

            {isConnected && (
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 font-bold text-xs transition-all disabled:opacity-50"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Self-Service Connection Form */}
      <form onSubmit={handleSave} className="bg-card border border-border/80 rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div>
            <h4 className="text-sm font-bold text-foreground">Brokerage Meta WhatsApp Credentials</h4>
            <p className="text-xs text-muted-foreground">
              All access tokens are encrypted with AES-256 before being stored in the database.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
          >
            <InformationCircleIcon className="w-4 h-4" />
            <span>{showGuide ? 'Hide Setup Guide' : 'How to get Meta credentials?'}</span>
          </button>
        </div>

        {/* Setup Guide Accordion */}
        {showGuide && (
          <div className="bg-muted/40 border border-border/60 rounded-2xl p-4 text-xs space-y-2.5 text-muted-foreground animate-fadeIn">
            <h5 className="font-bold text-foreground text-xs">🚀 3-Step Setup for Your Brokerage:</h5>
            <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed">
              <li>
                <strong className="text-foreground">Meta Business Manager:</strong> Open{' '}
                <a
                  href="https://business.facebook.com/settings"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline"
                >
                  business.facebook.com/settings
                </a>{' '}
                ➔ <strong>WhatsApp Accounts</strong> ➔ Add your brokerage phone number.
              </li>
              <li>
                <strong className="text-foreground">Get IDs:</strong> Under <strong>API Setup</strong>, copy your{' '}
                <strong>Phone Number ID</strong> and <strong>WhatsApp Business Account ID</strong>.
              </li>
              <li>
                <strong className="text-foreground">Permanent Token:</strong> In Meta Business Settings ➔{' '}
                <strong>System Users</strong> ➔ Click <strong>Generate New Token</strong> with permissions{' '}
                <code className="bg-background px-1 py-0.5 rounded text-[10px] font-mono text-foreground">
                  whatsapp_business_messaging
                </code>{' '}
                and set expiration to <em>Never</em>.
              </li>
            </ol>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
              Phone Number ID <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              placeholder="e.g. 104239857283921"
              className="w-full p-2.5 rounded-xl bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary font-mono text-xs"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
              WhatsApp Business Account (WABA) ID
            </label>
            <input
              type="text"
              value={wabaId}
              onChange={(e) => setWabaId(e.target.value)}
              placeholder="e.g. 109823475628192"
              className="w-full p-2.5 rounded-xl bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary font-mono text-xs"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
              Display Phone Number
            </label>
            <input
              type="text"
              value={displayPhoneNumber}
              onChange={(e) => setDisplayPhoneNumber(e.target.value)}
              placeholder="e.g. +1 (512) 555-0199"
              className="w-full p-2.5 rounded-xl bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary text-xs"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Permanent System User Access Token {isConnected && !accessToken && '(Configured & Encrypted)'}
              </label>
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                {showToken ? <EyeSlashIcon className="w-3 h-3" /> : <EyeIcon className="w-3 h-3" />}
                <span>{showToken ? 'Hide' : 'Show'}</span>
              </button>
            </div>
            <input
              type={showToken ? 'text' : 'password'}
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder={isConnected ? '•••••••••••••••••••••••••••• (Leave blank to keep current)' : 'EAAB... (Paste Meta Permanent Token)'}
              className="w-full p-2.5 rounded-xl bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary font-mono text-xs"
            />
          </div>
        </div>

        {/* Live Test Recipient Box */}
        <div className="bg-muted/30 border border-border/60 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs space-y-0.5">
            <span className="font-bold text-foreground block">Dispatch Live Verification Ping</span>
            <span className="text-muted-foreground text-[11px]">
              Optionally enter your mobile number to receive a live verification WhatsApp handshake message.
            </span>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <input
              type="tel"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="e.g. +15125550199 or +92300..."
              className="p-2 rounded-xl bg-background border border-border text-xs font-mono w-full sm:w-48"
            />
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting}
              className="px-3.5 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-bold text-xs border border-border transition-all disabled:opacity-50 whitespace-nowrap"
            >
              {isTesting ? 'Pinging...' : 'Send Test Ping'}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <ShieldCheckIcon className="w-4 h-4" />
            <span>{isSaving ? 'Verifying with Meta...' : 'Save & Connect WhatsApp Account'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
