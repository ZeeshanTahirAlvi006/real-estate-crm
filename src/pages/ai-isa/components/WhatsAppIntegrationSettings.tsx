import React, { useState, useEffect } from 'react'
import {
  useGetWhatsAppConfigQuery,
  useUpdateWhatsAppConfigMutation,
  useTestWhatsAppConnectionMutation,
  useDisconnectWhatsAppMutation,
} from '@/store/api/communicationApi'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
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
      <div className="p-12 text-center text-xs text-[#75887E] dark:text-[#A0B2A6]">
        Loading WhatsApp settings...
      </div>
    )
  }

  const isConnected = config?.status === 'connected'

  return (
    <div className="space-y-6">
      {/* 1. Live Status Card */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#2B5748] border border-[#D8E2D6] dark:border-[#618764] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#9CB080]/20 text-[#273338] dark:text-[#9CB080] flex items-center justify-center">
              <MaterialIcon name="chat" size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#273338] dark:text-white">
                  WhatsApp API
                </h3>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    isConnected
                      ? 'bg-[#9CB080]/20 text-[#273338] dark:text-[#9CB080] border border-[#9CB080]/40'
                      : config?.isUsingSystemFallback
                        ? 'bg-[#EDF2EB] dark:bg-[#202B2F] text-[#4A5D54] dark:text-[#E2ECE4] border border-[#D8E2D6] dark:border-[#618764]'
                        : 'bg-[#EDF2EB] dark:bg-[#202B2F] text-[#75887E] dark:text-[#A0B2A6] border border-[#D8E2D6] dark:border-[#618764]'
                  }`}
                >
                  {isConnected ? 'Connected' : config?.isUsingSystemFallback ? 'Development' : 'Disconnected'}
                </span>
              </div>
              <p className="text-xs text-[#75887E] dark:text-[#A0B2A6] mt-0.5">
                {isConnected
                  ? `Phone: ${config.displayPhoneNumber || config.phoneNumberId} • Quality: ${config.qualityRating || 'GREEN'}`
                  : config?.isUsingSystemFallback
                    ? 'Using platform testing sandbox.'
                    : 'Connect your Meta WhatsApp Business Account.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting || (!isConnected && !config?.isUsingSystemFallback)}
              className="px-3.5 py-2 rounded-lg bg-[#EDF2EB] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white font-bold text-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <MaterialIcon name="refresh" size={14} className={isTesting ? 'animate-spin' : ''} />
              <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
            </button>

            {isConnected && (
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="px-3.5 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 font-bold text-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Self-Service Connection Form */}
      <form onSubmit={handleSave} className="bg-white dark:bg-[#2B5748] border border-[#D8E2D6] dark:border-[#618764] rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/60">
          <div>
            <h4 className="text-sm font-bold text-[#273338] dark:text-white">Meta Credentials</h4>
            <p className="text-xs text-[#75887E] dark:text-[#A0B2A6]">
              Encrypted with AES-256
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="text-xs text-[#2B5748] dark:text-[#9CB080] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <MaterialIcon name="info" size={14} />
            <span>{showGuide ? 'Hide Guide' : 'Setup Guide'}</span>
          </button>
        </div>

        {/* Setup Guide Accordion */}
        {showGuide && (
          <div className="bg-[#EDF2EB] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] rounded-xl p-4 text-xs space-y-2 text-[#4A5D54] dark:text-[#E2ECE4]">
            <h5 className="font-bold text-[#273338] dark:text-white text-xs">Setup Steps:</h5>
            <ol className="list-decimal pl-4 space-y-1 leading-relaxed">
              <li>
                <strong>Meta Business Manager:</strong> Open business.facebook.com/settings and add phone number.
              </li>
              <li>
                <strong>Copy IDs:</strong> Copy Phone Number ID and WABA ID from API Setup.
              </li>
              <li>
                <strong>Permanent Token:</strong> In System Users, create token with whatsapp_business_messaging permission.
              </li>
            </ol>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#4A5D54] dark:text-[#E2ECE4] block">
              Phone Number ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              placeholder="e.g. 104239857283921"
              className="w-full p-2 rounded-lg bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-xs font-mono text-[#273338] dark:text-white focus:outline-none focus:border-[#9CB080]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#4A5D54] dark:text-[#E2ECE4] block">
              WABA ID
            </label>
            <input
              type="text"
              value={wabaId}
              onChange={(e) => setWabaId(e.target.value)}
              placeholder="e.g. 109823475628192"
              className="w-full p-2 rounded-lg bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-xs font-mono text-[#273338] dark:text-white focus:outline-none focus:border-[#9CB080]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#4A5D54] dark:text-[#E2ECE4] block">
              Display Phone Number
            </label>
            <input
              type="text"
              value={displayPhoneNumber}
              onChange={(e) => setDisplayPhoneNumber(e.target.value)}
              placeholder="e.g. +1 (512) 555-0199"
              className="w-full p-2 rounded-lg bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-xs text-[#273338] dark:text-white focus:outline-none focus:border-[#9CB080]"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-[#4A5D54] dark:text-[#E2ECE4]">
                Access Token
              </label>
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <MaterialIcon name={showToken ? 'visibility_off' : 'visibility'} size={12} />
                <span>{showToken ? 'Hide' : 'Show'}</span>
              </button>
            </div>
            <input
              type={showToken ? 'text' : 'password'}
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder={isConnected ? '•••••••••••• (Encrypted)' : 'EAAB... (Paste Permanent Token)'}
              className="w-full p-2 rounded-lg bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-xs font-mono text-[#273338] dark:text-white focus:outline-none focus:border-[#9CB080]"
            />
          </div>
        </div>

        {/* Live Test Recipient Box */}
        <div className="bg-[#EDF2EB] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs space-y-0.5">
            <span className="font-bold text-[#273338] dark:text-white block">Test Handshake</span>
            <span className="text-[#75887E] dark:text-[#A0B2A6] text-[11px]">
              Send verification test message
            </span>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <input
              type="tel"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="+15125550199"
              className="p-2 rounded-lg bg-white dark:bg-[#273338] border border-[#D8E2D6] dark:border-[#618764] text-xs font-mono text-[#273338] dark:text-white w-full sm:w-44 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting}
              className="px-3 py-2 rounded-lg bg-white dark:bg-[#273338] hover:bg-[#EDF2EB] dark:hover:bg-[#202B2F] text-[#273338] dark:text-white font-bold text-xs border border-[#D8E2D6] dark:border-[#618764] transition-all disabled:opacity-50 whitespace-nowrap cursor-pointer"
            >
              {isTesting ? 'Sending...' : 'Send Test'}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2 rounded-lg bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] font-bold text-xs transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
          >
            <MaterialIcon name="verified_user" size={16} />
            <span>{isSaving ? 'Verifying...' : 'Save Credentials'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
