import { toast } from 'sonner'
import { useGetRoutingRulesQuery, useDeleteRoutingRuleMutation } from '@/store/api/leadsApi'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const typeLabels: Record<string, string> = { round_robin: 'Round Robin', weighted: 'Weighted', zip_code: 'ZIP Code', time_of_day: 'Time of Day' }

export function RoutingRulesTab() {
  const { data: rules, isLoading } = useGetRoutingRulesQuery()
  const [deleteRule] = useDeleteRoutingRuleMutation()

  const handleDelete = async (id: string) => {
    try { await deleteRule(id).unwrap(); toast.success('Routing rule deleted') } catch { toast.error('Failed to delete rule') }
  }

  if (isLoading) return <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead>Rule Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Assigned Agents</TableHead>
            <TableHead className="text-center">Priority</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules?.map(r => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.name}</TableCell>
              <TableCell><Badge variant="outline">{typeLabels[r.type] || r.type}</Badge></TableCell>
              <TableCell className="text-sm text-muted-foreground">{r.assignedAgentNames?.join(', ')}</TableCell>
              <TableCell className="text-center">{r.priority}</TableCell>
              <TableCell className="text-center">
                <Badge variant={r.isActive ? 'default' : 'secondary'}>{r.isActive ? 'Active' : 'Disabled'}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(r.id)}>Delete</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
