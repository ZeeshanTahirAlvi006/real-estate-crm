import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { TableGridToggle, TableGridToggleButton, type TableColumn, type TableGridViewMode } from '@/components/shared/TableGridToggle'
import type { User } from '@/types/auth'
import {
  useGetUsersQuery,
  useInviteUserMutation,
  useChangeUserRoleMutation,
  useDeactivateUserMutation,
} from '@/store/api/usersApi'
import { UserRole } from '@/types/auth'
import { ROLE_LABELS } from '@/constants/roles'
import { useAppSelector } from '@/store/hooks'

export function TeamManagementTab() {
  const currentUser = useAppSelector((state) => state.auth.user)
  const { data, isLoading } = useGetUsersQuery()
  const [inviteUser, { isLoading: inviting }] = useInviteUserMutation()
  const [changeRole] = useChangeUserRoleMutation()
  const [deactivateUser] = useDeactivateUserMutation()

  const [showInvite, setShowInvite] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<UserRole>(UserRole.AGENT)

  // One-time temporary password display dialog state
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; temporaryPassword: string } | null>(null)

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName || !lastName || !email) {
      toast.error('Please complete all required fields')
      return
    }
    try {
      const result = await inviteUser({
        firstName,
        lastName,
        email,
        phone,
        role,
      }).unwrap()

      toast.success(`Member invited successfully!`)
      setShowInvite(false)
      setFirstName('')
      setLastName('')
      setEmail('')
      setPhone('')
      setRole(UserRole.AGENT)

      // Prompt admin with one-time credentials
      setCreatedCredentials({
        email: result.user.email,
        temporaryPassword: result.temporaryPassword,
      })
    } catch {
      toast.error('Failed to invite user. Email may already be registered.')
    }
  }

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await changeRole({ id: userId, role: newRole }).unwrap()
      toast.success('User role updated')
    } catch {
      toast.error('Failed to update user role')
    }
  }

  const handleDeactivate = async (userId: string, memberName: string) => {
    if (confirm(`Are you sure you want to deactivate ${memberName}'s account?`)) {
      try {
        await deactivateUser(userId).unwrap()
        toast.success(`${memberName} deactivated`)
      } catch {
        toast.error('Failed to deactivate user')
      }
    }
  }

  const usersList = data?.users || []

  const [view, setView] = useState<TableGridViewMode>(() => {
    const saved = localStorage.getItem('crm_settings_team_view')
    return saved === 'grid' ? 'grid' : 'table'
  })

  const handleViewChange = (newView: TableGridViewMode) => {
    setView(newView)
    localStorage.setItem('crm_settings_team_view', newView)
  }

  const columns: TableColumn<User>[] = [
    {
      id: 'member',
      header: 'Member',
      className: '',
      cell: (m) => {
        const isSelf = m.id === currentUser?.id
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 border border-[#D8E2D6] dark:border-[#618764]">
              <AvatarFallback className="text-xs font-bold bg-[#9CB080]/20 text-[#273338] dark:text-[#9CB080]">
                {m.firstName?.[0]}
                {m.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs font-semibold text-[#273338] dark:text-white">
                {m.firstName} {m.lastName} {isSelf && <span className="text-[#9CB080] font-normal">(You)</span>}
              </p>
              <p className="text-[10px] text-[#75887E] dark:text-[#A0B2A6]">{m.email}</p>
            </div>
          </div>
        )
      },
    },
    {
      id: 'role',
      header: 'Role',
      cell: (m) => {
        const isSelf = m.id === currentUser?.id
        return currentUser?.role === UserRole.SUPER_ADMIN || currentUser?.role === UserRole.BROKERAGE_OWNER ? (
          <Select
            value={m.role}
            onValueChange={(val) => handleRoleChange(m.id, val as UserRole)}
            disabled={isSelf}
          >
            <SelectTrigger className="h-7 w-36 text-xs bg-[#F5F7F4] dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-[#2B5748] border-[#D8E2D6] dark:border-[#618764]">
              <SelectItem value={UserRole.BROKERAGE_OWNER}>Brokerage Owner</SelectItem>
              <SelectItem value={UserRole.AGENT}>Real Estate Agent</SelectItem>
              <SelectItem value={UserRole.LEAD}>Client Lead</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Badge className="text-[10px] px-2 py-0.5 rounded font-semibold bg-[#202B2F] text-white border border-[#618764]">
            {ROLE_LABELS[m.role as UserRole] || m.role}
          </Badge>
        )
      },
    },
    {
      id: 'status',
      header: 'Status',
      align: 'center',
      cell: (m) => (
        <Badge
          variant="outline"
          className={`text-[10px] rounded px-2 py-0.5 font-bold ${
            m.isActive
              ? 'bg-[#9CB080]/20 text-[#273338] dark:text-[#9CB080] border-[#9CB080]/40'
              : 'bg-[#EDF2EB] dark:bg-[#202B2F] text-[#75887E] dark:text-[#A0B2A6] border-[#D8E2D6] dark:border-[#618764]'
          }`}
        >
          {m.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'brokerage',
      header: 'Brokerage',
      cell: (m) => (
        <span className="text-xs text-[#75887E] dark:text-[#A0B2A6]">
          {m.brokerageName || 'Al-Miraj Real Estate'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (m) => {
        const isSelf = m.id === currentUser?.id
        if (!isSelf && m.isActive) {
          return (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 cursor-pointer"
              onClick={() => handleDeactivate(m.id, `${m.firstName} ${m.lastName}`)}
            >
              <MaterialIcon name="delete" size={14} className="mr-1" /> Deactivate
            </Button>
          )
        }
        return null
      },
    },
  ]

  const renderUserCard = (m: User) => {
    const isSelf = m.id === currentUser?.id
    return (
      <div
        key={m.id}
        className="h-full flex flex-col justify-between p-4 rounded-xl border border-[#D8E2D6] dark:border-[#618764]/50 bg-[#F5F7F4]/60 dark:bg-[#202B2F] shadow-xs hover:border-[#618764] transition-all space-y-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-10 w-10 border border-[#D8E2D6] dark:border-[#618764] shrink-0">
              <AvatarFallback className="text-xs font-bold bg-[#9CB080]/20 text-[#273338] dark:text-[#9CB080]">
                {m.firstName?.[0]}
                {m.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#273338] dark:text-white truncate">
                {m.firstName} {m.lastName} {isSelf && <span className="text-[#9CB080] font-normal">(You)</span>}
              </p>
              <p className="text-[11px] text-[#75887E] dark:text-[#A0B2A6] truncate">{m.email}</p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={`text-[10px] rounded px-2 py-0.5 font-bold shrink-0 ${
              m.isActive
                ? 'bg-[#9CB080]/20 text-[#273338] dark:text-[#9CB080] border-[#9CB080]/40'
                : 'bg-[#EDF2EB] dark:bg-[#202B2F] text-[#75887E] dark:text-[#A0B2A6] border-[#D8E2D6] dark:border-[#618764]'
            }`}
          >
            {m.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        <div className="flex items-center justify-between text-xs pt-2 border-t border-[#D8E2D6]/60 dark:border-[#618764]/30">
          <span className="text-[11px] text-[#75887E] dark:text-[#A0B2A6] truncate">
            {m.brokerageName || 'Al-Miraj Real Estate'}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex-1 max-w-[180px]">
            {currentUser?.role === UserRole.SUPER_ADMIN || currentUser?.role === UserRole.BROKERAGE_OWNER ? (
              <Select
                value={m.role}
                onValueChange={(val) => handleRoleChange(m.id, val as UserRole)}
                disabled={isSelf}
              >
                <SelectTrigger className="h-7 text-xs bg-white dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#2B5748] border-[#D8E2D6] dark:border-[#618764]">
                  <SelectItem value={UserRole.BROKERAGE_OWNER}>Brokerage Owner</SelectItem>
                  <SelectItem value={UserRole.AGENT}>Real Estate Agent</SelectItem>
                  <SelectItem value={UserRole.LEAD}>Client Lead</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge className="text-[10px] px-2 py-0.5 rounded font-semibold bg-[#202B2F] text-white border border-[#618764]">
                {ROLE_LABELS[m.role as UserRole] || m.role}
              </Badge>
            )}
          </div>

          {!isSelf && m.isActive && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 cursor-pointer"
              onClick={() => handleDeactivate(m.id, `${m.firstName} ${m.lastName}`)}
            >
              <MaterialIcon name="delete" size={14} className="mr-1" /> Deactivate
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white dark:bg-[#2B5748] border-[#D8E2D6] dark:border-[#618764] shadow-xs">
        <CardHeader className="pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#9CB080]/20 text-[#273338] dark:text-[#9CB080] flex items-center justify-center">
              <MaterialIcon name="groups" size={20} />
            </div>
            <div>
              <CardTitle className="text-base text-[#273338] dark:text-white">Team Members</CardTitle>
              <p className="text-xs text-[#75887E] dark:text-[#A0B2A6] mt-0.5">{data?.total || usersList.length} registered members</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <TableGridToggleButton
              view={view}
              onViewChange={handleViewChange}
              storageKey="crm_settings_team_view"
              tableTitle="Table View"
              gridTitle="Grid View (2 per row)"
            />
            <Button
              size="sm"
              onClick={() => setShowInvite(true)}
              className="bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] font-bold text-xs h-9 px-3.5 gap-1.5 rounded-lg shrink-0 cursor-pointer"
            >
              <MaterialIcon name="add" size={16} />
              <span>Invite Member</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <TableGridToggle<User>
            data={usersList}
            isLoading={isLoading}
            view={view}
            onViewChange={handleViewChange}
            storageKey="crm_settings_team_view"
            hideToggle={true}
            emptyIcon="groups"
            emptyTitle="No team members found"
            emptyDescription="Invite agents and owners to your brokerage."
            columns={columns}
            renderCard={renderUserCard}
          />
        </CardContent>
      </Card>

      {/* Invite Member Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#2B5748] border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#273338] dark:text-white">Invite Member</DialogTitle>
            <DialogDescription className="text-xs text-[#75887E] dark:text-[#A0B2A6]">
              A temporary password will be generated for initial sign in.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="first-name" className="text-xs font-semibold text-[#4A5D54] dark:text-[#E2ECE4]">First Name *</Label>
                <Input
                  id="first-name"
                  placeholder="e.g. Tariq"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="bg-[#F5F7F4] dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last-name" className="text-xs font-semibold text-[#4A5D54] dark:text-[#E2ECE4]">Last Name *</Label>
                <Input
                  id="last-name"
                  placeholder="e.g. Khan"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="bg-[#F5F7F4] dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invite-email" className="text-xs font-semibold text-[#4A5D54] dark:text-[#E2ECE4]">Email Address *</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="name@almiraj.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-[#F5F7F4] dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invite-phone" className="text-xs font-semibold text-[#4A5D54] dark:text-[#E2ECE4]">Phone Number</Label>
              <Input
                id="invite-phone"
                placeholder="+92 300 1234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-[#F5F7F4] dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#4A5D54] dark:text-[#E2ECE4]">System Role *</Label>
              <Select value={role} onValueChange={(val) => setRole(val as UserRole)}>
                <SelectTrigger className="bg-[#F5F7F4] dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#2B5748] border-[#D8E2D6] dark:border-[#618764]">
                  <SelectItem value={UserRole.AGENT}>Real Estate Agent</SelectItem>
                  <SelectItem value={UserRole.BROKERAGE_OWNER}>Brokerage Owner</SelectItem>
                  <SelectItem value={UserRole.LEAD}>Client Lead</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setShowInvite(false)} className="border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white">
                Cancel
              </Button>
              <Button type="submit" disabled={inviting} className="bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] font-bold">
                {inviting ? 'Generating...' : 'Send Invite'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* One-Time Temporary Password Display Dialog */}
      <Dialog open={!!createdCredentials} onOpenChange={() => setCreatedCredentials(null)}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#2B5748] border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white">
          <DialogHeader>
            <div className="flex items-center gap-2 text-[#9CB080] mb-1">
              <MaterialIcon name="verified_user" size={22} />
              <DialogTitle className="text-base font-bold text-[#273338] dark:text-white">Temporary Credentials</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-[#75887E] dark:text-[#A0B2A6]">
              Share this one-time password with <strong>{createdCredentials?.email}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-[#618764] bg-[#EDF2EB] dark:bg-[#202B2F] p-4 space-y-2">
            <div className="text-xs text-[#75887E] dark:text-[#A0B2A6]">One-Time Password:</div>
            <div className="flex items-center justify-between bg-white dark:bg-[#273338] p-3 rounded-lg border border-[#D8E2D6] dark:border-[#618764] font-mono text-sm font-bold text-[#273338] dark:text-white">
              <span>{createdCredentials?.temporaryPassword}</span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white cursor-pointer"
                onClick={() => {
                  if (createdCredentials) {
                    navigator.clipboard.writeText(createdCredentials.temporaryPassword)
                    toast.success('Password copied to clipboard!')
                  }
                }}
              >
                Copy
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setCreatedCredentials(null)} className="bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] font-bold">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
