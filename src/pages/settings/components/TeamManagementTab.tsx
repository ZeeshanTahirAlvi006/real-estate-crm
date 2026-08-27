import { useState } from 'react'
import { toast } from 'sonner'
import { PlusIcon, TrashIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useGetUsersQuery,
  useInviteUserMutation,
  useChangeUserRoleMutation,
  useDeactivateUserMutation,
} from '@/store/api/usersApi'
import { UserRole } from '@/types/auth'
import { ROLE_LABELS, ROLE_COLORS } from '@/constants/roles'
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

  if (isLoading) return <Skeleton className="h-48 rounded-xl" />

  const usersList = data?.users || []

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Brokerage & Team Seats</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{data?.total || usersList.length} registered members</p>
          </div>
          <Button size="sm" onClick={() => setShowInvite(true)}>
            <PlusIcon className="mr-2 h-4 w-4" /> Invite Member
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Brokerage</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersList.map((m) => {
                  const isSelf = m.id === currentUser?.id
                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                              {m.firstName?.[0]}
                              {m.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-xs font-medium">
                              {m.firstName} {m.lastName} {isSelf && <span className="text-primary font-normal">(You)</span>}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{m.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {currentUser?.role === UserRole.SUPER_ADMIN || currentUser?.role === UserRole.BROKERAGE_OWNER ? (
                          <Select
                            value={m.role}
                            onValueChange={(val) => handleRoleChange(m.id, val as UserRole)}
                            disabled={isSelf}
                          >
                            <SelectTrigger className="h-7 w-35 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={UserRole.BROKERAGE_OWNER}>Brokerage Owner</SelectItem>
                              <SelectItem value={UserRole.TEAM_LEAD}>Team Lead</SelectItem>
                              <SelectItem value={UserRole.AGENT}>Agent</SelectItem>
                              <SelectItem value={UserRole.LEAD}>Lead / Client</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge className={`text-[10px] px-2 py-0.5 border ${ROLE_COLORS[m.role as UserRole] || ''}`}>
                            {ROLE_LABELS[m.role as UserRole] || m.role}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={m.isActive ? 'default' : 'secondary'}
                          className={`text-[10px] ${m.isActive ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' : 'bg-muted text-muted-foreground'}`}
                        >
                          {m.isActive ? 'Active' : 'Deactivated'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {m.brokerageName || 'Al-Miraj Real Estate'}
                      </TableCell>
                      <TableCell className="text-right">
                        {!isSelf && m.isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            onClick={() => handleDeactivate(m.id, `${m.firstName} ${m.lastName}`)}
                          >
                            <TrashIcon className="h-3.5 w-3.5 mr-1" /> Deactivate
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Invite Member Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle>Invite New Team Member</DialogTitle>
            <DialogDescription>
              A high-entropy one-time password will be generated for the user's initial login.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="first-name">First Name *</Label>
                <Input
                  id="first-name"
                  placeholder="e.g. Tariq"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last-name">Last Name *</Label>
                <Input
                  id="last-name"
                  placeholder="e.g. Khan"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email Address *</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="name@almiraj.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invite-phone">Phone Number</Label>
              <Input
                id="invite-phone"
                placeholder="+92 300 1234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>System Role *</Label>
              <Select value={role} onValueChange={(val) => setRole(val as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.TEAM_LEAD}>👥 Team Lead</SelectItem>
                  <SelectItem value={UserRole.AGENT}>👤 Agent</SelectItem>
                  <SelectItem value={UserRole.BROKERAGE_OWNER}>🏢 Brokerage Owner</SelectItem>
                  <SelectItem value={UserRole.LEAD}>🏷️ Lead / Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setShowInvite(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={inviting}>
                {inviting ? 'Generating...' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* One-Time Temporary Password Display Dialog */}
      <Dialog open={!!createdCredentials} onOpenChange={() => setCreatedCredentials(null)}>
        <DialogContent className="sm:max-w-112.5">
          <DialogHeader>
            <div className="flex items-center gap-2 text-emerald-500 mb-1">
              <ShieldCheckIcon className="h-5 w-5" />
              <DialogTitle>Temporary Credentials Generated</DialogTitle>
            </div>
            <DialogDescription>
              Share this one-time temporary password with <strong>{createdCredentials?.email}</strong>. The user will be required to change their password upon initial login.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
            <div className="text-xs text-muted-foreground">One-Time Password:</div>
            <div className="flex items-center justify-between bg-card p-3 rounded-lg border border-border font-mono text-sm font-bold text-primary">
              <span>{createdCredentials?.temporaryPassword}</span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
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
            <Button onClick={() => setCreatedCredentials(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
