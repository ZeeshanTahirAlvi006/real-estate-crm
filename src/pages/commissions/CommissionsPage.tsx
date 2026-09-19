import { useState, useEffect } from 'react'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useGetCommissionReportQuery,
  useGetCommissionsQuery,
  useUpdateCommissionStatusMutation,
  useCalculateCommissionMutation,
  useCreateCommissionMutation,
  useGetCapSettingsQuery,
  useUpdateBrokerageCapMutation,
  useUpdateAgentCapMutation,
} from '@/store/api/commissionsApi'
import { useGetUsersQuery } from '@/store/api/usersApi'
import { useAppSelector } from '@/store/hooks'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { KpiCard } from '@/components/shared/KpiCard'
import { useCountUp } from '@/hooks/useCountUp'
import { TableGridToggle, TableGridToggleButton, type TableColumn, type TableGridViewMode } from '@/components/shared/TableGridToggle'
import type { AgentCommissionReport } from '@/types/commission'

export function CommissionsPage() {
  const user = useAppSelector((state) => state.auth.user)
  const isBrokerOrLead =
    user?.role === 'brokerage_owner' || user?.role === 'super_admin' || user?.role === 'team_lead'

  const { data: report, isLoading: reportLoading } = useGetCommissionReportQuery()
  const { data: commissionsData, isLoading: commissionsLoading } = useGetCommissionsQuery()
  const [updateStatus, { isLoading: isUpdatingStatus }] = useUpdateCommissionStatusMutation()
  const [calculateCommission, { isLoading: isCalculating }] = useCalculateCommissionMutation()
  const [createCommission, { isLoading: isCreatingCommission }] = useCreateCommissionMutation()

  // Brokerage Cap Configuration
  const [brokerCapModalOpen, setBrokerCapModalOpen] = useState(false)
  const { data: capSettings } = useGetCapSettingsQuery(undefined, { skip: !isBrokerOrLead })
  const [updateBrokerageCap, { isLoading: isUpdatingBrokerCap }] = useUpdateBrokerageCapMutation()
  const [defaultBrokerCap, setDefaultBrokerCap] = useState(18000)
  const [defaultBrokerSplit, setDefaultBrokerSplit] = useState(80)

  useEffect(() => {
    if (capSettings) {
      setDefaultBrokerCap(capSettings.defaultCommissionCap)
      setDefaultBrokerSplit(capSettings.defaultCommissionSplitAgent)
    }
  }, [capSettings])

  // Agent Quick-Edit Cap Modal
  const [agentCapModalOpen, setAgentCapModalOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<{
    id: string
    name: string
    currentCap: number
    splitPercent: number
    model: 'capped' | 'tiered' | 'fixed'
  } | null>(null)
  const [updateAgentCap, { isLoading: isUpdatingAgentCap }] = useUpdateAgentCapMutation()

  // Team users for agent dropdown in calculator
  const { data: usersData } = useGetUsersQuery()
  const eligibleAgents =
    usersData?.users?.filter((u) => u.role === 'agent' || u.role === 'team_lead' || u.role === 'brokerage_owner') || []

  // Calculator Dialog State
  const [calcOpen, setCalcOpen] = useState(false)
  const [salePrice, setSalePrice] = useState(650000)
  const [commissionPercent, setCommissionPercent] = useState(3.0)
  const [splitModel, setSplitModel] = useState<'fixed' | 'tiered' | 'capped'>('capped')
  const [agentSplitPercent, setAgentSplitPercent] = useState(80)
  const [franchiseFeePercent, setFranchiseFeePercent] = useState(6.0)
  const [tcFee, setTcFee] = useState(395)
  const [eoInsuranceFee, setEoInsuranceFee] = useState(150)
  const [deskFee, setDeskFee] = useState(100)
  const [referralFeePercent] = useState(0)
  const [selectedAgentId, setSelectedAgentId] = useState(user?.id || '')
  const [capThreshold, setCapThreshold] = useState(18000)

  // Live calculation preview state
  const [calcPreview, setCalcPreview] = useState<any>(null)

  // Animated KPI numbers
  const animatedGci = useCountUp({
    end: report?.totalGrossCommission || 0,
    duration: 1600,
  })
  const animatedPayouts = useCountUp({
    end: report?.totalAgentPayouts || 0,
    duration: 1500,
  })
  const animatedRetained = useCountUp({
    end: report?.totalBrokerageRetained || 0,
    duration: 1400,
  })
  const animatedPending = useCountUp({
    end: report?.pendingApprovalCount || 0,
    duration: 1000,
  })

  const handleAgentSelect = (agentId: string) => {
    setSelectedAgentId(agentId)
    const repAgent = report?.agentReports.find((r) => r.agentId === agentId)
    const userAgent = eligibleAgents.find((u) => u.id === agentId)
    if (repAgent) {
      setCapThreshold(repAgent.annualCap)
    } else if (userAgent?.commissionCap) {
      setCapThreshold(userAgent.commissionCap)
    } else if (capSettings?.defaultCommissionCap) {
      setCapThreshold(capSettings.defaultCommissionCap)
    }
    if (userAgent?.commissionSplitPercent) {
      setAgentSplitPercent(userAgent.commissionSplitPercent)
    }
  }

  const handleRunCalculation = async () => {
    try {
      const res = await calculateCommission({
        salePrice,
        commissionRate: commissionPercent,
        splitModel,
        splitPercentAgent: agentSplitPercent,
        franchiseFeePercent,
        tcFee,
        eoInsuranceFee,
        deskFee,
        referralFeePercent,
        agentId: selectedAgentId,
        capThreshold,
      }).unwrap()
      setCalcPreview(res)
    } catch {
      toast.error('Calculation failed')
    }
  }

  const handleSaveSettlement = async () => {
    if (!selectedAgentId) {
      toast.error('Agent required')
      return
    }
    try {
      await createCommission({
        agentId: selectedAgentId,
        salePrice,
        commissionRate: commissionPercent,
        splitModel,
        splitPercentAgent: agentSplitPercent,
        franchiseFeePercent,
        tcFee,
        eoInsuranceFee,
        deskFee,
        referralFeePercent,
        capThreshold,
        status: isBrokerOrLead ? 'approved' : 'pending_approval',
      }).unwrap()
      toast.success('Settlement saved')
      setCalcOpen(false)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to save settlement')
    }
  }

  const handleStatusChange = async (id: string, nextStatus: 'approved' | 'paid') => {
    try {
      await updateStatus({ id, status: nextStatus }).unwrap()
      toast.success(`Marked as ${nextStatus}`)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Update failed')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const [leaderboardView, setLeaderboardView] = useState<TableGridViewMode>('table')
  const [ledgerView, setLedgerView] = useState<TableGridViewMode>('table')

  const leaderboardColumns: TableColumn<AgentCommissionReport>[] = [
    {
      header: 'Agent',
      accessorKey: 'agentName',
      className: '',
      cell: (agent) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#EDF2EB] dark:bg-[#202B2F] text-[#2B5748] dark:text-[#9CB080] border border-[#D8E2D6] dark:border-[#618764]/50 font-bold flex items-center justify-center text-xs shrink-0 font-mono">
            {agent.agentName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-sm text-[#273338] dark:text-white">
              {agent.agentName}
            </div>
            <p className="text-xs text-[#75887E] dark:text-[#A0B2A6]">
              {agent.agentEmail || 'Agent'}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'isCapped',
      cell: (agent) =>
        agent.isCapped ? (
          <Badge className="bg-[#9CB080]/20 text-[#2B5748] dark:text-[#9CB080] border border-[#9CB080]/30 text-[10px] font-bold">
            Capped
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="text-[10px] border-[#D8E2D6] dark:border-[#618764] text-[#75887E] dark:text-[#A0B2A6]"
          >
            Progress
          </Badge>
        ),
    },
    {
      header: 'Cap Progress',
      accessorKey: 'capPercent',
      className: '',
      cell: (agent) => (
        <div className="space-y-1.5 w-full max-w-[11rem]">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#75887E] dark:text-[#A0B2A6]">Cap</span>
            <span className="font-bold font-mono text-[#273338] dark:text-white">
              {formatCurrency(agent.capContributionYtd)} / {formatCurrency(agent.annualCap)} ({agent.capPercent}%)
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#EDF2EB] dark:bg-[#202B2F] border border-[#D8E2D6]/40 dark:border-[#618764]/30 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                agent.isCapped ? 'bg-[#9CB080]' : 'bg-[#618764]'
              }`}
              style={{ width: `${Math.min(100, agent.capPercent)}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      header: 'Deals',
      accessorKey: 'totalDealsClosed',
      className: 'text-right',
      cell: (agent) => (
        <div className="font-mono font-bold text-sm text-[#273338] dark:text-white">
          {agent.totalDealsClosed}
        </div>
      ),
    },
    {
      header: 'GCI',
      accessorKey: 'totalGrossCommission',
      className: 'text-right',
      cell: (agent) => (
        <div className="font-mono font-bold text-sm text-[#273338] dark:text-white">
          {formatCurrency(agent.totalGrossCommission)}
        </div>
      ),
    },
    {
      header: 'Net Payout',
      accessorKey: 'totalAgentNetPayout',
      className: 'text-right',
      cell: (agent) => (
        <div className="font-mono font-bold text-sm text-[#2B5748] dark:text-[#9CB080]">
          {formatCurrency(agent.totalAgentNetPayout)}
        </div>
      ),
    },
    ...(isBrokerOrLead
      ? [
          {
            id: 'actions',
            header: 'Actions',
            className: 'text-right',
            cell: (agent: AgentCommissionReport) => (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingAgent({
                    id: agent.agentId,
                    name: agent.agentName,
                    currentCap: agent.annualCap,
                    splitPercent: 80,
                    model: 'capped',
                  })
                  setAgentCapModalOpen(true)
                }}
                className="h-7 px-2 text-xs font-semibold text-[#2B5748] dark:text-[#9CB080] hover:bg-[#EDF2EB] dark:hover:bg-[#202B2F] cursor-pointer"
              >
                <MaterialIcon name="tune" size={14} className="mr-1" />
                <span>Cap</span>
              </Button>
            ),
          },
        ]
      : []),
  ]

  const renderLeaderboardCard = (agent: AgentCommissionReport) => (
    <Card
      key={agent.agentId}
      className="rounded-xl border border-[#D8E2D6] dark:border-[#618764]/50 bg-white dark:bg-[#202B2F] p-4 shadow-xs hover:border-[#618764] transition-all space-y-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#EDF2EB] dark:bg-[#202B2F] text-[#2B5748] dark:text-[#9CB080] border border-[#D8E2D6] dark:border-[#618764]/50 font-bold flex items-center justify-center text-xs shrink-0 font-mono">
            {agent.agentName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm text-[#273338] dark:text-white truncate">
              {agent.agentName}
            </div>
            <p className="text-xs text-[#75887E] dark:text-[#A0B2A6] truncate">
              {agent.agentEmail || 'Agent'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {agent.isCapped ? (
            <Badge className="bg-[#9CB080]/20 text-[#2B5748] dark:text-[#9CB080] border border-[#9CB080]/30 text-[10px] font-bold shrink-0">
              Capped
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-[10px] border-[#D8E2D6] dark:border-[#618764] text-[#75887E] dark:text-[#A0B2A6] shrink-0"
            >
              Progress
            </Badge>
          )}
          {isBrokerOrLead && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingAgent({
                  id: agent.agentId,
                  name: agent.agentName,
                  currentCap: agent.annualCap,
                  splitPercent: 80,
                  model: 'capped',
                })
                setAgentCapModalOpen(true)
              }}
              className="h-6 w-6 p-0 text-[#75887E] hover:text-[#2B5748] dark:hover:text-[#9CB080] rounded-md cursor-pointer"
              title="Configure Cap"
            >
              <MaterialIcon name="tune" size={14} />
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-1.5 bg-[#F5F7F4] dark:bg-[#273338]/60 p-3 rounded-lg border border-[#D8E2D6]/60 dark:border-[#618764]/30">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[#75887E] dark:text-[#A0B2A6] font-medium">Cap Progression</span>
          <span className="font-bold font-mono text-[#273338] dark:text-white">
            {formatCurrency(agent.capContributionYtd)} / {formatCurrency(agent.annualCap)} ({agent.capPercent}%)
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-[#EDF2EB] dark:bg-[#202B2F] border border-[#D8E2D6]/40 dark:border-[#618764]/30 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              agent.isCapped ? 'bg-[#9CB080]' : 'bg-[#618764]'
            }`}
            style={{ width: `${Math.min(100, agent.capPercent)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#D8E2D6]/60 dark:border-[#618764]/30 text-center">
        <div className="bg-[#EDF2EB]/30 dark:bg-[#202B2F]/40 p-2 rounded-lg">
          <p className="text-[10px] uppercase font-semibold text-[#75887E] dark:text-[#A0B2A6]">
            Deals
          </p>
          <p className="text-sm font-bold font-mono text-[#273338] dark:text-white">
            {agent.totalDealsClosed}
          </p>
        </div>
        <div className="bg-[#EDF2EB]/30 dark:bg-[#202B2F]/40 p-2 rounded-lg">
          <p className="text-[10px] uppercase font-semibold text-[#75887E] dark:text-[#A0B2A6]">
            GCI
          </p>
          <p className="text-sm font-bold font-mono text-[#273338] dark:text-white truncate">
            {formatCurrency(agent.totalGrossCommission)}
          </p>
        </div>
        <div className="bg-[#EDF2EB]/30 dark:bg-[#202B2F]/40 p-2 rounded-lg">
          <p className="text-[10px] uppercase font-semibold text-[#75887E] dark:text-[#A0B2A6]">
            Net
          </p>
          <p className="text-sm font-bold font-mono text-[#2B5748] dark:text-[#9CB080] truncate">
            {formatCurrency(agent.totalAgentNetPayout)}
          </p>
        </div>
      </div>
    </Card>
  )


  const ledgerColumns: TableColumn<any>[] = [
    {
      header: 'Agent',
      accessorKey: 'agentName',
      cell: (c) => <span className="font-sans font-semibold text-[#273338] dark:text-white">{c.agentName}</span>
    },
    {
      header: 'Price',
      accessorKey: 'salePrice',
      cell: (c) => <span className="text-[#75887E] dark:text-[#A0B2A6] font-sans">{formatCurrency(c.salePrice)}</span>
    },
    {
      header: 'GCI',
      accessorKey: 'grossCommission',
      cell: (c) => <span className="font-bold text-[#273338] dark:text-white">{formatCurrency(c.grossCommission)} ({c.commissionRate}%)</span>
    },
    {
      header: 'Split',
      accessorKey: 'splitPercentAgent',
      cell: (c) => (
        <span className="text-[11px] font-semibold capitalize text-[#4A5D54] dark:text-[#A0B2A6]">
          {c.splitModel} ({c.splitPercentAgent}%)
        </span>
      )
    },
    {
      header: 'Net',
      accessorKey: 'agentNetPayout',
      cell: (c) => <span className="font-bold text-[#2B5748] dark:text-[#9CB080]">{formatCurrency(c.agentNetPayout)}</span>
    },
    {
      header: 'Retained',
      accessorKey: 'brokerageNetProfit',
      cell: (c) => <span className="font-semibold text-[#618764] dark:text-[#9CB080]">{formatCurrency(c.brokerageNetProfit)}</span>
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (c) => (
        c.status === 'paid' ? (
          <Badge className="bg-[#9CB080]/20 text-[#2B5748] dark:text-[#9CB080] border border-[#9CB080]/30 text-[10px] font-bold">
            Paid
          </Badge>
        ) : c.status === 'approved' ? (
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
            Approved
          </Badge>
        ) : (
          <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[10px] font-bold">
            Pending
          </Badge>
        )
      )
    },
    {
      header: 'Action',
      accessorKey: 'id',
      className: 'text-right',
      cell: (c) => (
        <div className="flex items-center justify-end font-sans">
          {isBrokerOrLead && c.status === 'pending_approval' && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs font-bold gap-1 bg-[#9CB080]/15 hover:bg-[#9CB080] text-[#2B5748] dark:text-[#9CB080] hover:text-[#273338] border-[#9CB080]/40 transition-colors"
              disabled={isUpdatingStatus}
              onClick={() => handleStatusChange(c.id, 'approved')}
            >
              <MaterialIcon name="check" size={13} />
              <span>Approve</span>
            </Button>
          )}
          {isBrokerOrLead && c.status === 'approved' && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs font-bold gap-1 bg-emerald-500/15 hover:bg-emerald-600 text-emerald-700 dark:text-emerald-300 hover:text-white border-emerald-500/30 transition-colors"
              disabled={isUpdatingStatus}
              onClick={() => handleStatusChange(c.id, 'paid')}
            >
              <MaterialIcon name="paid" size={13} />
              <span>Pay</span>
            </Button>
          )}
        </div>
      )
    }
  ]

  const renderLedgerCard = (c: any) => (
    <Card key={c.id} className="p-4 sm:p-5 flex flex-col gap-4 border border-[#D8E2D6]/60 dark:border-[#618764]/30 shadow-none bg-white dark:bg-[#273338]">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="font-bold text-[#273338] dark:text-white">{c.agentName}</span>
          <span className="text-xs text-[#75887E] dark:text-[#A0B2A6]">{formatCurrency(c.salePrice)} Sale</span>
        </div>
        {c.status === 'paid' ? (
          <Badge className="bg-[#9CB080]/20 text-[#2B5748] dark:text-[#9CB080] border border-[#9CB080]/30 text-[10px] font-bold">Paid</Badge>
        ) : c.status === 'approved' ? (
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">Approved</Badge>
        ) : (
          <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[10px] font-bold">Pending</Badge>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-[#EDF2EB]/30 dark:bg-[#202B2F]/40 p-2 rounded-lg flex flex-col items-center">
          <span className="text-[10px] uppercase font-semibold text-[#75887E] dark:text-[#A0B2A6]">Net</span>
          <span className="font-bold font-mono text-[#2B5748] dark:text-[#9CB080]">{formatCurrency(c.agentNetPayout)}</span>
        </div>
        <div className="bg-[#EDF2EB]/30 dark:bg-[#202B2F]/40 p-2 rounded-lg flex flex-col items-center">
          <span className="text-[10px] uppercase font-semibold text-[#75887E] dark:text-[#A0B2A6]">Retained</span>
          <span className="font-bold font-mono text-[#618764] dark:text-[#9CB080]">{formatCurrency(c.brokerageNetProfit)}</span>
        </div>
      </div>
      {isBrokerOrLead && (c.status === 'pending_approval' || c.status === 'approved') && (
        <div className="pt-2 border-t border-[#D8E2D6]/60 dark:border-[#618764]/30 flex justify-end">
          {c.status === 'pending_approval' ? (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs font-bold gap-1 bg-[#9CB080]/15 hover:bg-[#9CB080] text-[#2B5748] dark:text-[#9CB080]"
              disabled={isUpdatingStatus}
              onClick={() => handleStatusChange(c.id, 'approved')}
            >
              <MaterialIcon name="check" size={13} />
              Approve
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs font-bold gap-1 bg-emerald-500/15 hover:bg-emerald-600 text-emerald-700 dark:text-emerald-300"
              disabled={isUpdatingStatus}
              onClick={() => handleStatusChange(c.id, 'paid')}
            >
              <MaterialIcon name="paid" size={13} />
              Pay
            </Button>
          )}
        </div>
      )}
    </Card>
  )

  return (
    <div className="-m-4 sm:-m-6 min-h-[calc(100vh-4rem)] p-4 sm:p-6 pb-20 md:pb-8 bg-[#F5F7F4] dark:bg-[#273338] space-y-6 transition-colors duration-200">
      {/* ═══════ Top Header: Clean, Simple One-Word Title ═══════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D8E2D6] dark:border-[#618764]/40">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#273338] dark:text-white">
            Commissions
          </h1>
          <p className="text-xs text-[#4A5D54] dark:text-[#A0B2A6] mt-0.5">
            Automated split accounting, cap progression, royalties, and settlement disbursements.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {isBrokerOrLead && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBrokerCapModalOpen(true)}
              className="gap-1.5 text-xs font-semibold border-[#D8E2D6] dark:border-[#618764] bg-white dark:bg-[#202B2F] text-[#273338] dark:text-white hover:bg-[#EDF2EB] shadow-xs cursor-pointer"
            >
              <MaterialIcon name="tune" size={16} />
              <span>Cap Rules</span>
            </Button>
          )}
          <Button
            onClick={() => {
              setCalcOpen(true)
              handleRunCalculation()
            }}
            className="gap-1.5 text-xs font-bold bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] shadow-xs transition-all duration-200 cursor-pointer"
          >
            <MaterialIcon name="calculate" size={16} />
            <span>Calculate</span>
          </Button>
        </div>
      </div>

      {/* ═══════ Global KPI Cards with Single-Word Precise Titles ═══════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 gap-y-6 pt-3">
        <KpiCard
          title="GCI"
          value={formatCurrency(animatedGci)}
          icon="payments"
          trend={{ value: 14.8, isPositive: true }}
          subtitle="gross revenue"
        />
        <KpiCard
          title="Payouts"
          value={formatCurrency(animatedPayouts)}
          icon="account_balance_wallet"
          trend={{ value: 11.2, isPositive: true }}
          subtitle="agent net"
        />
        <KpiCard
          title="Retained"
          value={formatCurrency(animatedRetained)}
          icon="savings"
          trend={{ value: 18.5, isPositive: true }}
          subtitle="brokerage net"
        />
        <KpiCard
          title="Pending"
          value={`${animatedPending}`}
          icon="schedule"
          trend={{ value: 0, isPositive: true }}
          subtitle="under review"
        />
      </div>

      {/* ═══════ Main Tabs: Single-Word Labels ═══════ */}
      <Tabs defaultValue="leaderboard" className="space-y-5">
        <TabsList className="grid grid-cols-2 max-w-xs bg-[#EDF2EB] dark:bg-[#202B2F] p-1 rounded-xl border border-[#D8E2D6] dark:border-[#618764]/40">
          <TabsTrigger
            value="leaderboard"
            className="text-xs font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-[#2B5748] data-[state=active]:text-[#273338] dark:data-[state=active]:text-white data-[state=active]:shadow-xs rounded-lg transition-all"
          >
            Leaderboard
          </TabsTrigger>
          <TabsTrigger
            value="ledger"
            className="text-xs font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-[#2B5748] data-[state=active]:text-[#273338] dark:data-[state=active]:text-white data-[state=active]:shadow-xs rounded-lg transition-all"
          >
            Ledger
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab 1: Leaderboard ─── */}
        <TabsContent value="leaderboard" className="focus-visible:outline-none">
          <Card className="rounded-xl border border-[#D8E2D6] dark:border-[#618764] bg-white dark:bg-[#2B5748] shadow-xs overflow-hidden">
            <CardHeader className="p-4 sm:p-5 pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/40 bg-[#EDF2EB]/40 dark:bg-[#202B2F]/40 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-[#273338] dark:text-white flex items-center gap-2">
                <MaterialIcon name="leaderboard" size={18} className="text-[#618764] dark:text-[#9CB080]" />
                <span>Leaderboard</span>
              </CardTitle>
              <TableGridToggleButton
                view={leaderboardView}
                onViewChange={setLeaderboardView}
                storageKey="crm_commissions_leaderboard_view"
              />
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <TableGridToggle<AgentCommissionReport>
                data={report?.agentReports || []}
                keyExtractor={(agent) => agent.agentId}
                columns={leaderboardColumns}
                renderCard={renderLeaderboardCard}
                view={leaderboardView}
                onViewChange={setLeaderboardView}
                storageKey="crm_commissions_leaderboard_view"
                hideToggle={true}
                isLoading={reportLoading}
                emptyTitle="No settlements recorded."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab 2: Ledger ─── */}
        <TabsContent value="ledger" className="focus-visible:outline-none">
          <Card className="rounded-xl border border-[#D8E2D6] dark:border-[#618764] bg-white dark:bg-[#2B5748] shadow-xs overflow-hidden">
            <CardHeader className="p-4 sm:p-5 pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/40 bg-[#EDF2EB]/40 dark:bg-[#202B2F]/40 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-[#273338] dark:text-white flex items-center gap-2">
                <MaterialIcon name="table_chart" size={18} className="text-[#618764] dark:text-[#9CB080]" />
                <span>Ledger</span>
              </CardTitle>
              <TableGridToggleButton
                view={ledgerView}
                onViewChange={setLedgerView}
                storageKey="crm_commissions_ledger_view"
              />
            </CardHeader>
            <CardContent className="p-0">
              {commissionsLoading ? (
                <div className="py-12 text-center text-xs text-[#75887E] dark:text-[#A0B2A6]">
                  Loading...
                </div>
              ) : !commissionsData?.commissions || commissionsData.commissions.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#75887E] dark:text-[#A0B2A6]">
                  No settlements recorded.
                </div>
              ) : (
                <TableGridToggle<any>
                  data={commissionsData.commissions}
                  keyExtractor={(c) => c.id}
                  columns={ledgerColumns}
                  renderCard={renderLedgerCard}
                  view={ledgerView}
                  onViewChange={setLedgerView}
                  storageKey="crm_commissions_ledger_view"
                  hideToggle={true}
                  emptyTitle="No settlements recorded."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══════ Commission Calculator Modal with Theme Colors & Precise Naming ═══════ */}
      <Dialog open={calcOpen} onOpenChange={setCalcOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 border border-[#D8E2D6] dark:border-[#618764] bg-white dark:bg-[#2B5748] shadow-2xl rounded-2xl">
          <DialogHeader className="p-5 pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/40 bg-[#EDF2EB]/50 dark:bg-[#202B2F]/50">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#9CB080]/20 text-[#2B5748] dark:text-[#9CB080] border border-[#9CB080]/30 shadow-xs">
                <MaterialIcon name="calculate" size={20} />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-[#273338] dark:text-white">
                  Calculator
                </DialogTitle>
                <p className="text-xs text-[#4A5D54] dark:text-[#A0B2A6] mt-0.5">
                  Calculate gross GCI, deductions, cap adjustments, and net agent payouts.
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="p-5 space-y-4 text-xs">
            {/* Assigned Agent Selector */}
            {isBrokerOrLead && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#273338] dark:text-[#E2ECE4]">Assigned Agent</Label>
                <select
                  value={selectedAgentId}
                  onChange={(e) => handleAgentSelect(e.target.value)}
                  className="w-full h-9 rounded-lg border border-[#D8E2D6] dark:border-[#618764] bg-[#F5F7F4] dark:bg-[#202B2F] px-3 text-xs font-semibold text-[#273338] dark:text-white focus:ring-1 focus:ring-[#9CB080]"
                >
                  <option value="">Select Agent...</option>
                  {eligibleAgents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.firstName} {a.lastName} ({a.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-bold text-[#273338] dark:text-[#E2ECE4]">
                  Price (PKR)
                </Label>
                <Input
                  type="number"
                  value={salePrice}
                  onChange={(e) => setSalePrice(Number(e.target.value) || 0)}
                  className="h-9 text-xs font-mono font-bold bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white focus:ring-1 focus:ring-[#9CB080]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#273338] dark:text-[#E2ECE4]">Annual Cap (PKR)</Label>
                <Input
                  type="number"
                  value={capThreshold}
                  onChange={(e) => setCapThreshold(Number(e.target.value) || 0)}
                  className="h-9 text-xs font-mono font-bold bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white focus:ring-1 focus:ring-[#9CB080]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#273338] dark:text-[#E2ECE4]">Rate (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={commissionPercent}
                  onChange={(e) => setCommissionPercent(Number(e.target.value) || 0)}
                  className="h-9 text-xs font-mono bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white focus:ring-1 focus:ring-[#9CB080]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#273338] dark:text-[#E2ECE4]">Model</Label>
                <select
                  value={splitModel}
                  onChange={(e) => setSplitModel(e.target.value as any)}
                  className="w-full h-9 rounded-lg border border-[#D8E2D6] dark:border-[#618764] bg-[#F5F7F4] dark:bg-[#202B2F] px-3 text-xs font-semibold text-[#273338] dark:text-white focus:ring-1 focus:ring-[#9CB080]"
                >
                  <option value="capped">Annual Cap</option>
                  <option value="tiered">Tiered</option>
                  <option value="fixed">Fixed</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#273338] dark:text-[#E2ECE4]">Split (%)</Label>
                <Input
                  type="number"
                  value={agentSplitPercent}
                  onChange={(e) => setAgentSplitPercent(Number(e.target.value) || 0)}
                  className="h-9 text-xs font-mono bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white focus:ring-1 focus:ring-[#9CB080]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#273338] dark:text-[#E2ECE4]">
                  Franchise (%)
                </Label>
                <Input
                  type="number"
                  step="0.5"
                  value={franchiseFeePercent}
                  onChange={(e) => setFranchiseFeePercent(Number(e.target.value) || 0)}
                  className="h-9 text-xs font-mono bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white focus:ring-1 focus:ring-[#9CB080]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#273338] dark:text-[#E2ECE4]">
                  TC Fee (PKR)
                </Label>
                <Input
                  type="number"
                  value={tcFee}
                  onChange={(e) => setTcFee(Number(e.target.value) || 0)}
                  className="h-9 text-xs font-mono bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white focus:ring-1 focus:ring-[#9CB080]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#273338] dark:text-[#E2ECE4]">
                  E&O (PKR)
                </Label>
                <Input
                  type="number"
                  value={eoInsuranceFee}
                  onChange={(e) => setEoInsuranceFee(Number(e.target.value) || 0)}
                  className="h-9 text-xs font-mono bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white focus:ring-1 focus:ring-[#9CB080]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#273338] dark:text-[#E2ECE4]">
                  Desk Fee (PKR)
                </Label>
                <Input
                  type="number"
                  value={deskFee}
                  onChange={(e) => setDeskFee(Number(e.target.value) || 0)}
                  className="h-9 text-xs font-mono bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white focus:ring-1 focus:ring-[#9CB080]"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={handleRunCalculation}
                disabled={isCalculating}
                className="text-xs font-bold border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white bg-white dark:bg-[#202B2F] hover:bg-[#EDF2EB]"
              >
                Calculate
              </Button>
            </div>

            {/* Computed Results Card with Theme Colors */}
            {calcPreview && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[#EDF2EB]/50 dark:bg-[#202B2F]/50 border border-[#D8E2D6] dark:border-[#618764]/40">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#4A5D54] dark:text-[#A0B2A6]">
                    Agent Net
                  </span>
                  <p className="text-2xl font-bold text-[#273338] dark:text-white font-mono tabular-nums">
                    {formatCurrency(calcPreview.agentNetPayout)}
                  </p>
                  <div className="text-[11px] text-[#75887E] dark:text-[#A0B2A6] space-y-0.5 pt-1">
                    <p>Gross: {formatCurrency(calcPreview.grossCommission)}</p>
                    <p>
                      Split: {calcPreview.effectiveAgentSplit}% / {calcPreview.effectiveBrokerageSplit}%
                    </p>
                    <p>Deductions: -{formatCurrency(calcPreview.totalPostSplitDeductions)}</p>
                  </div>
                </div>

                <div className="space-y-1 sm:border-l sm:border-[#D8E2D6]/60 sm:dark:border-[#618764]/40 sm:pl-4">
                  <span className="text-[10px] uppercase font-bold text-[#4A5D54] dark:text-[#A0B2A6]">
                    Broker Net
                  </span>
                  <p className="text-2xl font-bold text-[#2B5748] dark:text-[#9CB080] font-mono tabular-nums">
                    {formatCurrency(calcPreview.brokerageNetProfit)}
                  </p>
                  <div className="text-[11px] text-[#75887E] dark:text-[#A0B2A6] space-y-0.5 pt-1">
                    <p>Franchise: {formatCurrency(calcPreview.franchiseDeduction)}</p>
                    <p>
                      Cap Progress: {formatCurrency(calcPreview.newYtdContribution)} /{' '}
                      {formatCurrency(calcPreview.capThreshold)}
                    </p>
                    {calcPreview.isCapped && (
                      <p className="text-[#2B5748] dark:text-[#9CB080] font-bold">100% Capped</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#D8E2D6] dark:border-[#618764]/40">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCalcOpen(false)}
                className="border-[#D8E2D6] dark:border-[#618764] bg-white dark:bg-[#202B2F] text-[#273338] dark:text-white hover:bg-[#EDF2EB]"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveSettlement}
                disabled={isCreatingCommission}
                className="font-bold text-xs gap-1.5 bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] shadow-xs"
              >
                <MaterialIcon name="check" size={15} />
                <span>Save</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════ Brokerage Cap Configuration Modal ═══════ */}
      <Dialog open={brokerCapModalOpen} onOpenChange={setBrokerCapModalOpen}>
        <DialogContent className="sm:max-w-md border border-[#D8E2D6] dark:border-[#618764] bg-white dark:bg-[#202B2F] rounded-2xl shadow-xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#9CB080]/20 text-[#2B5748] dark:text-[#9CB080] border border-[#9CB080]/30">
                <MaterialIcon name="corporate_fare" size={20} />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-[#273338] dark:text-white">
                  Brokerage Commission Cap Rules
                </DialogTitle>
                <p className="text-xs text-[#4A5D54] dark:text-[#A0B2A6]">
                  Configure organization-wide default annual cap thresholds for all agents.
                </p>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 pt-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[#273338] dark:text-[#E2ECE4]">
                Default Annual Cap (PKR)
              </Label>
              <Input
                type="number"
                value={defaultBrokerCap}
                onChange={(e) => setDefaultBrokerCap(Number(e.target.value) || 0)}
                className="h-9 font-mono font-bold bg-[#F5F7F4] dark:bg-[#273338] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white"
              />
              <p className="text-[11px] text-[#75887E] dark:text-[#A0B2A6]">
                Once an agent contributes this amount to the brokerage in an anniversary year, they reach 100% split.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[#273338] dark:text-[#E2ECE4]">
                Default Agent Split (%)
              </Label>
              <Input
                type="number"
                value={defaultBrokerSplit}
                onChange={(e) => setDefaultBrokerSplit(Number(e.target.value) || 0)}
                className="h-9 font-mono bg-[#F5F7F4] dark:bg-[#273338] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D8E2D6] dark:border-[#618764]/40">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBrokerCapModalOpen(false)}
                className="border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isUpdatingBrokerCap}
                onClick={async () => {
                  try {
                    await updateBrokerageCap({
                      defaultCommissionCap: defaultBrokerCap,
                      defaultCommissionSplitAgent: defaultBrokerSplit,
                    }).unwrap()
                    toast.success('Brokerage cap settings updated successfully!')
                    setBrokerCapModalOpen(false)
                  } catch (err: any) {
                    toast.error(err?.data?.message || 'Failed to update cap settings')
                  }
                }}
                className="bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] font-bold cursor-pointer"
              >
                {isUpdatingBrokerCap ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════ Agent Quick-Edit Cap Modal ═══════ */}
      <Dialog open={agentCapModalOpen} onOpenChange={setAgentCapModalOpen}>
        <DialogContent className="sm:max-w-md border border-[#D8E2D6] dark:border-[#618764] bg-white dark:bg-[#202B2F] rounded-2xl shadow-xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#9CB080]/20 text-[#2B5748] dark:text-[#9CB080] border border-[#9CB080]/30">
                <MaterialIcon name="person" size={20} />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-[#273338] dark:text-white">
                  Agent Cap Override
                </DialogTitle>
                <p className="text-xs text-[#4A5D54] dark:text-[#A0B2A6]">
                  Configure custom annual cap threshold for {editingAgent?.name}.
                </p>
              </div>
            </div>
          </DialogHeader>
          {editingAgent && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#273338] dark:text-[#E2ECE4]">
                  Annual Cap Amount (PKR)
                </Label>
                <Input
                  type="number"
                  value={editingAgent.currentCap}
                  onChange={(e) =>
                    setEditingAgent({
                      ...editingAgent,
                      currentCap: Number(e.target.value) || 0,
                    })
                  }
                  className="h-9 font-mono font-bold bg-[#F5F7F4] dark:bg-[#273338] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#273338] dark:text-[#E2ECE4]">
                  Default Split (%)
                </Label>
                <Input
                  type="number"
                  value={editingAgent.splitPercent}
                  onChange={(e) =>
                    setEditingAgent({
                      ...editingAgent,
                      splitPercent: Number(e.target.value) || 0,
                    })
                  }
                  className="h-9 font-mono bg-[#F5F7F4] dark:bg-[#273338] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#D8E2D6] dark:border-[#618764]/40">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    try {
                      await updateAgentCap({
                        agentId: editingAgent.id,
                        data: { commissionCap: null },
                      }).unwrap()
                      toast.success(`Reset ${editingAgent.name}'s cap to brokerage default!`)
                      setAgentCapModalOpen(false)
                    } catch (err: any) {
                      toast.error(err?.data?.message || 'Failed to reset cap')
                    }
                  }}
                  className="text-xs text-[#75887E] dark:text-[#A0B2A6] hover:text-red-500 cursor-pointer"
                >
                  Reset to Default
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAgentCapModalOpen(false)}
                    className="border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    disabled={isUpdatingAgentCap}
                    onClick={async () => {
                      try {
                        await updateAgentCap({
                          agentId: editingAgent.id,
                          data: {
                            commissionCap: editingAgent.currentCap,
                            commissionSplitPercent: editingAgent.splitPercent,
                            commissionModel: editingAgent.model,
                          },
                        }).unwrap()
                        toast.success(`Updated commission cap for ${editingAgent.name}!`)
                        setAgentCapModalOpen(false)
                      } catch (err: any) {
                        toast.error(err?.data?.message || 'Failed to update agent cap')
                      }
                    }}
                    className="bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] font-bold cursor-pointer"
                  >
                    {isUpdatingAgentCap ? 'Saving...' : 'Save Cap'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
