import { useState } from 'react'
import { toast } from 'sonner'
import { PlusIcon } from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useGetTeamMembersQuery, useInviteTeamMemberMutation } from '@/store/api/settingsApi'
import { UserRole } from '@/types/auth'
import { ROLE_LABELS, ROLE_COLORS } from '@/constants/roles'

export function TeamManagementTab() {
  const { data: members, isLoading } = useGetTeamMembersQuery()
  const [inviteMember, { isLoading: inviting }] = useInviteTeamMemberMutation()
  const [showInvite, setShowInvite] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<string>(UserRole.AGENT)

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { toast.error('Please enter an email'); return }
    try {
      await inviteMember({ email, role }).unwrap()
      toast.success(`Invitation sent to ${email}`)
      setShowInvite(false)
      setEmail('')
    } catch {
      toast.error('Failed to send invite')
    }
  }

  if (isLoading) return <Skeleton className="h-48 rounded-xl" />

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Brokerage & Team Seats</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{members?.length || 0} active members</p>
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
                <TableHead>Last Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members?.map(m => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {m.firstName ? `${m.firstName[0]}${m.lastName[0] || ''}` : 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{m.firstName} {m.lastName}</p>
                        <p className="text-xs text-muted-foreground">{m.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={ROLE_COLORS[m.role]}>
                      {ROLE_LABELS[m.role]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={m.status === 'active' ? 'default' : 'secondary'}>
                      {m.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {m.lastActiveAt ? new Date(m.lastActiveAt).toLocaleString() : 'Pending login'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => toast.info(`Managing seat for ${m.email}`)}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Invite Dialog */}
        <Dialog open={showInvite} onOpenChange={setShowInvite}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Invite New Team Member</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inv-email">Work Email</Label>
                <Input
                  id="inv-email"
                  type="email"
                  placeholder="agent@brokerage.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inv-role">Seat Role</Label>
                <Select value={role} onValueChange={v => v && setRole(v)}>
                  <SelectTrigger id="inv-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UserRole.AGENT}>Agent</SelectItem>
                    <SelectItem value={UserRole.TEAM_LEAD}>Team Lead</SelectItem>
                    <SelectItem value={UserRole.BROKERAGE_OWNER}>Brokerage Owner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowInvite(false)}>Cancel</Button>
                <Button type="submit" disabled={inviting}>{inviting ? 'Sending...' : 'Send Invite'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
