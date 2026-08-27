import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useSignupMutation } from '@/store/api/authApi'
import { setCredentials } from '@/store/slices/authSlice'
import { useAppDispatch } from '@/store/hooks'
import { UserRole } from '@/types/auth'

export function SignupPage() {
  const [form, setForm] = useState<{
    firstName: string
    lastName: string
    email: string
    phone: string
    password: string
    confirmPassword: string
    role: UserRole
    brokerageName: string
  }>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: UserRole.BROKERAGE_OWNER,
    brokerageName: '',
  })

  const [agreed, setAgreed] = useState(false)
  const [signup, { isLoading }] = useSignupMutation()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleQuickFill = () => {
    const randomId = Math.floor(1000 + Math.random() * 9000)
    setForm({
      firstName: 'Shahzaib',
      lastName: 'Hassan',
      email: `shahzaib.${randomId}@almirajrealty.pk`,
      phone: '+92 300 9876543',
      password: 'Password!123',
      confirmPassword: 'Password!123',
      role: UserRole.BROKERAGE_OWNER,
      brokerageName: `Shahzaib Premier Estates ${randomId}`,
    })
    setAgreed(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      toast.error('Please fill in all required fields')
      return
    }

    if (!form.brokerageName) {
      toast.error('Please enter your brokerage or company name')
      return
    }

    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters long')
      return
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/
    if (!passwordRegex.test(form.password)) {
      toast.error(
        'Password must contain uppercase, lowercase, numbers, and special symbols'
      )
      return
    }

    if (!agreed) {
      toast.error('Please agree to the Terms of Service & Privacy Policy')
      return
    }

    try {
      const result = await signup({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        role: form.role,
        brokerageName: form.brokerageName,
      }).unwrap()

      dispatch(setCredentials(result))
      toast.success(`Welcome to PropPulse OS, ${result.user.firstName}!`)
      navigate('/dashboard')
    } catch (err: any) {
      const message =
        err?.data?.message ||
        'Unable to complete registration. Please check details or use another email.'
      toast.error(message)
    }
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-md shadow-2xl">
      <CardContent className="p-8">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-semibold">Start Your Brokerage Workspace</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enterprise multi-tenant real estate operating system
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name *</Label>
              <Input
                id="firstName"
                value={form.firstName}
                onChange={(e) => update('firstName', e.target.value)}
                placeholder="e.g. Tariq"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name *</Label>
              <Input
                id="lastName"
                value={form.lastName}
                onChange={(e) => update('lastName', e.target.value)}
                placeholder="e.g. Khan"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="signup-email">Work Email *</Label>
            <Input
              id="signup-email"
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="name@brokerage.com"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="brokerage">Brokerage Name *</Label>
              <Input
                id="brokerage"
                value={form.brokerageName}
                onChange={(e) => update('brokerageName', e.target.value)}
                placeholder="e.g. Al-Miraj Builders"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role">Initial Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => v && update('role', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.BROKERAGE_OWNER}>
                    🏢 Brokerage Owner
                  </SelectItem>
                  <SelectItem value={UserRole.TEAM_LEAD}>
                    👥 Team Lead
                  </SelectItem>
                  <SelectItem value={UserRole.AGENT}>
                    👤 Agent
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="signup-password">Password *</Label>
              <Input
                id="signup-password"
                type="password"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                placeholder="Min. 8 chars"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm Password *</Label>
              <Input
                id="confirm-password"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => update('confirmPassword', e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <Checkbox
              id="terms"
              checked={agreed}
              onCheckedChange={(c) => setAgreed(c as boolean)}
            />
            <Label htmlFor="terms" className="text-xs font-normal text-muted-foreground">
              I agree to the <span className="text-primary hover:underline">Terms of Service</span> and{' '}
              <span className="text-primary hover:underline">Privacy Policy</span>
            </Label>
          </div>

          <Button type="submit" className="w-full mt-2" disabled={isLoading}>
            {isLoading ? 'Creating Brokerage Account...' : 'Create Account & Workspace'}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full text-xs text-muted-foreground"
            onClick={handleQuickFill}
          >
            ⚡ Auto-Fill Demo Registration
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
