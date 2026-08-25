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
    password: string
    confirmPassword: string
    role: UserRole
    brokerageName: string
  }>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: UserRole.AGENT,
    brokerageName: '',
  })
  const [agreed, setAgreed] = useState(false)
  const [signup, { isLoading }] = useSignupMutation()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      toast.error('Please fill in all required fields')
      return
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (!agreed) {
      toast.error('Please agree to the Terms & Conditions')
      return
    }
    try {
      const result = await signup(form).unwrap()
      dispatch(setCredentials(result))
      toast.success('Account created successfully!')
      navigate('/dashboard')
    } catch {
      toast.error('Failed to create account. Please try again.')
    }
  }

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-md shadow-2xl">
      <CardContent className="p-8">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-semibold">Create your account</h2>
          <p className="mt-1 text-sm text-muted-foreground">Start your 14-day free trial</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" value={form.firstName} onChange={e => update('firstName', e.target.value)} placeholder="John" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" value={form.lastName} onChange={e => update('lastName', e.target.value)} placeholder="Doe" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-email">Email</Label>
            <Input id="signup-email" type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="you@company.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={form.role} onValueChange={v => v && update('role', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={UserRole.AGENT}>Agent</SelectItem>
                <SelectItem value={UserRole.TEAM_LEAD}>Team Lead</SelectItem>
                <SelectItem value={UserRole.BROKERAGE_OWNER}>Brokerage Owner</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(form.role === UserRole.BROKERAGE_OWNER) && (
            <div className="space-y-2">
              <Label htmlFor="brokerage">Brokerage name</Label>
              <Input id="brokerage" value={form.brokerageName} onChange={e => update('brokerageName', e.target.value)} placeholder="Your brokerage" />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="signup-password">Password</Label>
            <Input id="signup-password" type="password" value={form.password} onChange={e => update('password', e.target.value)} placeholder="Min. 6 characters" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input id="confirm-password" type="password" value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} placeholder="••••••••" />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="terms" checked={agreed} onCheckedChange={c => setAgreed(c as boolean)} />
            <Label htmlFor="terms" className="text-sm font-normal text-muted-foreground">
              I agree to the <span className="text-primary cursor-pointer hover:underline">Terms & Conditions</span>
            </Label>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Create account'}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </CardContent>
    </Card>
  )
}
