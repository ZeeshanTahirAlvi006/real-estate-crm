import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { toast } from 'sonner'
import { useLoginMutation, useSignupMutation } from '@/store/api/authApi'
import { setCredentials } from '@/store/slices/authSlice'
import { useAppDispatch } from '@/store/hooks'
import { UserRole } from '@/types/auth'

interface AuthModalProps {
  isOpen: boolean
  initialTab?: 'login' | 'signup'
  selectedPlan?: string
  onClose: () => void
}

export function AuthModal({
  isOpen,
  initialTab = 'login',
  selectedPlan = 'Unlimited',
  onClose,
}: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'signup'>(initialTab)
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  useEffect(() => {
    setTab(initialTab)
  }, [initialTab])

  // Login form state
  const [loginEmail, setLoginEmail] = useState('owner@almiraj.com')
  const [loginPassword, setLoginPassword] = useState('Password!123')
  const [rememberMe, setRememberMe] = useState(true)
  const [loginApi, { isLoading: isLoggingIn }] = useLoginMutation()

  // Signup form state
  const [signupForm, setSignupForm] = useState<{
    firstName: string
    lastName: string
    email: string
    phone: string
    brokerageName: string
    password: string
    confirmPassword: string
    role: UserRole
  }>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    brokerageName: '',
    password: '',
    confirmPassword: '',
    role: UserRole.BROKERAGE_OWNER,
  })
  const [agreed, setAgreed] = useState(true)
  const [signupApi, { isLoading: isSigningUp }] = useSignupMutation()

  // Password visibility state
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const togglePasswordVisibility = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    setter((prev) => !prev)
  }

  if (!isOpen) return null

  const handleQuickFillLogin = (email: string) => {
    setLoginEmail(email)
    setLoginPassword('Password!123')
  }

  const handleQuickFillOwnerSignup = () => {
    const randomId = Math.floor(1000 + Math.random() * 9000)
    setSignupForm({
      firstName: 'Shahzaib',
      lastName: 'Hassan',
      email: `shahzaib.${randomId}@almirajrealty.pk`,
      phone: '+1 (555) 392-8819',
      brokerageName: `Hassan Premier Real Estate ${randomId}`,
      password: 'Password!123',
      confirmPassword: 'Password!123',
      role: UserRole.BROKERAGE_OWNER,
    })
    setAgreed(true)
  }

  const handleQuickFillAgentSignup = () => {
    const randomId = Math.floor(1000 + Math.random() * 9000)
    setSignupForm({
      firstName: 'Hamza',
      lastName: 'Farooq',
      email: `hamza.agent.${randomId}@almirajrealty.pk`,
      phone: '+1 (555) 782-9012',
      brokerageName: 'Al-Miraj Real Estate & Builders',
      password: 'Password!123',
      confirmPassword: 'Password!123',
      role: UserRole.AGENT,
    })
    setAgreed(true)
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginEmail || !loginPassword) {
      toast.error('Please enter your email and password')
      return
    }

    try {
      const result = await loginApi({ email: loginEmail, password: loginPassword }).unwrap()
      dispatch(setCredentials(result))
      toast.success(`Welcome back, ${result.user.firstName}!`)
      onClose()
      if (result.user.role === 'lead') {
        navigate('/portal')
      } else {
        navigate('/dashboard')
      }
    } catch (err: any) {
      let message = 'Invalid email or password. Please try again.'
      if (err?.status === 'FETCH_ERROR' || err?.error?.includes('Failed to fetch') || err?.error?.includes('fetch')) {
        message = 'Internet Connection Lost'
      } else if (err?.data?.message) {
        message = err.data.message
      }
      toast.error(message)
    }
  }

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!signupForm.firstName || !signupForm.lastName || !signupForm.email || !signupForm.password) {
      toast.error('Please fill in all required fields')
      return
    }

    if (!signupForm.brokerageName) {
      toast.error('Please enter your brokerage or team name')
      return
    }

    if (signupForm.password !== signupForm.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (signupForm.password.length < 8) {
      toast.error('Password must be at least 8 characters long')
      return
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/
    if (!passwordRegex.test(signupForm.password)) {
      toast.error('Password must contain uppercase, lowercase, numbers, and symbols')
      return
    }

    if (!agreed) {
      toast.error('Please agree to the Terms of Service & Privacy Policy')
      return
    }

    try {
      const result = await signupApi({
        firstName: signupForm.firstName,
        lastName: signupForm.lastName,
        email: signupForm.email,
        password: signupForm.password,
        role: signupForm.role,
        brokerageName: signupForm.brokerageName,
      }).unwrap()

      dispatch(setCredentials(result))
      toast.success(`Welcome to PropPulse OS, ${result.user.firstName}!`)
      onClose()
      navigate('/dashboard')
    } catch (err: any) {
      const message =
        err?.data?.message || 'Unable to complete registration. Please check details.'
      toast.error(message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Plain Dark Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Card (High-Contrast Layering in Dark & Light) */}
      <div className="relative z-10 w-full max-w-lg rounded-3xl bg-white dark:bg-[#1C2529] border border-[#D8E2D6] dark:border-[#384C53] p-6 sm:p-8 shadow-2xl text-slate-900 dark:text-white my-8 overflow-hidden animate-fadeIn">

        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-5 right-5 p-1 rounded-full text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-[#253237] transition-colors cursor-pointer"
        >
          <MaterialIcon name="close" size={22} />
        </button>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            PropPulse OS
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-medium">
            {tab === 'login' ? 'Sign in to access your workspace' : `Start Your 14-Day Free Trial (${selectedPlan} Plan)`}
          </p>
        </div>

        {/* Tab Switcher (Segmented Selector with distinct contrast) */}
        <div className="flex rounded-xl bg-[#EDF2EB] dark:bg-[#131B1E] p-1 mb-6 border border-[#D8E2D6] dark:border-[#2C3B40]">
          <button
            type="button"
            onClick={() => setTab('login')}
            className={`flex-1 py-2 text-xs rounded-lg transition-all cursor-pointer ${tab === 'login'
                ? 'bg-white dark:bg-[#2C3D43] text-slate-900 dark:text-white font-black shadow-sm border border-slate-200/80 dark:border-[#4B636C]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold'
              }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setTab('signup')}
            className={`flex-1 py-2 text-xs rounded-lg transition-all cursor-pointer ${tab === 'signup'
                ? 'bg-white dark:bg-[#2C3D43] text-slate-900 dark:text-white font-black shadow-sm border border-slate-200/80 dark:border-[#4B636C]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold'
              }`}
          >
            Sign Up
          </button>
        </div>

        {/* Tab 1: SIGN IN */}
        {tab === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5 uppercase tracking-wider">
                Work Email
              </label>
              <div className="relative">
                <MaterialIcon name="mail" size={18} className="text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="agent@brokerage.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#141C1F] border border-[#D8E2D6] dark:border-[#384C53] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#9CB080] focus:ring-1 focus:ring-[#9CB080] text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  onClick={onClose}
                  className="text-xs text-[#2B5748] dark:text-[#9CB080] hover:underline font-bold"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <MaterialIcon name="lock" size={18} className="text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-[#141C1F] border border-[#D8E2D6] dark:border-[#384C53] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#9CB080] focus:ring-1 focus:ring-[#9CB080] text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility(setShowPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-[#9CB080] cursor-pointer flex items-center justify-center"
                >
                  <MaterialIcon name={showPassword ? 'visibility_off' : 'visibility'} size={18} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center space-x-2 text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 dark:border-[#4B636C] bg-white dark:bg-[#141C1F] text-[#9CB080] focus:ring-0 cursor-pointer"
                />
                <span>Remember me for 30 days</span>
              </label>
            </div>

            {/* High-Contrast Sign In Button */}
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 rounded-xl bg-[#9CB080] hover:bg-[#8CA070] text-[#141C1F] font-black text-sm shadow-md active:scale-98 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isLoggingIn ? 'Signing in...' : 'Sign In'}
            </button>

            {/* Quick Fill Demo Roles Box */}
            <div className="mt-5 pt-4 border-t border-[#D8E2D6] dark:border-[#2C3C42]">
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center mb-3">
                Quick Fill Demo Accounts
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleQuickFillLogin('owner@almiraj.com')}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#232F34] hover:bg-[#EDF2EB] dark:hover:bg-[#2C3C42] border border-[#D8E2D6] dark:border-[#384C53] hover:border-[#618764] dark:hover:border-[#618764] text-left transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <MaterialIcon name="domain" size={16} className="text-[#618764] dark:text-[#9CB080] shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate">Broker Owner</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#2B5748] dark:text-[#9CB080] bg-[#EDF2EB] dark:bg-[#182226] px-1.5 py-0.5 rounded border border-[#D8E2D6] dark:border-[#2D3E44] shrink-0">Demo</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFillLogin('ayesha.lead@almiraj.com')}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#232F34] hover:bg-[#EDF2EB] dark:hover:bg-[#2C3C42] border border-[#D8E2D6] dark:border-[#384C53] hover:border-[#618764] dark:hover:border-[#618764] text-left transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <MaterialIcon name="person" size={16} className="text-[#618764] dark:text-[#9CB080] shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate">Client / Lead</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#2B5748] dark:text-[#9CB080] bg-[#EDF2EB] dark:bg-[#182226] px-1.5 py-0.5 rounded border border-[#D8E2D6] dark:border-[#2D3E44] shrink-0">Demo</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFillLogin('hamza@almiraj.com')}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#232F34] hover:bg-[#EDF2EB] dark:hover:bg-[#2C3C42] border border-[#D8E2D6] dark:border-[#384C53] hover:border-[#618764] dark:hover:border-[#618764] text-left transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <MaterialIcon name="badge" size={16} className="text-[#618764] dark:text-[#9CB080] shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate">Agent Hamza</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#2B5748] dark:text-[#9CB080] bg-[#EDF2EB] dark:bg-[#182226] px-1.5 py-0.5 rounded border border-[#D8E2D6] dark:border-[#2D3E44] shrink-0">Demo</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFillLogin('superadmin@proppulse.com')}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#232F34] hover:bg-[#EDF2EB] dark:hover:bg-[#2C3C42] border border-[#D8E2D6] dark:border-[#384C53] hover:border-[#618764] dark:hover:border-[#618764] text-left transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <MaterialIcon name="admin_panel_settings" size={16} className="text-[#618764] dark:text-[#9CB080] shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate">Super Admin</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#2B5748] dark:text-[#9CB080] bg-[#EDF2EB] dark:bg-[#182226] px-1.5 py-0.5 rounded border border-[#D8E2D6] dark:border-[#2D3E44] shrink-0">Demo</span>
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* Tab 2: SIGN UP / 14-DAY TRIAL */
          <form onSubmit={handleSignupSubmit} className="space-y-3.5">
            {/* Account Type Selector (Broker Owner vs Real Estate Agent) */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                Registering As *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSignupForm({ ...signupForm, role: UserRole.BROKERAGE_OWNER })}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${signupForm.role === UserRole.BROKERAGE_OWNER
                      ? 'bg-[#EDF2EB] dark:bg-[#202E29] border-[#618764] dark:border-[#9CB080] shadow-sm ring-1 ring-[#9CB080]'
                      : 'bg-slate-50 dark:bg-[#141C1F] border-[#D8E2D6] dark:border-[#384C53] opacity-75 hover:opacity-100'
                    }`}
                >
                  <div className="flex items-center space-x-2">
                    <MaterialIcon
                      name="domain"
                      size={18}
                      className={signupForm.role === UserRole.BROKERAGE_OWNER ? 'text-[#2B5748] dark:text-[#9CB080]' : 'text-slate-400'}
                    />
                    <span className="font-bold text-xs text-slate-900 dark:text-white">Brokerage Owner</span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Start new brokerage workspace</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSignupForm({ ...signupForm, role: UserRole.AGENT })}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${signupForm.role === UserRole.AGENT
                      ? 'bg-[#EDF2EB] dark:bg-[#202E29] border-[#618764] dark:border-[#9CB080] shadow-sm ring-1 ring-[#9CB080]'
                      : 'bg-slate-50 dark:bg-[#141C1F] border-[#D8E2D6] dark:border-[#384C53] opacity-75 hover:opacity-100'
                    }`}
                >
                  <div className="flex items-center space-x-2">
                    <MaterialIcon
                      name="badge"
                      size={18}
                      className={signupForm.role === UserRole.AGENT ? 'text-[#2B5748] dark:text-[#9CB080]' : 'text-slate-400'}
                    />
                    <span className="font-bold text-xs text-slate-900 dark:text-white">Real Estate Agent</span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Join existing brokerage team</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase tracking-wider">
                  First Name *
                </label>
                <input
                  type="text"
                  value={signupForm.firstName}
                  onChange={(e) => setSignupForm({ ...signupForm, firstName: e.target.value })}
                  placeholder="e.g. Alex"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#141C1F] border border-[#D8E2D6] dark:border-[#384C53] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#9CB080] transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase tracking-wider">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={signupForm.lastName}
                  onChange={(e) => setSignupForm({ ...signupForm, lastName: e.target.value })}
                  placeholder="e.g. Miller"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#141C1F] border border-[#D8E2D6] dark:border-[#384C53] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#9CB080] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase tracking-wider">
                Work Email *
              </label>
              <input
                type="email"
                value={signupForm.email}
                onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                placeholder="alex@premierestates.com"
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#141C1F] border border-[#D8E2D6] dark:border-[#384C53] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#9CB080] transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase tracking-wider">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={signupForm.phone}
                  onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#141C1F] border border-[#D8E2D6] dark:border-[#384C53] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#9CB080] transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase tracking-wider">
                  {signupForm.role === UserRole.AGENT ? 'Brokerage Name *' : 'Brokerage / Company *'}
                </label>
                <input
                  type="text"
                  value={signupForm.brokerageName}
                  onChange={(e) => setSignupForm({ ...signupForm, brokerageName: e.target.value })}
                  placeholder={signupForm.role === UserRole.AGENT ? 'e.g. Al-Miraj Real Estate & Builders' : 'Premier Realty'}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#141C1F] border border-[#D8E2D6] dark:border-[#384C53] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#9CB080] transition-all"
                />
                {signupForm.role === UserRole.AGENT && (
                  <p className="text-[10px] text-[#2B5748] dark:text-[#9CB080] font-medium mt-1">
                    One brokerage can have multiple agents.
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase tracking-wider">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    placeholder="Password!123"
                    required
                    className="w-full pl-3 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-[#141C1F] border border-[#D8E2D6] dark:border-[#384C53] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#9CB080] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility(setShowPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-[#9CB080] cursor-pointer flex items-center justify-center"
                  >
                    <MaterialIcon name={showPassword ? 'visibility_off' : 'visibility'} size={16} />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase tracking-wider">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={signupForm.confirmPassword}
                    onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                    placeholder="Password!123"
                    required
                    className="w-full pl-3 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-[#141C1F] border border-[#D8E2D6] dark:border-[#384C53] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#9CB080] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility(setShowConfirmPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-[#9CB080] cursor-pointer flex items-center justify-center"
                  >
                    <MaterialIcon name={showConfirmPassword ? 'visibility_off' : 'visibility'} size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-xs pt-1">
              <input
                type="checkbox"
                id="modal-terms"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="rounded border-slate-300 dark:border-[#4B636C] bg-white dark:bg-[#141C1F] text-[#9CB080] focus:ring-0 cursor-pointer"
              />
              <label htmlFor="modal-terms" className="text-slate-600 dark:text-slate-300 cursor-pointer">
                I agree to the Terms of Service & {signupForm.role === UserRole.AGENT ? 'agent onboarding agreement' : '14-day trial agreement'}
              </label>
            </div>

            {/* High-Contrast Sign Up Button */}
            <button
              type="submit"
              disabled={isSigningUp}
              className="w-full py-3.5 rounded-xl bg-[#9CB080] hover:bg-[#8CA070] text-[#141C1F] font-black text-sm shadow-md active:scale-98 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSigningUp
                ? signupForm.role === UserRole.AGENT
                  ? 'Joining Brokerage Team...'
                  : 'Setting up Workspace...'
                : signupForm.role === UserRole.AGENT
                  ? 'Join Brokerage as Agent'
                  : 'Start My 14-Day Free Trial'}
            </button>

            {/* Quick Fill Buttons for Both Roles */}
            <div className="pt-2 border-t border-[#D8E2D6] dark:border-[#2C3C42]">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center mb-2">
                Quick Fill Registration Demos
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleQuickFillOwnerSignup}
                  className="p-2 rounded-xl bg-slate-50 dark:bg-[#232F34] hover:bg-[#EDF2EB] dark:hover:bg-[#2C3C42] border border-[#D8E2D6] dark:border-[#384C53] hover:border-[#618764] dark:hover:border-[#618764] text-left transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center space-x-1.5 min-w-0">
                    <MaterialIcon name="domain" size={15} className="text-[#618764] dark:text-[#9CB080] shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-[11px] truncate">Owner Demo</span>
                  </div>
                  <MaterialIcon name="bolt" size={13} className="text-[#2B5748] dark:text-[#9CB080] shrink-0" />
                </button>
                <button
                  type="button"
                  onClick={handleQuickFillAgentSignup}
                  className="p-2 rounded-xl bg-slate-50 dark:bg-[#232F34] hover:bg-[#EDF2EB] dark:hover:bg-[#2C3C42] border border-[#D8E2D6] dark:border-[#384C53] hover:border-[#618764] dark:hover:border-[#618764] text-left transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center space-x-1.5 min-w-0">
                    <MaterialIcon name="badge" size={15} className="text-[#618764] dark:text-[#9CB080] shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-[11px] truncate">Agent Demo</span>
                  </div>
                  <MaterialIcon name="bolt" size={13} className="text-[#2B5748] dark:text-[#9CB080] shrink-0" />
                </button>
              </div>
            </div>
          </form>
        )}

      </div>
    </div>
  )
}
