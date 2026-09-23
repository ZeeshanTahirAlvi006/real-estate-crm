import React, { useState, useEffect } from 'react'
import {
  useGetWhatsAppStatusQuery,
  useLaunchWhatsAppSignupMutation,
  useCallbackWhatsAppMutation,
  useSessionEventWhatsAppMutation,
  useRetryWhatsAppStepMutation,
  useRestartWhatsAppMutation,
  useConfirmWhatsAppPaymentMutation,
  useDisconnectWhatsAppFsmMutation,
  useTestWhatsAppConnectionMutation,
} from '@/store/api/communicationApi'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { toast } from 'sonner'
import type { WAState } from '@/types/communication'

export const WhatsAppIntegrationSettings: React.FC = () => {
  const { data: statusData, isLoading, refetch } = useGetWhatsAppStatusQuery(undefined, {
    pollingInterval: 4000, // Poll state machine transitions when in progress
  })

  const [launchSignup, { isLoading: isLaunching }] = useLaunchWhatsAppSignupMutation()
  const [submitCallback, { isLoading: isSubmittingCallback }] = useCallbackWhatsAppMutation()
  const [reportSessionEvent, { isLoading: isCancelling }] = useSessionEventWhatsAppMutation()
  const [retryStep, { isLoading: isRetrying }] = useRetryWhatsAppStepMutation()
  const [restartSignup, { isLoading: isRestarting }] = useRestartWhatsAppMutation()
  const [confirmPayment, { isLoading: isConfirmingPayment }] = useConfirmWhatsAppPaymentMutation()
  const [disconnectFsm, { isLoading: isDisconnecting }] = useDisconnectWhatsAppFsmMutation()
  const [testConnection, { isLoading: isTesting }] = useTestWhatsAppConnectionMutation()

  // Dev / Manual Callback Modal States
  const [showDevModal, setShowDevModal] = useState(false)
  const [devCode, setDevCode] = useState('EAAB_mock_auth_code_' + Date.now())
  const [devWabaId, setDevWabaId] = useState('109823475628192')
  const [devPhoneId, setDevPhoneId] = useState('104239857283921')

  // Meta Session Info captured from WA_EMBEDDED_SIGNUP message event
  const [capturedSessionData, setCapturedSessionData] = useState<{
    wabaId?: string
    phoneNumberId?: string
  }>({})

  const [testPhone, setTestPhone] = useState('')
  const [showHistory, setShowHistory] = useState(false)

  const state: WAState = statusData?.status || 'NOT_CONNECTED'
  const isBusy =
    isLaunching ||
    isSubmittingCallback ||
    isCancelling ||
    isRetrying ||
    isRestarting ||
    isConfirmingPayment ||
    isDisconnecting ||
    isTesting ||
    statusData?.isLocked

  // ── Rule ML-001: Listener Lifecycle Enforcement ────────────────────────────
  // Every temporary window message listener has an explicit teardown on unmount
  useEffect(() => {
    const handleMetaMessage = async (event: MessageEvent) => {
      // Validate origin strictly against Meta domains
      if (
        event.origin !== 'https://www.facebook.com' &&
        event.origin !== 'https://web.facebook.com'
      ) {
        return
      }

      try {
        const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
        if (payload?.type === 'WA_EMBEDDED_SIGNUP') {
          const metaEvent = payload.event
          if (metaEvent === 'FINISH') {
            const { phone_number_id, waba_id } = payload.data || {}
            if (phone_number_id && waba_id) {
              setCapturedSessionData({
                phoneNumberId: String(phone_number_id),
                wabaId: String(waba_id),
              })
              setDevWabaId(String(waba_id))
              setDevPhoneId(String(phone_number_id))
            }
          } else if (metaEvent === 'CANCEL') {
            await reportSessionEvent({
              event: 'CANCEL',
              currentStep: payload.data?.current_step || 'user_cancelled_embedded_flow',
            }).unwrap()
            toast.info('WhatsApp signup cancelled.')
            setShowDevModal(false)
            refetch()
          } else if (metaEvent === 'ERROR') {
            await reportSessionEvent({
              event: 'ERROR',
              errorCode: payload.data?.error_code,
              errorMessage: payload.data?.error_message,
            }).unwrap()
            toast.error(`WhatsApp signup error: ${payload.data?.error_message || 'Setup error'}`)
            setShowDevModal(false)
            refetch()
          }
        }
      } catch {
        // Ignore unparseable or irrelevant third-party messages
      }
    }

    window.addEventListener('message', handleMetaMessage)
    return () => {
      // Teardown listener to prevent memory leak across unmounts (Rule ML-001)
      window.removeEventListener('message', handleMetaMessage)
    }
  }, [reportSessionEvent, refetch])

  // ── Facebook JavaScript SDK Dynamic Loader ──────────────────────────────────
  useEffect(() => {
    const appId = statusData?.appId || (import.meta as any).env?.VITE_META_APP_ID
    if (!appId || typeof window === 'undefined') return

    if ((window as any).FB) return

    ;(window as any).fbAsyncInit = function () {
      ;(window as any).FB.init({
        appId,
        cookie: true,
        xfbml: true,
        version: 'v22.0',
      })
    }

    if (!document.getElementById('facebook-jssdk')) {
      const js = document.createElement('script')
      js.id = 'facebook-jssdk'
      js.src = 'https://connect.facebook.net/en_US/sdk.js'
      js.async = true
      js.defer = true
      document.body.appendChild(js)
    }
  }, [statusData?.appId])

  // ── Action Handlers ──────────────────────────────────────────────────────────

  const handleLaunchSignup = async () => {
    try {
      await launchSignup().unwrap()
      toast.success(
        state === 'TOKEN_REVOKED'
          ? 'WhatsApp re-authentication initiated!'
          : 'WhatsApp Embedded Signup initiated!'
      )
      refetch()

      const appId = statusData?.appId || (import.meta as any).env?.VITE_META_APP_ID
      const configId = statusData?.configId || (import.meta as any).env?.VITE_META_CONFIG_ID
      const fb = (window as any).FB

      if (fb && appId && configId) {
        // Trigger official Meta Embedded Signup flow via FB.login
        fb.login(
          async (response: any) => {
            if (response.authResponse?.code) {
              const code = response.authResponse.code
              const wabaId = capturedSessionData.wabaId || devWabaId
              const phoneNumberId = capturedSessionData.phoneNumberId || devPhoneId

              try {
                const res = await submitCallback({
                  code,
                  wabaId,
                  phoneNumberId,
                }).unwrap()

                if (res.error) {
                  toast.error(`Onboarding stopped: ${res.error}`)
                } else {
                  toast.success(`Success! Transitioned to ${res.status}`)
                }
                refetch()
              } catch (err: any) {
                toast.error(err?.data?.message || err?.message || 'Failed to submit authorization code')
              }
            } else {
              // User cancelled login modal
              await reportSessionEvent({
                event: 'CANCEL',
                currentStep: 'fb_login_modal_closed',
              }).unwrap()
              toast.info('WhatsApp Embedded Signup cancelled')
              refetch()
            }
          },
          {
            config_id: configId,
            response_type: 'code',
            override_default_response_type: true,
            extras: {
              feature: 'whatsapp_embedded_signup',
              version: 2,
              sessionInfoVersion: 2,
            },
          }
        )
      } else {
        // Fallback to Developer & Simulation Modal if Meta App credentials are not yet configured in env
        setShowDevModal(true)
      }
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Failed to initiate WhatsApp signup')
    }
  }

  const handleManualCallbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!devCode.trim() || !devWabaId.trim() || !devPhoneId.trim()) {
      toast.error('Code, WABA ID, and Phone Number ID are required')
      return
    }

    try {
      const res = await submitCallback({
        code: devCode.trim(),
        wabaId: devWabaId.trim(),
        phoneNumberId: devPhoneId.trim(),
      }).unwrap()

      if (res.error) {
        toast.error(`Onboarding stopped: ${res.error}`)
      } else {
        toast.success(`Success! Transitioned to ${res.status}`)
        setShowDevModal(false)
      }
      refetch()
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Callback failed')
    }
  }

  const handleCancelSignup = async () => {
    try {
      await reportSessionEvent({
        event: 'CANCEL',
        currentStep: 'user_aborted_in_ui',
      }).unwrap()
      toast.info('Signup cancelled. Reset to NOT_CONNECTED.')
      setShowDevModal(false)
      refetch()
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Failed to cancel')
    }
  }

  const handleRetry = async () => {
    try {
      const res = await retryStep().unwrap()
      if (res.error) {
        toast.error(`Retry failed: ${res.error}`)
      } else {
        toast.success(`Retry succeeded! State: ${res.status}`)
      }
      refetch()
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Failed to retry step')
    }
  }

  const handleRestart = async () => {
    if (!window.confirm('Restart WhatsApp setup? Failed tokens and IDs will be discarded.')) return
    try {
      await restartSignup().unwrap()
      toast.info('Integration reset to NOT_CONNECTED. You can launch signup again.')
      refetch()
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Failed to restart')
    }
  }

  const handleConfirmPayment = async () => {
    try {
      await confirmPayment().unwrap()
      toast.success('Payment verified! WhatsApp integration is now ACTIVE.')
      refetch()
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Payment confirmation failed')
    }
  }

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect your WhatsApp Business Account?')) return
    try {
      await disconnectFsm().unwrap()
      toast.info('WhatsApp integration disconnected.')
      refetch()
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Failed to disconnect')
    }
  }

  const handleTestHandshake = async () => {
    try {
      const res = await testConnection({ testPhone: testPhone.trim() || undefined }).unwrap()
      toast.success(res.message || 'WhatsApp handshake verified successfully!')
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Meta test handshake failed')
    }
  }

  if (isLoading) {
    return (
      <div className="p-12 text-center text-xs text-[#75887E] dark:text-[#A0B2A6]">
        Loading WhatsApp integration state machine...
      </div>
    )
  }

  // ── Status Visual Configurations ─────────────────────────────────────────────
  const statusBadges: Record<WAState, { label: string; style: string; icon: string }> = {
    NOT_CONNECTED: {
      label: 'Not Connected',
      style: 'bg-[#EDF2EB] dark:bg-[#202B2F] text-[#75887E] dark:text-[#A0B2A6] border-[#D8E2D6] dark:border-[#618764]',
      icon: 'link_off',
    },
    AWAITING_CALLBACK: {
      label: 'Awaiting Authorization Callback',
      style: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 animate-pulse',
      icon: 'hourglass_top',
    },
    EXCHANGING_TOKEN: {
      label: 'Exchanging Meta OAuth Code...',
      style: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 animate-pulse',
      icon: 'sync',
    },
    TOKEN_EXCHANGE_FAILED: {
      label: 'Token Exchange Failed (30s TTL Expired)',
      style: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
      icon: 'error',
    },
    SUBSCRIBING_WEBHOOKS: {
      label: 'Subscribing App Webhooks...',
      style: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 animate-pulse',
      icon: 'sync',
    },
    WEBHOOK_SUBSCRIBE_FAILED: {
      label: 'Webhook Subscription Failed (Retryable)',
      style: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
      icon: 'warning',
    },
    REGISTERING_PHONE: {
      label: 'Registering Phone Number With Meta...',
      style: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 animate-pulse',
      icon: 'sync',
    },
    PHONE_REGISTER_FAILED: {
      label: 'Phone Registration Failed (Retryable)',
      style: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
      icon: 'warning',
    },
    PENDING_PAYMENT: {
      label: 'Pending Payment Setup in WhatsApp Manager',
      style: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
      icon: 'credit_card',
    },
    ACTIVE: {
      label: 'Active & Operational',
      style: 'bg-[#9CB080]/20 text-[#273338] dark:text-[#9CB080] border-[#9CB080]/40',
      icon: 'check_circle',
    },
    SUSPENDED: {
      label: 'Account Restricted by Meta',
      style: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
      icon: 'block',
    },
    TOKEN_REVOKED: {
      label: 'Business Token Revoked / Expired (401)',
      style: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30',
      icon: 'vpn_key_off',
    },
    DISCONNECTED: {
      label: 'Disconnected',
      style: 'bg-[#EDF2EB] dark:bg-[#202B2F] text-[#75887E] dark:text-[#A0B2A6] border-[#D8E2D6] dark:border-[#618764]',
      icon: 'power_settings_new',
    },
  }

  const badge = statusBadges[state] || statusBadges.NOT_CONNECTED

  return (
    <div className="space-y-6">
      {/* ── 1. Main Integration Card ────────────────────────────────────────── */}
      <div className="p-6 rounded-xl bg-white dark:bg-[#2B5748] border border-[#D8E2D6] dark:border-[#618764] shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 rounded-xl bg-[#9CB080]/20 text-[#273338] dark:text-[#9CB080] flex items-center justify-center">
              <MaterialIcon name="chat" size={24} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-[#273338] dark:text-white">
                  WhatsApp Cloud API — Embedded Signup
                </h3>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${badge.style}`}
                >
                  <MaterialIcon name={badge.icon} size={14} />
                  <span>{badge.label}</span>
                </span>
                {statusData?.isLocked && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/30">
                    <MaterialIcon name="lock" size={10} />
                    <span>Mutex Locked (15s TTL)</span>
                  </span>
                )}
              </div>

              <p className="text-xs text-[#75887E] dark:text-[#A0B2A6] mt-1.5 leading-relaxed">
                {state === 'ACTIVE' && (
                  <span>
                    Phone Number ID: <code className="font-mono text-[11px]">{statusData?.phoneNumberId}</code> • WABA ID:{' '}
                    <code className="font-mono text-[11px]">{statusData?.wabaId}</code>
                  </span>
                )}
                {state === 'PENDING_PAYMENT' && (
                  <span className="text-purple-600 dark:text-purple-300 font-semibold">
                    All Graph API handshakes succeeded. Add payment method in WhatsApp Manager before sending messages.
                  </span>
                )}
                {state === 'TOKEN_EXCHANGE_FAILED' && (
                  <span className="text-red-500">
                    OAuth single-use authorization code expired. Code TTL is 30s. Click restart to relaunch signup.
                  </span>
                )}
                {(state === 'WEBHOOK_SUBSCRIBE_FAILED' || state === 'PHONE_REGISTER_FAILED') && (
                  <span className="text-amber-600 dark:text-amber-400">
                    Integration call failed. Stored business token is preserved. You may retry or restart.
                  </span>
                )}
                {state === 'SUSPENDED' && (
                  <span className="text-red-500">
                    Account restricted by Meta. Verify policy compliance in Business Manager.
                  </span>
                )}
                {state === 'TOKEN_REVOKED' && (
                  <span className="text-orange-500">
                    Meta OAuth Token was invalidated (401 error or webhook signal). Click Reconnect to re-authenticate.
                  </span>
                )}
                {(state === 'NOT_CONNECTED' || state === 'DISCONNECTED') && (
                  <span>
                    Connect your Meta WhatsApp Business Account with one-click Embedded Signup.
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* ── State Action Controls ────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2">
            {(state === 'NOT_CONNECTED' || state === 'DISCONNECTED') && (
              <button
                type="button"
                onClick={handleLaunchSignup}
                disabled={isBusy}
                className="px-4 py-2 rounded-lg bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] font-bold text-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <MaterialIcon name="link" size={16} />
                <span>{state === 'DISCONNECTED' ? 'Reconnect WhatsApp' : 'Connect WhatsApp'}</span>
              </button>
            )}

            {state === 'TOKEN_REVOKED' && (
              <button
                type="button"
                onClick={handleLaunchSignup}
                disabled={isBusy}
                className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <MaterialIcon name="refresh" size={16} />
                <span>Re-authenticate (Reauth)</span>
              </button>
            )}

            {state === 'AWAITING_CALLBACK' && (
              <>
                <button
                  type="button"
                  onClick={() => setShowDevModal(true)}
                  className="px-3.5 py-2 rounded-lg bg-[#EDF2EB] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <MaterialIcon name="code" size={14} />
                  <span>Submit Code (Dev / Live)</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancelSignup}
                  disabled={isBusy}
                  className="px-3 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 font-bold text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </>
            )}

            {(state === 'WEBHOOK_SUBSCRIBE_FAILED' || state === 'PHONE_REGISTER_FAILED') && (
              <>
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={isBusy}
                  className="px-4 py-2 rounded-lg bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <MaterialIcon name="refresh" size={14} className={isRetrying ? 'animate-spin' : ''} />
                  <span>Retry Step</span>
                </button>
                <button
                  type="button"
                  onClick={handleRestart}
                  disabled={isBusy}
                  className="px-3.5 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 font-bold text-xs transition-all cursor-pointer"
                >
                  Restart Signup
                </button>
              </>
            )}

            {state === 'TOKEN_EXCHANGE_FAILED' && (
              <button
                type="button"
                onClick={handleRestart}
                disabled={isBusy}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <MaterialIcon name="restart_alt" size={16} />
                <span>Restart Signup (Single-Use TTL)</span>
              </button>
            )}

            {state === 'PENDING_PAYMENT' && (
              <>
                <a
                  href="https://business.facebook.com/wa/manage/payments/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-lg bg-[#EDF2EB] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <MaterialIcon name="open_in_new" size={14} />
                  <span>Open WhatsApp Manager</span>
                </a>
                <button
                  type="button"
                  onClick={handleConfirmPayment}
                  disabled={isBusy}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <MaterialIcon name="verified" size={16} />
                  <span>Confirm Payment Added</span>
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={isBusy}
                  className="px-3 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 font-bold text-xs cursor-pointer"
                >
                  Disconnect
                </button>
              </>
            )}

            {(state === 'ACTIVE' || state === 'SUSPENDED') && (
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={isBusy}
                className="px-3.5 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 font-bold text-xs transition-all cursor-pointer"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. Active Testing Box (When ACTIVE) ─────────────────────────────── */}
      {state === 'ACTIVE' && (
        <div className="p-5 rounded-xl bg-white dark:bg-[#2B5748] border border-[#D8E2D6] dark:border-[#618764] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-[#273338] dark:text-white">Live Handshake Test</h4>
              <p className="text-xs text-[#75887E] dark:text-[#A0B2A6]">
                Dispatch a live verification message via WhatsApp Cloud API.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="tel"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="e.g. +1 (512) 555-0199 or 0300-1234567"
              className="w-full sm:w-64 p-2.5 rounded-lg bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-xs font-mono text-[#273338] dark:text-white focus:outline-none focus:border-[#9CB080]"
            />
            <button
              type="button"
              onClick={handleTestHandshake}
              disabled={isTesting || !testPhone.trim()}
              className="px-4 py-2.5 rounded-lg bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] font-bold text-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              <MaterialIcon name="send" size={14} className={isTesting ? 'animate-spin' : ''} />
              <span>{isTesting ? 'Sending Handshake...' : 'Send Live Handshake'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── 3. History & Audit Log Accordion ───────────────────────────────── */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#2B5748] border border-[#D8E2D6] dark:border-[#618764] shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MaterialIcon name="history" size={18} className="text-[#9CB080]" />
            <h4 className="text-sm font-bold text-[#273338] dark:text-white">
              State Machine Audit History (Last 20 Events)
            </h4>
          </div>
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs font-semibold text-[#9CB080] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>{showHistory ? 'Collapse' : 'Expand'}</span>
            <MaterialIcon name={showHistory ? 'expand_less' : 'expand_more'} size={16} />
          </button>
        </div>

        {showHistory && (
          <div className="mt-4 overflow-x-auto border border-[#D8E2D6] dark:border-[#618764] rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#EDF2EB] dark:bg-[#202B2F] text-[#4A5D54] dark:text-[#E2ECE4] border-b border-[#D8E2D6] dark:border-[#618764]">
                <tr>
                  <th className="p-2.5 font-bold">State</th>
                  <th className="p-2.5 font-bold">Event</th>
                  <th className="p-2.5 font-bold">Timestamp</th>
                  <th className="p-2.5 font-bold">Meta Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8E2D6] dark:divide-[#618764]/40 text-[#273338] dark:text-white font-mono text-[11px]">
                {(!statusData?.history || statusData.history.length === 0) && (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-[#75887E]">
                      No events recorded yet.
                    </td>
                  </tr>
                )}
                {statusData?.history?.slice().reverse().map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-[#F5F7F4] dark:hover:bg-[#202B2F]/50">
                    <td className="p-2.5 font-bold text-[#9CB080]">{item.state}</td>
                    <td className="p-2.5">{item.event}</td>
                    <td className="p-2.5 text-[#75887E] dark:text-[#A0B2A6]">
                      {new Date(item.at).toLocaleTimeString()}
                    </td>
                    <td className="p-2.5 text-[#75887E] dark:text-[#A0B2A6] truncate max-w-xs">
                      {item.meta ? JSON.stringify(item.meta) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 4. Developer / Embedded Callback Modal ──────────────────────────── */}
      {showDevModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-[#2B5748] border border-[#D8E2D6] dark:border-[#618764] rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#D8E2D6] dark:border-[#618764]/60">
              <div className="flex items-center gap-2">
                <MaterialIcon name="developer_mode" size={20} className="text-[#9CB080]" />
                <h4 className="text-sm font-bold text-[#273338] dark:text-white">
                  Meta Embedded Signup Callback
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowDevModal(false)}
                className="text-[#75887E] hover:text-black dark:hover:text-white cursor-pointer"
              >
                <MaterialIcon name="close" size={18} />
              </button>
            </div>

            <p className="text-xs text-[#75887E] dark:text-[#A0B2A6]">
              When Meta’s popup finishes, it returns an authorization code, WABA ID, and Phone Number ID.
              Submit below to execute the atomic exchange, subscription, and registration pipeline under lock.
            </p>

            <form onSubmit={handleManualCallbackSubmit} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-[#4A5D54] dark:text-[#E2ECE4] block">
                  Meta Authorization Code (Single-Use 30s TTL)
                </label>
                <input
                  type="text"
                  required
                  value={devCode}
                  onChange={(e) => setDevCode(e.target.value)}
                  placeholder="e.g. AQD... or EAAB_..."
                  className="w-full p-2 rounded-lg bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] font-mono text-[#273338] dark:text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#4A5D54] dark:text-[#E2ECE4] block">
                  WABA ID (WhatsApp Business Account ID)
                </label>
                <input
                  type="text"
                  required
                  value={devWabaId}
                  onChange={(e) => setDevWabaId(e.target.value)}
                  placeholder="e.g. 109823475628192"
                  className="w-full p-2 rounded-lg bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] font-mono text-[#273338] dark:text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#4A5D54] dark:text-[#E2ECE4] block">
                  Phone Number ID
                </label>
                <input
                  type="text"
                  required
                  value={devPhoneId}
                  onChange={(e) => setDevPhoneId(e.target.value)}
                  placeholder="e.g. 104239857283921"
                  className="w-full p-2 rounded-lg bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] font-mono text-[#273338] dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDevModal(false)}
                  className="px-3.5 py-2 rounded-lg border border-[#D8E2D6] dark:border-[#618764] font-semibold text-[#75887E] dark:text-[#A0B2A6] hover:bg-[#EDF2EB] dark:hover:bg-[#202B2F] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCallback}
                  className="px-4 py-2 rounded-lg bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <MaterialIcon name="check" size={14} />
                  <span>{isSubmittingCallback ? 'Processing Pipeline...' : 'Process Callback'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
