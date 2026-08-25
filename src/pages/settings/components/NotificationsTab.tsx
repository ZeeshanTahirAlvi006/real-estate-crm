import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function NotificationsTab() {
  const [prefs, setPrefs] = useState([
    { type: 'new_lead', label: 'New Inbound Lead Assigned', email: true, push: true, sms: false },
    { type: 'stage_change', label: 'Pipeline Stage Change', email: true, push: true, sms: false },
    { type: 'data_health', label: 'Data Cleanliness & Duplicate Alerts', email: true, push: false, sms: false },
    { type: 'team_activity', label: 'Team Member Call & Note Logs', email: false, push: true, sms: false },
    { type: 'system', label: 'Security & Maintenance Broadcasts', email: true, push: false, sms: false },
  ])

  const togglePref = (type: string, channel: 'email' | 'push' | 'sms') => {
    setPrefs(prev => prev.map(p => p.type === type ? { ...p, [channel]: !p[channel] } : p))
  }

  const handleSave = () => {
    toast.success('Notification preferences saved!')
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Alert & Notification Matrix</CardTitle>
        <p className="text-xs text-muted-foreground">Configure how you receive updates across communication channels</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Notification Event</TableHead>
                <TableHead className="text-center w-24">Email</TableHead>
                <TableHead className="text-center w-24">Push</TableHead>
                <TableHead className="text-center w-24">SMS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prefs.map(p => (
                <TableRow key={p.type}>
                  <TableCell className="font-medium text-sm">{p.label}</TableCell>
                  <TableCell className="text-center">
                    <Switch checked={p.email} onCheckedChange={() => togglePref(p.type, 'email')} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch checked={p.push} onCheckedChange={() => togglePref(p.type, 'push')} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch checked={p.sms} onCheckedChange={() => togglePref(p.type, 'sms')} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Button onClick={handleSave}>Save Preferences</Button>
      </CardContent>
    </Card>
  )
}
