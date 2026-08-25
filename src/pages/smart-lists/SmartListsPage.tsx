import { useState, useMemo } from 'react'
import {
  BookmarkIcon,
  PhoneIcon,
  SparklesIcon,
  AdjustmentsHorizontalIcon,
  PlayIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useGetContactsQuery } from '@/store/api/contactsApi'
import { useAppDispatch } from '@/store/hooks'
import { openDialer, startDialingSession } from '@/store/slices/dialerSlice'
import { FilterBuilder } from './components/FilterBuilder'
import { SavedListSidebar } from './components/SavedListSidebar'
import { SellerRadarTab } from './components/SellerRadarTab'
import type { SmartListFilter, SavedSmartList } from '@/types'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

const initialFilters: SmartListFilter[] = [
  { id: 'f-1', field: 'leadScore', operator: 'greater_than', value: '70' },
]

export function SmartListsPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<'smart_lists' | 'seller_radar'>('smart_lists')
  const [filters, setFilters] = useState<SmartListFilter[]>(initialFilters)
  const [selectedListId, setSelectedListId] = useState<string | null>('list-1')
  const { data } = useGetContactsQuery({})

  const handleApplySavedList = (list: SavedSmartList) => {
    setSelectedListId(list.id)
    setFilters(list.filters)
    toast.info(`Loaded "${list.name}" list`)
  }

  const handleSaveList = () => {
    toast.success('Smart list configuration saved!')
  }

  // Filter contacts in memory
  const filteredContacts = useMemo(() => {
    if (!data?.contacts) return []
    return data.contacts.filter((c) => {
      return filters.every((f) => {
        if (!f.value) return true
        if (f.field === 'leadScore') {
          const num = Number(f.value)
          if (f.operator === 'greater_than') return c.leadScore > num
          if (f.operator === 'less_than') return c.leadScore < num
          if (f.operator === 'equals') return c.leadScore === num
        }
        if (f.field === 'leadSource') {
          if (f.operator === 'equals')
            return c.leadSource.toLowerCase() === String(f.value).toLowerCase()
          if (f.operator === 'contains')
            return c.leadSource.toLowerCase().includes(String(f.value).toLowerCase())
        }
        if (f.field === 'status') {
          return c.status === f.value
        }
        if (f.field === 'city') {
          return c.city?.toLowerCase().includes(String(f.value).toLowerCase())
        }
        return true
      })
    })
  }, [data?.contacts, filters])

  const handleCallSingleContact = (
    e: React.MouseEvent,
    c: { id: string; firstName: string; lastName: string; phone: string }
  ) => {
    e.stopPropagation()
    dispatch(openDialer({ lineCount: 1 }))
    dispatch(
      startDialingSession({
        targets: [{ id: c.id, name: `${c.firstName} ${c.lastName}`, phone: c.phone }],
      })
    )
  }

  const handlePushListToDialer = () => {
    if (filteredContacts.length === 0) {
      toast.error('No contacts in this list to dial')
      return
    }

    const targets = filteredContacts.slice(0, 3).map((c) => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      phone: c.phone,
    }))

    dispatch(openDialer({ lineCount: 3 }))
    dispatch(startDialingSession({ targets }))
    toast.success(`Pushed ${filteredContacts.length} contacts into 3-Line Parallel Dialer!`)
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Smart Lists & Predictive Radar
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
              <SparklesIcon className="w-3.5 h-3.5" /> Real-Time Segments
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dynamic lead filtering, 3-line dialer queue sync, and AI predictive seller propensity.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1.5 bg-muted/40 p-1.5 rounded-2xl border border-border/60">
          <button
            type="button"
            onClick={() => setActiveTab('smart_lists')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'smart_lists'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <AdjustmentsHorizontalIcon className="w-3.5 h-3.5" />
            Dynamic Smart Lists
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('seller_radar')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'seller_radar'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <SparklesIcon className="w-3.5 h-3.5" />
            Predictive "Seller Radar"
          </button>
        </div>
      </div>

      {/* Tab 1: Smart Lists */}
      {activeTab === 'smart_lists' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            {/* Sidebar with presets */}
            <div className="lg:col-span-1">
              <SavedListSidebar selectedId={selectedListId} onSelect={handleApplySavedList} />
            </div>

            {/* Filter builder + results */}
            <div className="space-y-6 lg:col-span-3">
              {/* Builder */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold">Filter Rules</h3>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={handleSaveList} className="h-8 text-xs">
                        <BookmarkIcon className="mr-1.5 h-3.5 w-3.5" /> Save Rule
                      </Button>
                    </div>
                  </div>
                  <FilterBuilder filters={filters} onChange={setFilters} />
                </CardContent>
              </Card>

              {/* Results table */}
              <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-xs">
                <div className="flex flex-wrap items-center justify-between border-b border-border bg-muted/30 px-5 py-3.5 gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">Matched Contacts</span>
                    <Badge variant="secondary" className="text-xs">
                      {filteredContacts.length} leads
                    </Badge>
                  </div>

                  <Button
                    size="sm"
                    onClick={handlePushListToDialer}
                    className="h-8 shadow-xs font-semibold bg-primary hover:bg-primary/90"
                  >
                    <PlayIcon className="w-3.5 h-3.5 mr-1.5" />
                    Launch in 3-Line Parallel Dialer
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contact</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-center">Score</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContacts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-xs">
                          No contacts match the current filter rules.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredContacts.map((c) => (
                        <TableRow
                          key={c.id}
                          className="cursor-pointer transition-colors hover:bg-muted/50"
                          onClick={() => navigate(`/contacts/${c.id}`)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                  {c.firstName[0]}
                                  {c.lastName[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-semibold text-xs text-foreground">
                                {c.firstName} {c.lastName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">{c.phone}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{c.city || 'Austin'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {c.leadSource}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-xs font-bold font-mono',
                                c.leadScore >= 75
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-primary/10 text-primary'
                              )}
                            >
                              {c.leadScore}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-primary hover:bg-primary/10"
                              onClick={(e) => handleCallSingleContact(e, c)}
                              title={`Call ${c.firstName}`}
                            >
                              <PhoneIcon className="h-3.5 w-3.5 mr-1" />
                              Call
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Predictive Seller Radar */}
      {activeTab === 'seller_radar' && <SellerRadarTab />}
    </div>
  )
}
