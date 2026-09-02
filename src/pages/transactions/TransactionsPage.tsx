import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BuildingOffice2Icon,
  PlusIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  DocumentCheckIcon,
  ClockIcon,
  ArrowRightIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useGetTransactionsQuery } from '@/store/api/transactionsApi'

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

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val)

  const getDaysRemaining = (closingDateStr: string) => {
    const diffTime = new Date(closingDateStr).getTime() - new Date().getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transaction Engine & Escrow Hub"
        description="Live milestone tracking, escrow checklists, and document repository for active purchase and sale closings."
        actions={
          <Button
            onClick={() => navigate('/pipeline')}
            className="gap-1.5 bg-primary font-semibold shadow-xs"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Open Escrow from Pipeline</span>
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total In-Escrow Volume
            </CardTitle>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <CurrencyDollarIcon className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">
              {formatCurrency(metrics.totalVolume)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active escrow contract pipeline
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Active Under Contract
            </CardTitle>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
              <BuildingOffice2Icon className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">{metrics.activeCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Pending inspection, appraisal, & title
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Closed Closings
            </CardTitle>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <CheckCircleSolid className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">{metrics.closedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Recorded and disbursed
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Escrow Compliance
            </CardTitle>
            <div className="p-2 rounded-xl bg-chart-3/10 text-chart-3">
              <ShieldCheckIcon className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">100%</div>
            <p className="text-xs text-muted-foreground mt-1">
              All documents & disclosures tracked
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search address, client name, or escrow company..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[150px]">
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
              setTypeFilter(val)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[140px]">
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

      {/* Transactions Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <Card className="border-dashed p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground mb-4">
            <DocumentCheckIcon className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-foreground">No active escrow transactions</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-5">
            Convert a deal from the Pipeline into an Escrow Transaction to start tracking closing
            milestones and disclosures.
          </p>
          <Button onClick={() => navigate('/pipeline')} className="gap-2 text-xs font-semibold">
            <PlusIcon className="w-4 h-4" /> Go to Deals Pipeline
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {transactions.map((tx) => {
            const daysRemaining = getDaysRemaining(tx.closingDate)
            const completedCount = tx.milestones.filter(
              (m) => m.status === 'completed' || m.status === 'skipped'
            ).length

            return (
              <Card
                key={tx.id}
                className="group hover:border-primary/50 transition-all shadow-xs flex flex-col justify-between overflow-hidden cursor-pointer"
                onClick={() => navigate(`/transactions/${tx.id}`)}
              >
                <div>
                  <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold uppercase tracking-wider mb-1.5"
                        >
                          {tx.type} Representation
                        </Badge>
                        <CardTitle className="text-base font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                          {tx.propertyAddress}
                        </CardTitle>
                      </div>

                      <Badge
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          tx.status === 'closed'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : tx.status === 'under_contract'
                              ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                              : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {tx.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4 space-y-4">
                    {/* Financial Summary */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-muted/30 text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Purchase Price</span>
                        <span className="font-bold text-foreground">
                          {formatCurrency(tx.purchasePrice)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Earnest Money</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(tx.earnestMoney)}
                        </span>
                      </div>
                    </div>

                    {/* Milestone Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground flex items-center gap-1">
                          <DocumentCheckIcon className="w-3.5 h-3.5 text-primary" />
                          <span>Closing Milestones</span>
                        </span>
                        <span className="font-bold text-primary">
                          {tx.progressPercent}% ({completedCount}/{tx.milestones.length})
                        </span>
                      </div>
                      <Progress value={tx.progressPercent} className="h-2" />
                    </div>

                    {/* Client & Escrow Meta */}
                    <div className="space-y-2 text-xs border-t border-border/50 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <UserIcon className="w-3.5 h-3.5 text-primary/70" />
                          Client:
                        </span>
                        <span className="font-semibold text-foreground truncate max-w-[150px]">
                          {tx.contactName}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <CalendarDaysIcon className="w-3.5 h-3.5 text-primary/70" />
                          Closing Date:
                        </span>
                        <div className="flex items-center gap-1.5 font-semibold">
                          <span>{new Date(tx.closingDate).toLocaleDateString()}</span>
                          {tx.status !== 'closed' && (
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                                daysRemaining <= 7
                                  ? 'bg-rose-500/10 text-rose-600'
                                  : daysRemaining <= 14
                                    ? 'bg-amber-500/10 text-amber-600'
                                    : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {daysRemaining > 0 ? `${daysRemaining}d left` : 'Due today'}
                            </span>
                          )}
                        </div>
                      </div>

                      {tx.escrowCompany && (
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Escrow:</span>
                          <span className="truncate max-w-[150px] font-mono">{tx.escrowCompany}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </div>

                <div className="p-4 pt-0">
                  <Button
                    variant="outline"
                    className="w-full text-xs font-semibold gap-1.5 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all"
                  >
                    <span>Open Master Transaction Hub</span>
                    <ArrowRightIcon className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
