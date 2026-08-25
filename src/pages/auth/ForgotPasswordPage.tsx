import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useForgotPasswordMutation } from '@/store/api/authApi'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { toast.error('Please enter your email'); return }
    try {
      await forgotPassword({ email }).unwrap()
      setSent(true)
      toast.success('Password reset link sent!')
    } catch {
      toast.error('Failed to send reset link. Please try again.')
    }
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-md shadow-2xl">
      <CardContent className="p-8">
        {sent ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-3xl">✉️</div>
            <h2 className="text-xl font-semibold">Check your email</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We've sent a password reset link to <strong className="text-foreground">{email}</strong>
            </p>
            <Button variant="outline" className="mt-6 w-full" onClick={() => setSent(false)}>
              Try another email
            </Button>
            <Link to="/login" className="mt-4 block text-sm text-primary hover:underline">
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 text-center">
              <h2 className="text-xl font-semibold">Forgot your password?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter your email and we'll send you a reset link
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input id="reset-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send reset link'}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link to="/login" className="text-primary hover:underline">Back to sign in</Link>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
