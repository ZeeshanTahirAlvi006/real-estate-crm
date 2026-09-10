import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { setCredentials, setInitialized } from '@/store/slices/authSlice'
import { useGetMeQuery } from '@/store/api/authApi'
import type { UserRole } from '@/types/auth'
import type { ReactNode } from 'react'
import { ShieldExclamationIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRoles?: UserRole[]
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const dispatch = useAppDispatch()
  const location = useLocation()
  const { isAuthenticated, isInitialized, user } = useAppSelector((state) => state.auth)

  // On mount / page refresh, validate session via GET /api/auth/me only before initialization
  const { data, isError, isSuccess, error } = useGetMeQuery(undefined, {
    skip: isInitialized,
  })

  // Sync getMe result into auth slice
  useEffect(() => {
    if (isSuccess && data) {
      dispatch(setCredentials({ user: data }))
    } else if (isError || error) {
      dispatch(setInitialized())
    }
  }, [isSuccess, isError, error, data, dispatch])

  // Safety fallback: if session check takes > 2.5s, unblock loader screen so app doesn't hang
  useEffect(() => {
    if (!isInitialized) {
      const timer = setTimeout(() => {
        dispatch(setInitialized())
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [isInitialized, dispatch])

  // Show loading splash while initial session check is in-flight
  if (!isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-10 w-10">
            <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary" />
          </div>
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            Verifying session…
          </p>
        </div>
      </div>
    )
  }

  // Not authenticated — redirect to login with return path
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  // Role-based access check
  if (requiredRoles && user && !requiredRoles.includes(user.role)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="rounded-2xl bg-destructive/10 p-4">
            <ShieldExclamationIcon className="h-10 w-10 text-destructive" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Access Denied</h2>
          <p className="text-sm text-muted-foreground">
            Your role ({user.role.replace(/_/g, ' ')}) does not have permission to access this page.
          </p>
          <Button variant="outline" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
