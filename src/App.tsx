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

// Auth Pages
import { LoginPage } from '@/pages/auth/LoginPage'
import { SignupPage } from '@/pages/auth/SignupPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'

// Main Pages
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { InboxPage } from '@/pages/inbox/InboxPage'
import { DialerPage } from '@/pages/dialer/DialerPage'
import { AiIsaPage } from '@/pages/ai-isa/AiIsaPage'
import { ContactsPage } from '@/pages/contacts/ContactsPage'
import { ContactDetailPage } from '@/pages/contacts/ContactDetailPage'
import { PipelinePage } from '@/pages/pipeline/PipelinePage'
import { TransactionsPage } from '@/pages/transactions/TransactionsPage'
import { TransactionDetailPage } from '@/pages/transactions/TransactionDetailPage'
import { SmartListsPage } from '@/pages/smart-lists/SmartListsPage'
import { DataHealthPage } from '@/pages/data-health/DataHealthPage'
import { LeadIngestionPage } from '@/pages/leads/LeadIngestionPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { LeadPortalPage } from '@/pages/portal/LeadPortalPage'
import { PortalSettingsPage } from '@/pages/portal/PortalSettingsPage'

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
              <Routes>
                {/* Public Auth Routes */}
                <Route element={<AuthLayout />}>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                </Route>

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
                  <Route path="/smart-lists" element={<SmartListsPage />} />
                  <Route path="/data-health" element={<DataHealthPage />} />
                  <Route path="/lead-ingestion" element={<LeadIngestionPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>

                {/* Default redirect */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </SocketProvider>
      </ThemeProvider>
    </Provider>
  )
}

export default App
