import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { StatCard } from '@/components/shared/StatCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useGetTransactionsQuery } from '@/store/api/transactionsApi'
import { useCountUp } from '@/hooks/useCountUp'
import type { Transaction } from '@/types/transaction'

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val)

const getDaysRemaining = (closingDateStr: string) => {
  const diffTime = new Date(closingDateStr).getTime() - new Date().getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/* ──────────────────── Individual Transaction Card with Animations ──────────────────── */
interface TransactionCardProps {
  transaction: Transaction
  onOpen: (id: string) => void
}

function TransactionCardItem({ transaction: tx, onOpen }: TransactionCardProps) {
  const daysRemaining = getDaysRemaining(tx.closingDate)
  const completedCount = tx.milestones.filter(
    (m) => m.status === 'completed' || m.status === 'skipped'
  ).length

  // Animated numbers: high speed at start, easing out to final values
  const animatedPurchasePrice = useCountUp({ end: tx.purchasePrice, duration: 1400 })
  const animatedEarnestMoney = useCountUp({ end: tx.earnestMoney, duration: 1300 })
  const animatedProgressPercent = useCountUp({ end: tx.progressPercent, duration: 1500 })
  const animatedCompletedCount = useCountUp({ end: completedCount, duration: 1000 })

  return (
    <Card
      className="group rounded-xl border border-[#D8E2D6] dark:border-[#618764] bg-white dark:bg-[#254238] shadow-md shadow-black/10 hover:border-[#9CB080] dark:hover:border-[#9CB080] transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer"
      onClick={() => onOpen(tx.id)}
    >
      <div>
        {/* Card Header */}
        <CardHeader className="pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/40 bg-[#EDF2EB]/40 dark:bg-[#1A2E26]/40">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Badge
                variant="outline"
                className="text-[10px] font-bold uppercase tracking-wider mb-1.5 border-[#D8E2D6] dark:border-[#618764] text-[#4A5D54] dark:text-[#A0B2A6]"
              >
                {tx.type} Representation
              </Badge>
              <CardTitle className="text-base font-bold text-[#273338] dark:text-white line-clamp-1 group-hover:text-[#2B5748] dark:group-hover:text-[#9CB080] transition-colors">
                {tx.propertyAddress}
              </CardTitle>
            </div>

            <Badge
              className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ${tx.status === 'closed'
                ? 'bg-[#9CB080]/20 text-[#2B5748] dark:text-[#9CB080] border-[#9CB080]/30'
                : tx.status === 'under_contract'
                  ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                  : tx.status === 'pending'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    : 'bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#75887E] dark:text-[#A0B2A6]'
                }`}
            >
              {tx.status.replace('_', ' ')}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* Financial Summary */}
          <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-[#EDF2EB] dark:bg-[#1A2E26] border border-[#D8E2D6]/60 dark:border-[#618764]/30 text-xs">
            <div>
              <span className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] block uppercase tracking-wider font-semibold">
                Purchase Price
              </span>
              <span className="font-bold text-[#273338] dark:text-white font-mono tabular-nums">
                {formatCurrency(animatedPurchasePrice)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] block uppercase tracking-wider font-semibold">
                Earnest Money
              </span>
              <span className="font-semibold text-[#2B5748] dark:text-[#9CB080] font-mono tabular-nums">
                {formatCurrency(animatedEarnestMoney)}
              </span>
            </div>
          </div>

          {/* Milestone Progress Bar with Incrementing Number & Dynamic Width */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#273338] dark:text-white flex items-center gap-1.5">
                <MaterialIcon name="checklist" size={14} className="text-[#618764] dark:text-[#9CB080]" />
                <span>Closing Milestones</span>
              </span>
              <span className="font-bold text-[#2B5748] dark:text-[#9CB080] font-mono tabular-nums">
                {animatedProgressPercent}% ({animatedCompletedCount}/{tx.milestones.length})
              </span>
            </div>

            {/* Animated Progress Bar Track & Indicator */}
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-[#EDF2EB] dark:bg-[#1A2E26] border border-[#D8E2D6]/40 dark:border-[#618764]/30">
              <div
                className="h-full rounded-full bg-[#9CB080] shadow-xs will-change-[width]"
                style={{
                  width: `${Math.min(100, Math.max(0, animatedProgressPercent))}%`,
                }}
              />
            </div>
          </div>

          {/* Client & Escrow Meta */}
          <div className="space-y-2 text-xs border-t border-[#D8E2D6] dark:border-[#618764]/40 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-[#75887E] dark:text-[#A0B2A6] flex items-center gap-1.5">
                <MaterialIcon name="person" size={14} className="text-[#618764] dark:text-[#9CB080]/70" />
                Client:
              </span>
              <span className="font-semibold text-[#273338] dark:text-white truncate max-w-[150px]">
                {tx.contactName}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#75887E] dark:text-[#A0B2A6] flex items-center gap-1.5">
                <MaterialIcon name="event" size={14} className="text-[#618764] dark:text-[#9CB080]/70" />
                Closing Date:
              </span>
              <div className="flex items-center gap-1.5 font-semibold">
                <span className="text-[#273338] dark:text-white">
                  {new Date(tx.closingDate).toLocaleDateString()}
                </span>
                {tx.status !== 'closed' && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${daysRemaining <= 7
                      ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                      : daysRemaining <= 14
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#75887E] dark:text-[#A0B2A6]'
                      }`}
                  >
                    {daysRemaining > 0 ? `${daysRemaining}d left` : 'Due today'}
                  </span>
                )}
              </div>
            </div>

            {tx.escrowCompany && (
              <div className="flex items-center justify-between text-[11px] text-[#75887E] dark:text-[#A0B2A6]">
                <span className="flex items-center gap-1.5">
                  <MaterialIcon name="assured_workload" size={14} className="text-[#618764] dark:text-[#9CB080]/70" />
                  Escrow:
                </span>
                <span className="truncate max-w-[150px] font-mono">
                  {tx.escrowCompany}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </div>

      {/* Card Footer Button */}
      <div className="p-4 pt-0">
        <Button
          variant="outline"
          className="w-full text-xs font-semibold gap-1.5 border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white bg-transparent hover:bg-[#9CB080] hover:text-[#273338] hover:border-[#9CB080] group-hover:bg-[#9CB080] group-hover:text-[#273338] group-hover:border-[#9CB080] transition-all duration-200"
        >
          <span>Open Transaction Hub</span>
          <MaterialIcon name="arrow_forward" size={14} />
        </Button>
      </div>
    </Card>
  )
}

/* ──────────────────── Main Transactions Page ──────────────────── */
export function TransactionsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useGetTransactionsQuery({
    search,
    status: statusFilter,
    type: typeFilter,
    page,
    limit: 20,
  })

  const transactions = data?.transactions || []
  const metrics = data?.metrics || { totalVolume: 0, activeCount: 0, closedCount: 0 }

  // Animated KPI metrics (Ease-out Quartic curve for high initial speed and gradual slowdown)
  const animatedVolume = useCountUp({ end: metrics.totalVolume, duration: 1600 })
  const animatedActiveCount = useCountUp({ end: metrics.activeCount, duration: 1200 })
  const animatedClosedCount = useCountUp({ end: metrics.closedCount, duration: 1200 })
  const animatedCompliance = useCountUp({ end: 100, duration: 1400 })

  /* ──────────────────── Loading Skeleton ──────────────────── */
  if (isLoading) {
    return (
      <div className="-m-4 sm:-m-6 min-h-[calc(100vh-4rem)] p-4 sm:p-6 pb-20 md:pb-8 bg-[#F5F7F4] dark:bg-[#1E282D] space-y-6 transition-colors duration-200">
        <Skeleton className="h-10 w-72 rounded-xl bg-[#EDF2EB] dark:bg-[#1A2E26]" />
        {/* KPI Skeletons at top */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 gap-y-6 pt-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl bg-[#EDF2EB] dark:bg-[#1A2E26]" />
          ))}
        </div>
        {/* Search & Grid Skeletons */}
        <div className="space-y-4">
          <Skeleton className="h-10 w-full rounded-xl bg-[#EDF2EB] dark:bg-[#1A2E26]" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl bg-[#EDF2EB] dark:bg-[#1A2E26]" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="-m-4 sm:-m-6 min-h-[calc(100vh-4rem)] p-4 sm:p-6 pb-20 md:pb-8 bg-[#F5F7F4] dark:bg-[#1E282D] space-y-6 transition-colors duration-200">

      {/* ═══════ Page Header ═══════ */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#273338] dark:text-white">
            Transactions & Escrow Hub
          </h1>
          <p className="mt-1 text-sm text-[#4A5D54] dark:text-[#A0B2A6]">
            Live milestone tracking, escrow checklists, and document repository for active purchase and sale closings.
          </p>
        </div>
        <div className="flex items-center gap-2 mt-3 sm:mt-0">
          <Button
            onClick={() => navigate('/pipeline')}
            className="gap-1.5 bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] font-bold shadow-xs transition-all duration-200 cursor-pointer"
          >
            <MaterialIcon name="add" size={16} />
            <span>Open Escrow from Pipeline</span>
          </Button>
        </div>
      </div>

      {/* ═══════ KPI Cards — Positioned at TOP for All Screen Sizes ═══════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 gap-y-6 pt-3">
        <StatCard
          title="Total Volume"
          value={formatCurrency(animatedVolume)}
          icon={<MaterialIcon name="attach_money" size={20} />}
          trend={{ value: 12.4, isPositive: true }}
          subtitle="active escrow pipeline"
        />
        <StatCard
          title="Under Contract"
          value={`${animatedActiveCount}`}
          icon={<MaterialIcon name="apartment" size={20} />}
          trend={{ value: 15.0, isPositive: true }}
          subtitle="pending inspection & title"
        />
        <StatCard
          title="Closed "
          value={`${animatedClosedCount}`}
          icon={<MaterialIcon name="task_alt" size={20} />}
          trend={{ value: 8.2, isPositive: true }}
          subtitle="recorded & disbursed"
        />
        <StatCard
          title="Escrow Compliance"
          value={`${animatedCompliance}%`}
          icon={<MaterialIcon name="verified_user" size={20} />}
          trend={{ value: 0, isPositive: true }}
          subtitle="docs & disclosures tracked"
        />
      </div>

      {/* ═══════ Filter Bar ═══════ */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <MaterialIcon
            name="search"
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#75887E] dark:text-[#A0B2A6]"
          />
          <Input
            placeholder="Search address, client name, or escrow company..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-9 bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white placeholder-[#75887E] dark:placeholder-[#A0B2A6] focus:outline-none focus:border-[#9CB080] focus:ring-1 focus:ring-[#9CB080] transition-all duration-200"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              if (val) {
                setStatusFilter(val)
                setPage(1)
              }
            }}
          >
            <SelectTrigger className="w-37.5 border-[#D8E2D6] dark:border-[#618764] bg-white dark:bg-[#254238] text-[#273338] dark:text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="under_contract">Under Contract</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={typeFilter}
            onValueChange={(val) => {
              if (val) {
                setTypeFilter(val)
                setPage(1)
              }
            }}
          >
            <SelectTrigger className="w-[140px] border-[#D8E2D6] dark:border-[#618764] bg-white dark:bg-[#254238] text-[#273338] dark:text-white">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="buyer">Buyer Representation</SelectItem>
              <SelectItem value="seller">Seller Representation</SelectItem>
              <SelectItem value="dual">Dual Agency</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ═══════ Full-Width Transactions Grid ═══════ */}
      {transactions.length === 0 ? (
        <Card className="rounded-xl border border-dashed border-[#D8E2D6] dark:border-[#618764] bg-white dark:bg-[#254238] p-12 text-center shadow-md shadow-black/10 transition-colors duration-200">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#75887E] dark:text-[#A0B2A6] mb-4">
            <MaterialIcon name="description" size={28} />
          </div>
          <h3 className="text-base font-bold text-[#273338] dark:text-white">
            No active escrow transactions
          </h3>
          <p className="text-xs text-[#75887E] dark:text-[#A0B2A6] max-w-sm mx-auto mt-1 mb-5">
            Convert a deal from the Pipeline into an Escrow Transaction to start tracking closing
            milestones and disclosures.
          </p>
          <Button
            onClick={() => navigate('/pipeline')}
            className="gap-2 text-xs font-bold bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] transition-all duration-200 cursor-pointer"
          >
            <MaterialIcon name="add" size={16} />
            Go to Deals Pipeline
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {transactions.map((tx) => (
            <TransactionCardItem
              key={tx.id}
              transaction={tx}
              onOpen={(id) => navigate(`/transactions/${id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
