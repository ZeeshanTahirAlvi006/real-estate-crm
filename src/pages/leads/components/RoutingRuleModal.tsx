import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useGetTeamMembersQuery } from '@/store/api/settingsApi'
import { ROLE_LABELS } from '@/constants/roles'
import { toast } from 'sonner'

interface RoutingRuleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const RoutingRuleModal: React.FC<RoutingRuleModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { data: team = [] } = useGetTeamMembersQuery()
  const [ruleName, setRuleName] = useState('')
  const [ruleType, setRuleType] = useState('round_robin')
  const [escalationSeconds, setEscalationSeconds] = useState(60)
  const [minScore, setMinScore] = useState(60)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    toast.success(`Routing rule "${ruleName || 'Lead Distribution'}" created!`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            Create Intelligent Routing Rule
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-xs">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Rule Name</Label>
            <Input
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              placeholder="e.g. Austin Downtown Luxury Round-Robin"
              required
              className="h-9 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Distribution Model</Label>
              <Select value={ruleType} onValueChange={(val) => val && setRuleType(val as any)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="round_robin" className="text-xs">Round Robin (Equal)</SelectItem>
                  <SelectItem value="weighted" className="text-xs">Weighted Performance</SelectItem>
                  <SelectItem value="zip_code" className="text-xs">ZIP Code / Territory</SelectItem>
                  <SelectItem value="time_of_day" className="text-xs">Time-of-Day Escalation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Re-route Timeout (Secs)</Label>
              <Input
                type="number"
                value={escalationSeconds}
                onChange={(e) => setEscalationSeconds(Number(e.target.value) || 60)}
                placeholder="60"
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Minimum Lead Intent Score</Label>
            <Input
              type="number"
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value) || 0)}
              placeholder="60"
              className="h-9 text-xs font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              Leads scoring lower than this threshold will be routed to the AI ISA first for autonomous nurturing.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Participating Available Agents</Label>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/70 max-h-32 overflow-y-auto space-y-2">
              {team.filter(m => m.status === 'active').map((member) => (
                <label
                  key={member.id}
                  className="flex items-center justify-between text-xs cursor-pointer hover:bg-muted/40 p-1 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{member.firstName} {member.lastName}</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded-sm">
                      {ROLE_LABELS[member.role] || member.role}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" className="shadow-xs font-semibold">
              Save Routing Rule
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
