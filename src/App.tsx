import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Provider } from 'react-redux'
import { Toaster } from 'sonner'
import { store } from '@/store/store'
import { ThemeProvider, useTheme } from '@/providers/ThemeProvider'
import { SocketProvider } from '@/providers/SocketProvider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthLayout } from '@/layouts/AuthLayout'
import { AppLayout } from '@/layouts/AppLayout'
import { PortalLayout } from '@/layouts/PortalLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RouteLoadingFallback } from '@/components/shared/RouteLoadingFallback'

// Auth Pages (Code Split)
const AuthLandingPage = lazy(() => import('@/pages/auth/AuthLandingPage').then(m => ({ default: m.AuthLandingPage })))
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })))

// Main Pages (Code Split)
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })))
const InboxPage = lazy(() => import('@/pages/inbox/InboxPage').then(m => ({ default: m.InboxPage })))
const DialerPage = lazy(() => import('@/pages/dialer/DialerPage').then(m => ({ default: m.DialerPage })))
const AiIsaPage = lazy(() => import('@/pages/ai-isa/AiIsaPage').then(m => ({ default: m.AiIsaPage })))
const ContactsPage = lazy(() => import('@/pages/contacts/ContactsPage').then(m => ({ default: m.ContactsPage })))
const ContactDetailPage = lazy(() => import('@/pages/contacts/ContactDetailPage').then(m => ({ default: m.ContactDetailPage })))
const PipelinePage = lazy(() => import('@/pages/pipeline/PipelinePage').then(m => ({ default: m.PipelinePage })))
const TransactionsPage = lazy(() => import('@/pages/transactions/TransactionsPage').then(m => ({ default: m.TransactionsPage })))
const TransactionDetailPage = lazy(() => import('@/pages/transactions/TransactionDetailPage').then(m => ({ default: m.TransactionDetailPage })))
const SmartListsPage = lazy(() => import('@/pages/smart-lists/SmartListsPage').then(m => ({ default: m.SmartListsPage })))
const DataHealthPage = lazy(() => import('@/pages/data-health/DataHealthPage').then(m => ({ default: m.DataHealthPage })))
const LeadIngestionPage = lazy(() => import('@/pages/leads/LeadIngestionPage').then(m => ({ default: m.LeadIngestionPage })))
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })))
const LeadPortalPage = lazy(() => import('@/pages/portal/LeadPortalPage').then(m => ({ default: m.LeadPortalPage })))
const PortalSettingsPage = lazy(() => import('@/pages/portal/PortalSettingsPage').then(m => ({ default: m.PortalSettingsPage })))
const CommissionsPage = lazy(() => import('@/pages/commissions/CommissionsPage').then(m => ({ default: m.CommissionsPage })))
const PublicSignPage = lazy(() => import('@/pages/esign/PublicSignPage').then(m => ({ default: m.PublicSignPage })))
const MicroCmaPage = lazy(() => import('@/pages/cma/MicroCmaPage').then(m => ({ default: m.MicroCmaPage })))

function ThemedToaster() {
  const { resolvedTheme } = useTheme()
  return (
    <Toaster
      position="top-right"
      theme={resolvedTheme}
      richColors
      closeButton
      duration={4000}
      visibleToasts={3}
    />
  )
}

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <SocketProvider>
          <TooltipProvider>
            <ThemedToaster />
            <BrowserRouter>
              <Suspense fallback={<RouteLoadingFallback />}>
                <Routes>
                {/* Public Flagship Marketing & Auth Landing Pages */}
                <Route path="/" element={<AuthLandingPage />} />
                <Route path="/login" element={<AuthLandingPage />} />
                <Route path="/signup" element={<AuthLandingPage />} />

                {/* Public Auth Sub-Routes */}
                <Route element={<AuthLayout />}>
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                </Route>

                {/* Public Standalone eSignature Execution Route */}
                <Route path="/sign/:token" element={<PublicSignPage />} />

                {/* Public Standalone Micro-CMA Report Route */}
                <Route path="/cma/:id" element={<MicroCmaPage />} />
                <Route path="/cma" element={<MicroCmaPage />} />
                <Route path="/micro-cma" element={<MicroCmaPage />} />

                {/* Client Lead Portal Standalone Route */}
                <Route
                  element={
                    <ProtectedRoute>
                      <PortalLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/portal" element={<LeadPortalPage />} />
                  <Route path="/portal/settings" element={<PortalSettingsPage />} />
                </Route>

                {/* Protected App Routes */}
                <Route
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/inbox" element={<InboxPage />} />
                  <Route path="/dialer" element={<DialerPage />} />
                  <Route path="/ai-isa" element={<AiIsaPage />} />
                  <Route path="/contacts" element={<ContactsPage />} />
                  <Route path="/contacts/:id" element={<ContactDetailPage />} />
                  <Route path="/pipeline" element={<PipelinePage />} />
                  <Route path="/transactions" element={<TransactionsPage />} />
                  <Route path="/transactions/:id" element={<TransactionDetailPage />} />
                  <Route path="/commissions" element={<CommissionsPage />} />
                  <Route path="/smart-lists" element={<SmartListsPage />} />
                  <Route path="/data-health" element={<DataHealthPage />} />
                  <Route path="/lead-ingestion" element={<LeadIngestionPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>

                {/* Catch-all redirect */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
          </TooltipProvider>
        </SocketProvider>
      </ThemeProvider>
    </Provider>
  )
}

export default App
