import { useState } from 'react'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useLoginMutation } from '@/store/api/authApi'
import { setCredentials } from '@/store/slices/authSlice'
import { useAppDispatch, useAppSelector } from '@/store/hooks'

export function LoginPage() {
  const [email, setEmail] = useState('owner@almiraj.com')
  const [password, setPassword] = useState('Password!123')
  const [rememberMe, setRememberMe] = useState(false)
  const [login, { isLoading }] = useLoginMutation()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAppSelector((state) => state.auth)

  // Redirect if already authenticated
  if (isAuthenticated) {
    if (user?.role === 'lead') {
      return <Navigate to="/portal" replace />
    }
    return <Navigate to="/dashboard" replace />
  }

  const handleQuickFill = (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword('Password!123')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Please enter your email and password')
      return
    }
    try {
      const result = await login({ email, password }).unwrap()
      dispatch(setCredentials(result))
      toast.success(`Welcome back, ${result.user.firstName}!`)
      if (result.user.role === 'lead') {
        navigate('/portal')
      } else {
        navigate('/dashboard')
      }
    } catch (err: any) {
      const message = err?.data?.message || 'Invalid email or password. Please try again.'
      toast.error(message)
    }
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-md shadow-2xl">
      <CardContent className="p-8">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-semibold">Welcome back</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to your PropPulse account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                to="/forgot-password"
                className="text-xs text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked as boolean)}
            />
            <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground">
              Remember me for 30 days
            </Label>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        {/* Demo Accounts Quick-Picker */}
        <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider text-center mb-2">
            Quick Fill Demo Accounts
          </p>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs justify-start h-8 px-2"
              onClick={() => handleQuickFill('owner@almiraj.com')}
            >
              🏢 Brokerage Owner
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs justify-start h-8 px-2"
              onClick={() => handleQuickFill('ayesha.lead@almiraj.com')}
            >
              💼 Client / Business Lead
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs justify-start h-8 px-2"
              onClick={() => handleQuickFill('hamza@almiraj.com')}
            >
              👤 Agent (Hamza)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs justify-start h-8 px-2"
              onClick={() => handleQuickFill('superadmin@proppulse.com')}
            >
              👑 Super Admin
            </Button>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/signup" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
