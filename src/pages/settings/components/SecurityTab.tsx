import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { useChangePasswordMutation } from '@/store/api/authApi'

export function SecurityTab() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changePassword, { isLoading }] = useChangePasswordMutation()

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please enter all password fields')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long')
      return
    }
    try {
      await changePassword({ currentPassword, newPassword }).unwrap()
      toast.success('Password updated successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      toast.error('Failed to change password. Please verify current password and password complexity.')
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <Card className="bg-white dark:bg-[#2B5748] border-[#D8E2D6] dark:border-[#618764] shadow-xs">
        <CardHeader className="pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/60">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#9CB080]/20 text-[#273338] dark:text-[#9CB080] flex items-center justify-center">
              <MaterialIcon name="lock" size={20} />
            </div>
            <div>
              <CardTitle className="text-base text-[#273338] dark:text-white">Password Security</CardTitle>
              <p className="text-xs text-[#75887E] dark:text-[#A0B2A6] mt-0.5">
                Credential complexity rules
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="curr-pass" className="text-xs font-semibold text-[#4A5D54] dark:text-[#E2ECE4]">Current Password *</Label>
              <Input
                id="curr-pass"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-[#F5F7F4] dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-pass" className="text-xs font-semibold text-[#4A5D54] dark:text-[#E2ECE4]">New Password *</Label>
              <Input
                id="new-pass"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 chars (upper, lower, digit, symbol)"
                required
                className="bg-[#F5F7F4] dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="conf-pass" className="text-xs font-semibold text-[#4A5D54] dark:text-[#E2ECE4]">Confirm Password *</Label>
              <Input
                id="conf-pass"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
                className="bg-[#F5F7F4] dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white"
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] font-bold text-xs h-9 rounded-lg mt-2 cursor-pointer"
            >
              {isLoading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
