import { useState, useEffect } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'
import { ParallaxGlow } from '@/components/landing/ParallaxGlow'
import { LandingNavbar } from '@/components/landing/LandingNavbar'
import { HeroSection } from '@/components/landing/HeroSection'
import { WhyCrmSection } from '@/components/landing/WhyCrmSection'
import { PlatformOverviewSection } from '@/components/landing/PlatformOverviewSection'
import { FeaturesGridSection } from '@/components/landing/FeaturesGridSection'
import { HowItWorksSection } from '@/components/landing/HowItWorksSection'
import { SocialProofSection } from '@/components/landing/SocialProofSection'
import { PricingSection } from '@/components/landing/PricingSection'
import { GenericVsPropPulseSection } from '@/components/landing/GenericVsPropPulseSection'
import { FaqSection } from '@/components/landing/FaqSection'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { AuthModal } from '@/components/landing/AuthModal'
import { theme } from '@/theme'

export function AuthLandingPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAppSelector((state) => state.auth)

  // Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login')
  const [selectedPlan, setSelectedPlan] = useState('Unlimited')

  // Auto-open modal if user navigates to /login or /signup
  useEffect(() => {
    if (location.pathname === '/login') {
      setAuthTab('login')
      setIsAuthModalOpen(true)
    } else if (location.pathname === '/signup') {
      setAuthTab('signup')
      setIsAuthModalOpen(true)
    }
  }, [location.pathname])

  // Redirect if already authenticated
  if (isAuthenticated) {
    if (user?.role === 'lead') {
      return <Navigate to="/portal" replace />
    }
    return <Navigate to="/dashboard" replace />
  }

  const handleOpenLogin = () => {
    setAuthTab('login')
    setIsAuthModalOpen(true)
  }

  const handleOpenSignup = (plan = 'Unlimited') => {
    setSelectedPlan(plan)
    setAuthTab('signup')
    setIsAuthModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsAuthModalOpen(false)
    if (location.pathname === '/login' || location.pathname === '/signup') {
      navigate('/', { replace: true })
    }
  }

  return (
    <div className={`relative min-h-screen ${theme.classes.pageBg} text-slate-900 dark:text-white font-sans selection:bg-[#0DD9B4] selection:text-slate-950 transition-colors duration-300`}>
      {/* Parallax Atmospheric Lighting */}
      <ParallaxGlow />

      {/* Sticky Header Navbar */}
      <LandingNavbar
        onOpenLogin={handleOpenLogin}
        onOpenSignup={() => handleOpenSignup('Unlimited')}
      />

      {/* 11 HighLevel Sections */}
      <main className="relative z-10">
        <HeroSection onOpenSignup={() => handleOpenSignup('Unlimited')} />
        <WhyCrmSection />
        <PlatformOverviewSection />
        <FeaturesGridSection />
        <HowItWorksSection />
        <SocialProofSection />
        <PricingSection onSelectPlan={(plan) => handleOpenSignup(plan)} />
        <GenericVsPropPulseSection />
        <FaqSection />
      </main>

      {/* Footer */}
      <LandingFooter />

      {/* Unified Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialTab={authTab}
        selectedPlan={selectedPlan}
        onClose={handleCloseModal}
      />
    </div>
  )
}
