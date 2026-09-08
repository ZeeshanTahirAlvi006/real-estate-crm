import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

export function NotificationsTab() {
  const [prefs, setPrefs] = useState([
    { type: 'new_lead', label: 'New Lead Assignment', email: true, push: true },
    { type: 'stage_change', label: 'Stage Pipeline Change', email: true, push: true },
    { type: 'data_health', label: 'Data Duplicate Alerts', email: true, push: false },
    { type: 'team_activity', label: 'Team Activity Logs', email: false, push: true },
    { type: 'system', label: 'System Maintenance Alerts', email: true, push: false },
  ])

  const togglePref = (type: string, channel: 'email' | 'push') => {
    setPrefs(prev => prev.map(p => p.type === type ? { ...p, [channel]: !p[channel] } : p))
  }

  const handleSave = () => {
    toast.success('Notification preferences saved!')
  }

  return (
    <Card className="bg-white dark:bg-[#2B5748] border-[#D8E2D6] dark:border-[#618764] shadow-xs">
      <CardHeader className="pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/60">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[#9CB080]/20 text-[#273338] dark:text-[#9CB080] flex items-center justify-center">
            <MaterialIcon name="notifications" size={20} />
          </div>
          <div>
            <CardTitle className="text-base text-[#273338] dark:text-white">Notification Alerts</CardTitle>
            <p className="text-xs text-[#75887E] dark:text-[#A0B2A6] mt-0.5">Channel notification matrix</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="rounded-xl border border-[#D8E2D6] dark:border-[#618764] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#EDF2EB] dark:bg-[#202B2F] border-b border-[#D8E2D6] dark:border-[#618764]/60">
                <TableHead className="text-xs font-bold text-[#4A5D54] dark:text-[#E2ECE4]">Notification Event</TableHead>
                <TableHead className="text-center w-28 text-xs font-bold text-[#4A5D54] dark:text-[#E2ECE4]">Email</TableHead>
                <TableHead className="text-center w-28 text-xs font-bold text-[#4A5D54] dark:text-[#E2ECE4]">Push</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prefs.map(p => (
                <TableRow key={p.type} className="border-b border-[#D8E2D6] dark:border-[#618764]/30 hover:bg-[#EDF2EB]/50 dark:hover:bg-[#202B2F]/60">
                  <TableCell className="font-medium text-xs text-[#273338] dark:text-white">{p.label}</TableCell>
                  <TableCell className="text-center">
                    <Switch checked={p.email} onCheckedChange={() => togglePref(p.type, 'email')} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch checked={p.push} onCheckedChange={() => togglePref(p.type, 'push')} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Button
          onClick={handleSave}
          className="bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] font-bold text-xs h-9 px-4 rounded-lg cursor-pointer"
        >
          Save Preferences
        </Button>
      </CardContent>
    </Card>
  )
}
