import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAppSelector } from '@/store/hooks'
import { useUpdateProfileMutation } from '@/store/api/settingsApi'
import { ROLE_LABELS } from '@/constants/roles'

export function ProfileTab() {
  const user = useAppSelector(state => state.auth.user)
  const [firstName, setFirstName] = useState(user?.firstName || '')
  const [lastName, setLastName] = useState(user?.lastName || '')
  const [phone, setPhone] = useState(user?.phone || '(512) 555-0001')
  const [timezone, setTimezone] = useState(user?.timezone || 'America/Chicago')
  const [updateProfile, { isLoading }] = useUpdateProfileMutation()

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await updateProfile({ firstName, lastName, phone, timezone }).unwrap()
      toast.success('Profile updated successfully!')
    } catch {
      toast.error('Failed to update profile')
    }
  }

  const initials = `${firstName[0] || 'P'}${lastName[0] || 'P'}`

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Personal Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-6 max-w-xl">
          {/* Avatar row */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <Button type="button" variant="outline" size="sm" onClick={() => toast.info('Avatar upload ready in production')}>
                Change Avatar
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">JPG, GIF or PNG. Max size 2MB</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prof-fn">First name</Label>
              <Input id="prof-fn" value={firstName} onChange={e => setFirstName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prof-ln">Last name</Label>
              <Input id="prof-ln" value={lastName} onChange={e => setLastName(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prof-email">Email Address</Label>
            <Input id="prof-email" type="email" value={user?.email || ''} disabled className="bg-muted/50" />
            <p className="text-xs text-muted-foreground">Managed by your organization admin.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prof-phone">Phone number</Label>
              <Input id="prof-phone" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prof-role">Assigned Role</Label>
              <Input id="prof-role" value={user ? ROLE_LABELS[user.role] : 'Agent'} disabled className="bg-muted/50" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prof-tz">Timezone</Label>
            <Input id="prof-tz" value={timezone} onChange={e => setTimezone(e.target.value)} />
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Profile Changes'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
