import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { useGetContactsQuery } from '@/store/api/contactsApi'
import {
  useGetSmartListsQuery,
  useCreateSmartListMutation,
  useDeleteSmartListMutation,
} from '@/store/api/smartListsApi'
import { useAppDispatch } from '@/store/hooks'
import { openDialer, startDialingSession } from '@/store/slices/dialerSlice'
import { FilterBuilder } from './components/FilterBuilder'
import { SellerRadarTab } from './components/SellerRadarTab'
import { MicroCmaModal } from './components/MicroCmaModal'
import { ResponsivePageNav, type NavTabItem } from '@/components/navigation/ResponsivePageNav'
import type { Contact, SmartListFilter, SavedSmartList } from '@/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { TableGridToggle, TableGridToggleButton, type TableColumn, type TableGridViewMode } from '@/components/shared/TableGridToggle'

const TABS: NavTabItem[] = [
  { id: 'filters', label: 'Segment Builder', icon: 'filter_alt' },
  { id: 'radar', label: 'Seller Radar', icon: 'radar' },
]

const INITIAL_PRESETS: SavedSmartList[] = [
  {
    id: 'preset-1',
    name: 'Hot Leads',
    contactCount: 0,
    updatedAt: '2026-08-28',
    filters: [{ id: 'f-1', field: 'leadScore', operator: 'greater_than', value: '79' }],
  },
  {
    id: 'preset-2',
    name: 'Zillow Inbound',
    contactCount: 0,
    updatedAt: '2026-08-28',
    filters: [
      { id: 'f-2a', field: 'leadSource', operator: 'equals', value: 'Zillow' },
      { id: 'f-2b', field: 'status', operator: 'equals', value: 'active' },
    ],
  },
  {
    id: 'preset-3',
    name: 'Follow Up',
    contactCount: 0,
    updatedAt: '2026-08-28',
    filters: [{ id: 'f-3', field: 'leadScore', operator: 'greater_than', value: '39' }],
  },
  {
    id: 'preset-4',
    name: 'Inactive Leads',
    contactCount: 0,
    updatedAt: '2026-08-28',
    filters: [{ id: 'f-4', field: 'status', operator: 'equals', value: 'inactive' }],
  },
  {
    id: 'preset-5',
    name: 'Austin Metro',
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
  const [isPresetsOpen, setIsPresetsOpen] = useState(false)

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
        toast.success('Smart list deleted')
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
      toast.success(`Smart list "${created.name}" saved!`)
    } catch {
      toast.error('Failed to save smart list')
    }
  }

  // Batch Action: Enqueue Segment to Dialer
  const handleEnqueueToDialer = () => {
    if (filteredContacts.length === 0) {
      toast.error('No contacts matching filter segment')
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

  const selectedPreset = presetsWithCounts.find((p) => p.id === selectedPresetId)

  const [view, setView] = useState<TableGridViewMode>(() => {
    const saved = localStorage.getItem('crm_smartlists_contacts_view')
    return saved === 'grid' ? 'grid' : 'table'
  })

  const handleViewChange = (newView: TableGridViewMode) => {
    setView(newView)
    localStorage.setItem('crm_smartlists_contacts_view', newView)
  }

  const smartListColumns: TableColumn<Contact>[] = [
    {
      id: 'name',
      header: 'Contact Name',
      className: '',
      cell: (c) => (
        <div className="flex items-center gap-2.5">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-[#EDF2EB] dark:bg-[#273338] text-[#2B5748] dark:text-[#9CB080] text-[10px] font-bold">
              {c.firstName[0]}
              {c.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <span className="font-semibold text-xs text-[#273338] dark:text-white">
            {c.firstName} {c.lastName}
          </span>
        </div>
      ),
    },
    {
      id: 'phone',
      header: 'Phone',
      className: 'font-mono text-xs text-[#75887E] dark:text-[#A0B2A6]',
      cell: (c) => c.phone || '—',
    },
    {
      id: 'email',
      header: 'Email',
      className: 'text-xs text-[#75887E] dark:text-[#A0B2A6]',
      cell: (c) => c.email || '—',
    },
    {
      id: 'source',
      header: 'Source',
      cell: (c) => (
        <Badge variant="outline" className="text-[10px] border-[#D8E2D6] dark:border-[#618764]/40">
          {c.leadSource}
        </Badge>
      ),
    },
    {
      id: 'score',
      header: 'Score',
      align: 'center',
      cell: (c) => (
        <Badge
          variant="outline"
          className={cn(
            'text-[10px] font-bold',
            c.leadScore >= 80
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
              : c.leadScore >= 60
                ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-300 dark:border-sky-800'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-300 dark:border-amber-800'
          )}
        >
          {c.leadScore}
        </Badge>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (c) => (
        <Badge variant={c.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
          {c.status}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (c) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs px-2 text-[#2B5748] dark:text-[#9CB080] hover:bg-[#EDF2EB] dark:hover:bg-[#1A2E26] cursor-pointer"
            onClick={() => handleOpenCma(c)}
            title="Generate Micro-CMA"
          >
            <MaterialIcon name="analytics" size={14} className="mr-1" />
            CMA
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs px-2 text-[#273338] dark:text-white hover:bg-[#EDF2EB] dark:hover:bg-[#1A2E26] cursor-pointer"
            onClick={() => {
              const cleanPhone = (c.phone || '').replace(/\D/g, '')
              if (cleanPhone) {
                window.open(`https://web.whatsapp.com/send?phone=${cleanPhone}`, '_blank')
              } else {
                toast.error('No phone number available for this contact')
              }
            }}
            title="Call on WhatsApp Web"
          >
            <MaterialIcon name="call" size={14} className="mr-1 text-emerald-600" />
            Call
          </Button>
        </div>
      ),
    },
  ]

  const renderContactCard = (c: Contact) => (
    <div
      key={c.id}
      onClick={() => navigate(`/contacts/${c.id}`)}
      className="p-4 rounded-xl border border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#202B2F] shadow-xs hover:border-[#618764] transition-all cursor-pointer space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="bg-[#EDF2EB] dark:bg-[#273338] text-[#2B5748] dark:text-[#9CB080] text-xs font-bold">
              {c.firstName[0]}
              {c.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-bold text-sm text-[#273338] dark:text-white truncate">
              {c.firstName} {c.lastName}
            </p>
            <p className="text-xs text-[#75887E] dark:text-[#A0B2A6] truncate">{c.email}</p>
          </div>
        </div>
        <Badge variant={c.status === 'active' ? 'default' : 'secondary'} className="text-[10px] shrink-0">
          {c.status}
        </Badge>
      </div>

      <div className="flex items-center justify-between text-xs text-[#75887E] dark:text-[#A0B2A6] pt-2 border-t border-[#D8E2D6]/60 dark:border-[#618764]/30">
        <span className="font-mono">{c.phone || 'No phone'}</span>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-[10px] border-[#D8E2D6] dark:border-[#618764]/40">
            {c.leadSource}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] font-bold',
              c.leadScore >= 80
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                : c.leadScore >= 60
                  ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-300 dark:border-sky-800'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-300 dark:border-amber-800'
            )}
          >
            Score {c.leadScore}
          </Badge>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs px-2.5 text-[#2B5748] dark:text-[#9CB080] hover:bg-[#EDF2EB] dark:hover:bg-[#1A2E26] cursor-pointer"
          onClick={() => handleOpenCma(c)}
          title="Generate Micro-CMA"
        >
          <MaterialIcon name="analytics" size={14} className="mr-1" />
          CMA
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs px-2.5 text-[#273338] dark:text-white hover:bg-[#EDF2EB] dark:hover:bg-[#1A2E26] cursor-pointer"
          onClick={() => {
            const cleanPhone = (c.phone || '').replace(/\D/g, '')
            if (cleanPhone) {
              window.open(`https://web.whatsapp.com/send?phone=${cleanPhone}`, '_blank')
            } else {
              toast.error('No phone number available for this contact')
            }
          }}
          title="Call on WhatsApp Web"
        >
          <MaterialIcon name="call" size={14} className="mr-1 text-emerald-600" />
          Call
        </Button>
      </div>
    </div>
  )

  return (
    <div className="space-y-5 pb-12">
      {/* ── Unified Responsive Navigation: Mobile & Tablet (< lg) sliding pill, Desktop (lg+) track ── */}
      <ResponsivePageNav
        tabs={TABS}
        activeTab={activeTab}
        onSelectTab={(id) => setActiveTab(id as 'filters' | 'radar')}
        variant="pine"
        extraAction={
          <div className="text-right hidden sm:block">
            <h1 className="text-base font-bold text-[#273338] dark:text-white">Smart Lists</h1>
            <p className="text-xs text-[#75887E] dark:text-[#A0B2A6]">Dynamic Segment Engine</p>
          </div>
        }
      />

      {activeTab === 'radar' ? (
        /* ── AI Seller Radar View ── */
        <SellerRadarTab />
      ) : (
        /* ── Dynamic Segment Builder View (Full Width) ── */
        <div className="space-y-5">
          {/* Filter Condition Builder Card */}
          <Card className="border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#202B2F] shadow-xs">
            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-[#273338] dark:text-white">
                  <MaterialIcon name="tune" size={18} className="text-[#2B5748] dark:text-[#9CB080]" />
                  Segmentation Rules
                </CardTitle>
                <CardDescription className="text-xs text-[#75887E] dark:text-[#A0B2A6]">
                  Contacts must meet all active criteria
                </CardDescription>
              </div>

              {/* Presets Button & Reset Rules */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Dedicated Presets Button (Opens Popover) */}
                <Popover open={isPresetsOpen} onOpenChange={setIsPresetsOpen}>
                  <PopoverTrigger
                    className="inline-flex items-center justify-center rounded-md h-8 px-3 text-xs font-bold gap-1.5 border border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#202B2F] text-[#273338] dark:text-white hover:bg-[#EDF2EB] dark:hover:bg-[#1A2E26] cursor-pointer"
                  >
                    <MaterialIcon name="bookmarks" size={15} className="text-[#2B5748] dark:text-[#9CB080]" />
                    <span>Presets</span>
                    {selectedPreset && (
                      <span className="ml-1 text-[11px] font-normal text-[#75887E] dark:text-[#A0B2A6] max-w-[110px] truncate hidden sm:inline">
                        ({selectedPreset.name})
                      </span>
                    )}
                    <MaterialIcon name="expand_more" size={15} className="text-[#75887E] dark:text-[#A0B2A6]" />
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0 bg-white dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/50 rounded-2xl shadow-xl z-50">
                    <div className="p-3 border-b border-[#D8E2D6] dark:border-[#618764]/40 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <MaterialIcon name="bookmarks" size={16} className="text-[#2B5748] dark:text-[#9CB080]" />
                        <span className="text-xs font-bold text-[#273338] dark:text-white">Smart List Presets</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setIsPresetsOpen(false)
                          setIsSaveModalOpen(true)
                        }}
                        className="h-7 text-xs px-2 gap-1 text-[#2B5748] dark:text-[#9CB080] hover:bg-[#EDF2EB] dark:hover:bg-[#1A2E26] cursor-pointer"
                        title="Save current filters as preset"
                      >
                        <MaterialIcon name="add" size={14} />
                        Save Current
                      </Button>
                    </div>

                    <div className="p-2 max-h-72 overflow-y-auto space-y-1">
                      {presetsWithCounts.map((preset) => {
                        const isSelected = selectedPresetId === preset.id
                        return (
                          <div
                            key={preset.id}
                            onClick={() => {
                              handleSelectPreset(preset)
                              setIsPresetsOpen(false)
                            }}
                            className={cn(
                              'group flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-colors cursor-pointer',
                              isSelected
                                ? 'bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#2B5748] dark:text-[#9CB080] font-bold border border-[#D8E2D6] dark:border-[#618764]/40'
                                : 'hover:bg-[#F5F7F4] dark:hover:bg-[#273338] text-[#75887E] dark:text-[#A0B2A6]'
                            )}
                          >
                            <span className="truncate flex-1 font-medium">{preset.name}</span>
                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[#D8E2D6]/50 dark:bg-[#273338] text-[#273338] dark:text-slate-200">
                                {preset.contactCount}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeletePreset(preset.id)
                                }}
                                className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-[#75887E] hover:text-rose-600 transition-opacity cursor-pointer"
                                title="Delete preset"
                              >
                                <MaterialIcon name="delete" size={14} />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </PopoverContent>
                </Popover>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedPresetId(null)
                    setFilters([{ id: `f-${Date.now()}`, field: 'leadScore', operator: 'greater_than', value: '50' }])
                  }}
                  className="text-xs h-8 px-2.5 border-[#D8E2D6] dark:border-[#618764]/40 cursor-pointer"
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#202B2F] p-4 rounded-2xl border border-[#D8E2D6] dark:border-[#618764]/40 shadow-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative w-64">
                <MaterialIcon
                  name="search"
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#75887E] dark:text-[#A0B2A6]"
                />
                <Input
                  placeholder="Search in segment..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#273338]"
                />
              </div>
              <Badge
                variant="outline"
                className="text-xs font-semibold px-2.5 py-1 bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#2B5748] dark:text-[#9CB080] border-[#D8E2D6] dark:border-[#618764]/40"
              >
                {filteredContacts.length} Matched
              </Badge>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <TableGridToggleButton
                view={view}
                onViewChange={handleViewChange}
                storageKey="crm_smartlists_contacts_view"
              />

              <Button
                size="sm"
                variant="outline"
                onClick={handleExportCsv}
                disabled={filteredContacts.length === 0}
                className="h-9 text-xs font-semibold gap-1.5 border-[#D8E2D6] dark:border-[#618764]/40 cursor-pointer"
              >
                <MaterialIcon name="download" size={15} />
                Export CSV
              </Button>

              <Button
                size="sm"
                onClick={handleEnqueueToDialer}
                disabled={filteredContacts.length === 0}
                className="h-9 text-xs font-bold gap-1.5 bg-[#2B5748] hover:bg-[#24463a] text-white shadow-xs cursor-pointer"
              >
                <MaterialIcon name="call" size={15} />
                Dialer Queue ({filteredContacts.length})
              </Button>
            </div>
          </div>

          {/* Filtered Contacts Table / Grid (2 per row) */}
          <TableGridToggle<Contact>
            data={filteredContacts}
            keyExtractor={(c) => c.id}
            columns={smartListColumns}
            renderCard={renderContactCard}
            view={view}
            onViewChange={handleViewChange}
            storageKey="crm_smartlists_contacts_view"
            hideToggle={true}
            isLoading={loadingContacts}
            onRowClick={(c) => navigate(`/contacts/${c.id}`)}
            emptyIcon="group_off"
            emptyTitle="No matching contacts"
            emptyDescription="Try adjusting or removing some filter rules in the condition builder above."
          />
        </div>
      )}

      {/* Save Custom Preset Modal */}
      <Dialog open={isSaveModalOpen} onOpenChange={setIsSaveModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/50">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#273338] dark:text-white">Save Preset</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSavePreset} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#273338] dark:text-white">Preset Name</Label>
              <Input
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="e.g. Austin Buyers"
                required
                className="text-xs border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#273338]"
              />
            </div>
            <p className="text-xs text-[#75887E] dark:text-[#A0B2A6]">
              Saves active condition(s). Matches <strong>{filteredContacts.length}</strong> contacts.
            </p>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsSaveModalOpen(false)} className="cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-[#2B5748] hover:bg-[#24463a] text-white font-semibold cursor-pointer">
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
