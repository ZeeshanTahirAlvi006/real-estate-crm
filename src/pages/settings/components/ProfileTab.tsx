import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
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
    <Card className="bg-white dark:bg-[#2B5748] border-[#D8E2D6] dark:border-[#618764] shadow-xs">
      <CardHeader className="pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/60">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[#9CB080]/20 text-[#273338] dark:text-[#9CB080] flex items-center justify-center">
            <MaterialIcon name="person" size={20} />
          </div>
          <div>
            <CardTitle className="text-base text-[#273338] dark:text-white">Profile Details</CardTitle>
            <p className="text-xs text-[#75887E] dark:text-[#A0B2A6] mt-0.5">
              Personal contact info
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSave} className="space-y-5 max-w-xl">
          {/* Avatar row */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border border-[#D8E2D6] dark:border-[#618764]">
              <AvatarFallback className="bg-[#9CB080]/20 text-[#273338] dark:text-[#9CB080] text-xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => toast.info('Avatar upload ready in production')}
                className="text-xs h-8 rounded-lg border-[#D8E2D6] dark:border-[#618764] hover:bg-[#EDF2EB] dark:hover:bg-[#202B2F] text-[#273338] dark:text-white"
              >
                Change Avatar
              </Button>
              <p className="mt-1 text-xs text-[#75887E] dark:text-[#A0B2A6]">JPG, GIF or PNG. Max 2MB</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="prof-fn" className="text-xs font-semibold text-[#4A5D54] dark:text-[#E2ECE4]">First name</Label>
              <Input
                id="prof-fn"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                required
                className="bg-[#F5F7F4] dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white focus:border-[#9CB080] focus:ring-1 focus:ring-[#9CB080]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prof-ln" className="text-xs font-semibold text-[#4A5D54] dark:text-[#E2ECE4]">Last name</Label>
              <Input
                id="prof-ln"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                required
                className="bg-[#F5F7F4] dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white focus:border-[#9CB080] focus:ring-1 focus:ring-[#9CB080]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prof-email" className="text-xs font-semibold text-[#4A5D54] dark:text-[#E2ECE4]">Email Address</Label>
            <Input
              id="prof-email"
              type="email"
              value={user?.email || ''}
              disabled
              className="bg-[#EDF2EB] dark:bg-[#202B2F]/60 border-[#D8E2D6] dark:border-[#618764] text-[#75887E] dark:text-[#A0B2A6]"
            />
            <p className="text-xs text-[#75887E] dark:text-[#A0B2A6]">Managed by organization admin.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="prof-phone" className="text-xs font-semibold text-[#4A5D54] dark:text-[#E2ECE4]">Phone number</Label>
              <Input
                id="prof-phone"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="bg-[#F5F7F4] dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white focus:border-[#9CB080] focus:ring-1 focus:ring-[#9CB080]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prof-role" className="text-xs font-semibold text-[#4A5D54] dark:text-[#E2ECE4]">Assigned Role</Label>
              <Input
                id="prof-role"
                value={user ? ROLE_LABELS[user.role] : 'Agent'}
                disabled
                className="bg-[#EDF2EB] dark:bg-[#202B2F]/60 border-[#D8E2D6] dark:border-[#618764] text-[#75887E] dark:text-[#A0B2A6]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prof-tz" className="text-xs font-semibold text-[#4A5D54] dark:text-[#E2ECE4]">Timezone</Label>
            <Input
              id="prof-tz"
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className="bg-[#F5F7F4] dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white focus:border-[#9CB080] focus:ring-1 focus:ring-[#9CB080]"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] font-bold text-xs h-9 px-4 rounded-lg cursor-pointer"
          >
            {isLoading ? 'Saving...' : 'Save Profile'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
