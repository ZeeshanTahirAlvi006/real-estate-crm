import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FunnelIcon,
  PhoneIcon,
  ArrowDownTrayIcon,
  SparklesIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useGetContactsQuery } from '@/store/api/contactsApi'
import {
  useGetSmartListsQuery,
  useCreateSmartListMutation,
  useDeleteSmartListMutation,
} from '@/store/api/smartListsApi'
import { useAppDispatch } from '@/store/hooks'
import { openDialer, startDialingSession } from '@/store/slices/dialerSlice'
import { FilterBuilder } from './components/FilterBuilder'
import { SavedListSidebar } from './components/SavedListSidebar'
import { SellerRadarTab } from './components/SellerRadarTab'
import { MicroCmaModal } from './components/MicroCmaModal'
import type { Contact, SmartListFilter, SavedSmartList } from '@/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const INITIAL_PRESETS: SavedSmartList[] = [
  {
    id: 'preset-1',
    name: '🔥 Hot Leads (Score ≥ 80)',
    contactCount: 0,
    updatedAt: '2026-08-28',
    filters: [{ id: 'f-1', field: 'leadScore', operator: 'greater_than', value: '79' }],
  },
  {
    id: 'preset-2',
    name: '🔵 Zillow Inbound (Active)',
    contactCount: 0,
    updatedAt: '2026-08-28',
    filters: [
      { id: 'f-2a', field: 'leadSource', operator: 'equals', value: 'Zillow' },
      { id: 'f-2b', field: 'status', operator: 'equals', value: 'active' },
    ],
  },
  {
    id: 'preset-3',
    name: '⚡ Immediate Follow-Up (Score 40-79)',
    contactCount: 0,
    updatedAt: '2026-08-28',
    filters: [{ id: 'f-3', field: 'leadScore', operator: 'greater_than', value: '39' }],
  },
  {
    id: 'preset-4',
    name: '💤 Inactive / Re-engagement',
    contactCount: 0,
    updatedAt: '2026-08-28',
    filters: [{ id: 'f-4', field: 'status', operator: 'equals', value: 'inactive' }],
  },
  {
    id: 'preset-5',
    name: '🏙️ Austin Metro Prospects',
    contactCount: 0,
    updatedAt: '2026-08-28',
    filters: [{ id: 'f-5', field: 'city', operator: 'contains', value: 'Austin' }],
  },
]

export function SmartListsPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const [activeTab, setActiveTab] = useState<'filters' | 'radar'>('filters')
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>('preset-1')
  const [filters, setFilters] = useState<SmartListFilter[]>(INITIAL_PRESETS[0].filters)
  const [searchQuery, setSearchQuery] = useState('')

  // Backend Smart Lists API
  const { data: remoteSmartLists = [] } = useGetSmartListsQuery()
  const [createSmartListMutation] = useCreateSmartListMutation()
  const [deleteSmartListMutation] = useDeleteSmartListMutation()

  // Merge remote lists from database with default presets
  const presets: SavedSmartList[] = useMemo(() => {
    const customList = remoteSmartLists.map((item) => ({
      id: item.id,
      name: item.name,
      filters: item.filters,
      contactCount: item.contactCount || 0,
      updatedAt: item.updatedAt?.split('T')[0] || new Date().toISOString().split('T')[0],
    }))
    return [...INITIAL_PRESETS, ...customList]
  }, [remoteSmartLists])

  // New Preset Save Dialog
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)
  const [newPresetName, setNewPresetName] = useState('')

  // Micro-CMA Modal state
  const [cmaModalOpen, setCmaModalOpen] = useState(false)
  const [cmaContact, setCmaContact] = useState<{
    name: string
    address: string
    estimatedValue: number
    equityAmount: number
    yearsOwned: number
  } | null>(null)

  // Live Contacts API Query
  const { data: contactsData, isLoading: loadingContacts } = useGetContactsQuery({ limit: 100 })
  const allContacts = contactsData?.contacts || []

  // Multi-condition filtering engine
  const filteredContacts = useMemo(() => {
    return allContacts.filter((contact: Contact) => {
      // 1. Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(q)
        const matchEmail = (contact.email || '').toLowerCase().includes(q)
        const matchPhone = (contact.phone || '').includes(q)
        if (!matchName && !matchEmail && !matchPhone) return false
      }

      // 2. Custom multi-condition filters
      for (const filter of filters) {
        const { field, operator, value } = filter
        if (!value && value !== 0) continue

        const contactVal = (contact as any)[field]

        if (field === 'leadScore') {
          const score = Number(contactVal) || 0
          const target = Number(value) || 0
          if (operator === 'greater_than' && score <= target) return false
          if (operator === 'less_than' && score >= target) return false
          if (operator === 'equals' && score !== target) return false
        } else if (field === 'leadSource') {
          const src = String(contactVal || '').toLowerCase()
          const target = String(value).toLowerCase()
          if (operator === 'equals' && src !== target) return false
          if (operator === 'contains' && !src.includes(target)) return false
        } else if (field === 'status') {
          const stat = String(contactVal || '').toLowerCase()
          const target = String(value).toLowerCase()
          if (operator === 'equals' && stat !== target) return false
        } else if (field === 'city') {
          const city = String(contactVal || '').toLowerCase()
          const target = String(value).toLowerCase()
          if (operator === 'contains' && !city.includes(target)) return false
          if (operator === 'equals' && city !== target) return false
        }
      }

      return true
    })
  }, [allContacts, filters, searchQuery])

  // Count calculations for presets
  const presetsWithCounts = useMemo(() => {
    return presets.map((p) => {
      const matchCount = allContacts.filter((contact: Contact) => {
        for (const filter of p.filters) {
          const { field, operator, value } = filter
          if (!value && value !== 0) continue
          const contactVal = (contact as any)[field]
          if (field === 'leadScore') {
            const score = Number(contactVal) || 0
            const target = Number(value) || 0
            if (operator === 'greater_than' && score <= target) return false
            if (operator === 'less_than' && score >= target) return false
            if (operator === 'equals' && score !== target) return false
          } else if (field === 'leadSource') {
            const src = String(contactVal || '').toLowerCase()
            const target = String(value).toLowerCase()
            if (operator === 'equals' && src !== target) return false
            if (operator === 'contains' && !src.includes(target)) return false
          } else if (field === 'status') {
            const stat = String(contactVal || '').toLowerCase()
            const target = String(value).toLowerCase()
            if (operator === 'equals' && stat !== target) return false
          } else if (field === 'city') {
            const city = String(contactVal || '').toLowerCase()
            const target = String(value).toLowerCase()
            if (operator === 'contains' && !city.includes(target)) return false
            if (operator === 'equals' && city !== target) return false
          }
        }
        return true
      }).length

      return {
        ...p,
        contactCount: matchCount,
      }
    })
  }, [presets, allContacts])

  // Preset Selection
  const handleSelectPreset = (preset: SavedSmartList) => {
    setSelectedPresetId(preset.id)
    setFilters(preset.filters)
  }

  // Preset Deletion
  const handleDeletePreset = async (id: string) => {
    if (!id.startsWith('preset-')) {
      try {
        await deleteSmartListMutation(id).unwrap()
        toast.success('Smart list deleted from database')
      } catch {
        toast.error('Failed to delete smart list')
      }
    } else {
      toast.success('Preset deleted')
    }
    if (selectedPresetId === id) {
      setSelectedPresetId(null)
    }
  }

  // Save New Preset to MongoDB
  const handleSavePreset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPresetName.trim()) {
      toast.error('Please enter a name for the preset')
      return
    }

    try {
      const created = await createSmartListMutation({
        name: newPresetName.trim(),
        filters: filters,
      }).unwrap()

      setSelectedPresetId(created.id)
      setIsSaveModalOpen(false)
      setNewPresetName('')
      toast.success(`Smart list "${created.name}" saved to database!`)
    } catch {
      toast.error('Failed to save smart list to database')
    }
  }

  // Batch Action: Enqueue Segment to Dialer
  const handleEnqueueToDialer = () => {
    if (filteredContacts.length === 0) {
      toast.error('No contacts matching current filter segment')
      return
    }

    dispatch(openDialer({ lineCount: 3 }))
    dispatch(
      startDialingSession({
        targets: filteredContacts.slice(0, 50).map((c) => ({
          id: c.id,
          name: `${c.firstName} ${c.lastName}`,
          phone: c.phone,
        })),
      })
    )
    toast.success(`Enqueued ${filteredContacts.length} contacts to Parallel Dialer!`)
  }

  // Batch Action: Export CSV
  const handleExportCsv = () => {
    if (filteredContacts.length === 0) {
      toast.error('No contacts to export')
      return
    }

    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Lead Source', 'Lead Score', 'Status', 'City']
    const rows = filteredContacts.map((c) => [
      `"${c.firstName}"`,
      `"${c.lastName}"`,
      `"${c.email || ''}"`,
      `"${c.phone || ''}"`,
      `"${c.leadSource || ''}"`,
      c.leadScore,
      `"${c.status || ''}"`,
      `"${c.city || ''}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `smart-list-segment-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Exported ${filteredContacts.length} contacts to CSV`)
  }

  // Open CMA Modal for a contact
  const handleOpenCma = (c: Contact) => {
    setCmaContact({
      name: `${c.firstName} ${c.lastName}`,
      address: c.address ? `${c.address}, ${c.city || 'Austin TX'}` : `${c.city || 'Austin TX'}, Prime Residential`,
      estimatedValue: (c.leadScore || 65) * 10000 + 350000,
      equityAmount: Math.round(((c.leadScore || 65) * 10000 + 350000) * 0.45),
      yearsOwned: Math.round(((c.leadScore || 50) / 10) * 1.2),
    })
    setCmaModalOpen(true)
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Smart Lists & Dynamic Contact Segmentation"
          description="Save multi-condition audience filters, launch batch dialer queues, and generate instant seller equity CMAs"
        />

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-auto">
          <TabsList className="bg-muted/40 p-1 rounded-2xl border border-border/60">
            <TabsTrigger value="filters" className="rounded-xl text-xs font-semibold gap-1.5">
              <FunnelIcon className="w-3.5 h-3.5" />
              Dynamic Segment Builder
            </TabsTrigger>
            <TabsTrigger value="radar" className="rounded-xl text-xs font-semibold gap-1.5">
              <SparklesIcon className="w-3.5 h-3.5 text-primary" />
              AI Seller Propensity Radar
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {activeTab === 'radar' ? (
        /* AI Seller Radar View */
        <SellerRadarTab />
      ) : (
        /* Dynamic Segment Builder View */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column: Saved Presets Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <SavedListSidebar
              lists={presetsWithCounts}
              selectedId={selectedPresetId}
              onSelect={handleSelectPreset}
              onDelete={handleDeletePreset}
              onOpenSaveModal={() => setIsSaveModalOpen(true)}
            />
          </div>

          {/* Right 3 Columns: Filter Builder & Segmented Contacts */}
          <div className="lg:col-span-3 space-y-6">
            {/* Filter Condition Builder Card */}
            <Card className="border-border/80 shadow-xs">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <FunnelIcon className="w-4 h-4 text-primary" />
                    Multi-Condition Segmentation Rules
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Matching contacts must meet all active criteria below
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedPresetId(null)
                      setFilters([{ id: `f-${Date.now()}`, field: 'leadScore', operator: 'greater_than', value: '50' }])
                    }}
                    className="text-xs h-8 px-2.5"
                  >
                    Reset Rules
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <FilterBuilder
                  filters={filters}
                  onChange={(newFilters) => {
                    setFilters(newFilters)
                    setSelectedPresetId(null)
                  }}
                />
              </CardContent>
            </Card>

            {/* Segment Results & Batch Actions Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border/80 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="relative w-64">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search inside segment..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
                <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1 bg-primary/5 text-primary border-primary/20">
                  {filteredContacts.length} Contacts Matched
                </Badge>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportCsv}
                  disabled={filteredContacts.length === 0}
                  className="h-9 text-xs font-semibold gap-1.5"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  Export CSV
                </Button>

                <Button
                  size="sm"
                  onClick={handleEnqueueToDialer}
                  disabled={filteredContacts.length === 0}
                  className="h-9 text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 shadow-xs"
                >
                  <PhoneIcon className="w-4 h-4" />
                  Enqueue to Parallel Dialer ({filteredContacts.length})
                </Button>
              </div>
            </div>

            {/* Filtered Contacts Table */}
            {loadingContacts ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="rounded-2xl border border-border/80 bg-card p-12 text-center space-y-3">
                <UserGroupIcon className="w-10 h-10 mx-auto text-muted-foreground/50" />
                <h3 className="text-sm font-bold text-foreground">No matching contacts</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Try adjusting or removing some filter rules in the condition builder above.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs">Contact Name</TableHead>
                      <TableHead className="text-xs">Phone</TableHead>
                      <TableHead className="text-xs">Email</TableHead>
                      <TableHead className="text-xs">Source</TableHead>
                      <TableHead className="text-xs text-center">Score</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContacts.map((c) => (
                      <TableRow
                        key={c.id}
                        className="cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => navigate(`/contacts/${c.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
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
                        <TableCell className="text-xs text-muted-foreground">{c.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {c.leadSource}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] font-bold',
                              c.leadScore >= 80
                                ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                                : c.leadScore >= 60
                                  ? 'bg-blue-500/15 text-blue-500 border-blue-500/30'
                                  : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                            )}
                          >
                            {c.leadScore}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={c.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs px-2 text-primary hover:bg-primary/10"
                              onClick={() => handleOpenCma(c)}
                              title="Generate Micro-CMA"
                            >
                              <SparklesIcon className="w-3.5 h-3.5 mr-1" />
                              CMA
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs px-2 text-foreground hover:bg-muted"
                              onClick={() => {
                                dispatch(openDialer({ lineCount: 1 }))
                                dispatch(
                                  startDialingSession({
                                    targets: [{ id: c.id, name: `${c.firstName} ${c.lastName}`, phone: c.phone }],
                                  })
                                )
                              }}
                            >
                              <PhoneIcon className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                              Call
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Save Custom Preset Modal */}
      <Dialog open={isSaveModalOpen} onOpenChange={setIsSaveModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Save Dynamic Smart List</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSavePreset} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Preset Name</Label>
              <Input
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="e.g. Austin High Net Worth Buyers"
                required
                className="text-xs"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This will save all <strong>{filters.length}</strong> active filter condition(s). Matches{' '}
              <strong>{filteredContacts.length}</strong> contacts right now.
            </p>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsSaveModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="font-semibold">
                Save Preset
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Micro-CMA Valuation Modal */}
      <MicroCmaModal open={cmaModalOpen} onOpenChange={setCmaModalOpen} leadData={cmaContact} />
    </div>
  )
}
