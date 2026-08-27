import type { PipelineStage } from '@/types'

export const DEFAULT_PIPELINE_STAGES: Omit<PipelineStage, 'dealCount' | 'totalValue' | 'weightedValue'>[] = [
  { id: 'new_lead', name: 'New Lead', color: '#6366f1', order: 0, probability: 10 },
  { id: 'contacted', name: 'Contacted', color: '#8b5cf6', order: 1, probability: 20 },
  { id: 'qualified', name: 'Qualified', color: '#06b6d4', order: 2, probability: 40 },
  { id: 'showing', name: 'Showing', color: '#f59e0b', order: 3, probability: 60 },
  { id: 'under_contract', name: 'Under Contract', color: '#10b981', order: 4, probability: 80 },
  { id: 'closed_won', name: 'Closed Won', color: '#22c55e', order: 5, probability: 100 },
  { id: 'closed_lost', name: 'Closed Lost', color: '#ef4444', order: 6, probability: 0 },
]

export const STAGE_COLORS: Record<string, string> = {
  new_lead: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  contacted: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  qualified: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  showing: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  under_contract: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  closed_won: 'bg-green-500/15 text-green-400 border-green-500/30',
  closed_lost: 'bg-red-500/15 text-red-400 border-red-500/30',
}
