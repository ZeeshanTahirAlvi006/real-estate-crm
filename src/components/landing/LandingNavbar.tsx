import { useState, useEffect } from 'react'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { useTheme } from '@/providers/ThemeProvider'
import { theme } from '@/theme'

interface LandingNavbarProps {
  onOpenLogin: () => void
  onOpenSignup: () => void
}

export function LandingNavbar({ onOpenLogin, onOpenSignup }: LandingNavbarProps) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const toggleTheme = (e: React.MouseEvent) => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark', e)
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
        ? `${theme.classes.navScrolled} shadow-md py-3.5`
        : 'bg-transparent py-5'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <a href="#hero" className="flex items-center space-x-2.5 group cursor-pointer">
          <div className="flex items-baseline">
            <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white group-hover:text-[#2B5748] dark:group-hover:text-[#9CB080] transition-colors">
              PropPulse OS
            </span>
          </div>
        </a>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center space-x-7 text-sm font-medium text-slate-600 dark:text-slate-200">
          <a
            href="#why-crm"
            className="hover:text-[#2B5748] dark:hover:text-[#9CB080] transition-colors"
          >
            Why CRM
          </a>
          <a
            href="#platform"
            className="hover:text-[#2B5748] dark:hover:text-[#9CB080] transition-colors"
          >
            Platform
          </a>
          <a
            href="#features"
            className="hover:text-[#2B5748] dark:hover:text-[#9CB080] transition-colors"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="hover:text-[#2B5748] dark:hover:text-[#9CB080] transition-colors"
          >
            How It Works
          </a>
          <a
            href="#pricing"
            className="hover:text-[#2B5748] dark:hover:text-[#9CB080] transition-colors"
          >
            Pricing
          </a>
          <a
            href="#faq"
            className="hover:text-[#2B5748] dark:hover:text-[#9CB080] transition-colors"
          >
            FAQ
          </a>
        </nav>

        {/* Action CTAs + Dark/Light Mode Toggle */}
        <div className="flex items-center space-x-2.5 sm:space-x-3.5">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            type="button"
            aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="relative p-2 rounded-xl text-slate-700 dark:text-white transition-all duration-200 cursor-pointer active:scale-95 group shadow-xs"
            title={resolvedTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {resolvedTheme === 'dark' ? (
              <MaterialIcon name="light_mode" size={18} className="text-amber-300 group-hover:rotate-45 transition-transform duration-300" />
            ) : (
              <MaterialIcon name="dark_mode" size={18} className="text-[#2B5748] group-hover:-rotate-12 transition-transform duration-300" />
            )}
          </button>

          <button
            onClick={onOpenLogin}
            className="hidden sm:inline-flex text-sm font-semibold text-slate-700 dark:text-white hover:text-[#2B5748] dark:hover:text-[#9CB080] px-3 py-2 transition-colors cursor-pointer"
          >
            Login
          </button>

          <button
            onClick={onOpenSignup}
            className={`group relative inline-flex items-center justify-center text-xs sm:text-sm font-black px-4 sm:px-5 py-2.5 rounded-xl ${theme.classes.btnPrimary} shadow-md active:scale-95`}
          >
            <span>Start your FREE trial</span>
            <MaterialIcon name="arrow_forward" size={16} className="ml-1.5 transition-transform group-hover:translate-x-0.5" />
          </button>

          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
            className="md:hidden p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1E2570] transition-colors"
          >
            {mobileMenuOpen ? <MaterialIcon name="close" size={20} /> : <MaterialIcon name="menu" size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#D8E2D6] dark:border-[#618764] bg-white dark:bg-[#2B5748] px-4 pt-3 pb-5 space-y-3 animate-fadeIn">
          <nav className="flex flex-col space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            <a
              href="#why-crm"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 hover:text-[#2B5748] dark:hover:text-[#9CB080]"
            >
              Why CRM
            </a>
            <a
              href="#platform"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 hover:text-[#2B5748] dark:hover:text-[#9CB080]"
            >
              Platform
            </a>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 hover:text-[#2B5748] dark:hover:text-[#9CB080]"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 hover:text-[#2B5748] dark:hover:text-[#9CB080]"
            >
              How It Works
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 hover:text-[#2B5748] dark:hover:text-[#9CB080]"
            >
              Pricing
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 hover:text-[#2B5748] dark:hover:text-[#9CB080]"
            >
              FAQ
            </a>
          </nav>

          <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
            <button
              onClick={() => {
                setMobileMenuOpen(false)
                onOpenLogin()
              }}
              className="text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-[#2B5748] dark:hover:text-[#9CB080] py-2"
            >
              Login to Workspace
            </button>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500">Theme:</span>
              <button
                onClick={toggleTheme}
                className="p-3 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-white/10 flex items-center space-x-1.5 text-slate-800 dark:text-slate-200"
              >
                {resolvedTheme === 'dark' ? (
                  <>
                    <MaterialIcon name="light_mode_filled" size={14} className="text-amber-400" />
                    <span>Dark Mode</span>
                  </>
                ) : (
                  <>
                    <MaterialIcon name="dark_mode" size={14} className="text-[#2B5748]" />
                    <span>Light Mode</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
