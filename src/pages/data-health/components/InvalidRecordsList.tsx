import { useState, useMemo } from 'react'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useGetDataIssuesQuery, type ContactWithDataIssues } from '@/store/api/dataHealthApi'
import { ContactProfileModal } from './ContactProfileModal'
import { TableGridToggle, TableGridToggleButton, type TableGridViewMode } from '@/components/shared/TableGridToggle'
import { cn } from '@/lib/utils'

export function InvalidRecordsList() {
  const [filterType, setFilterType] = useState<'all' | 'email' | 'phone'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [view, setView] = useState<TableGridViewMode>(() => {
    const saved = localStorage.getItem('crm_datahealth_issues_view')
    return saved === 'grid' ? 'grid' : 'table'
  })

  const { data: issues = [], isLoading } = useGetDataIssuesQuery()

  // Selected contact for Complete Profile Card Modal
  const [selectedContact, setSelectedContact] = useState<ContactWithDataIssues | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalInitialEdit, setModalInitialEdit] = useState(false)

  const handleOpenProfile = (contact: ContactWithDataIssues, editMode = false) => {
    setSelectedContact(contact)
    setModalInitialEdit(editMode)
    setIsModalOpen(true)
  }

  const handleViewChange = (newView: TableGridViewMode) => {
    setView(newView)
    localStorage.setItem('crm_datahealth_issues_view', newView)
  }

  // Filtered issues based on tab and search
  const filteredIssues = useMemo(() => {
    return issues.filter((item) => {
      // Tab filter
      if (filterType === 'email' && !item.hasInvalidEmail) return false
      if (filterType === 'phone' && !item.hasInvalidPhone) return false

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const fullName = `${item.firstName} ${item.lastName}`.toLowerCase()
        const emailMatch = (item.email || '').toLowerCase().includes(q)
        const phoneMatch = (item.phone || '').includes(q)
        if (!fullName.includes(q) && !emailMatch && !phoneMatch) return false
      }

      return true
    })
  }, [issues, filterType, searchQuery])

  // Count calculations
  const emailIssueCount = useMemo(() => issues.filter((i) => i.hasInvalidEmail).length, [issues])
  const phoneIssueCount = useMemo(() => issues.filter((i) => i.hasInvalidPhone).length, [issues])

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#254238] p-5 sm:p-6 space-y-4">
        <Skeleton className="h-8 w-48 bg-[#EDF2EB] dark:bg-[#1A2E26]" />
        <Skeleton className="h-64 w-full bg-[#EDF2EB] dark:bg-[#1A2E26] rounded-xl" />
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#254238] shadow-md shadow-black/5 p-5 sm:p-6 transition-all space-y-5">
      {/* ── 1. Header Section ── */}
      <div className="space-y-4">
        {/* Title and Subtitle */}
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[#273338] dark:text-white">
              Record Issues
            </h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full border border-[#D8E2D6] dark:border-[#618764]/40 bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#2B5748] dark:text-[#9CB080]">
              {issues.length}
            </span>
          </div>
          <p className="text-xs text-[#4A5D54] dark:text-[#A0B2A6] mt-0.5">
            Contacts with invalid emails or unformatted phone numbers
          </p>
        </div>

        {/* Navigation (All Issues, Invalid Emails, Unformatted Phones) - Below heading on tablet & mobile */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <div className="inline-flex rounded-xl bg-[#EDF2EB] dark:bg-[#1A2E26] p-1 border border-[#D8E2D6] dark:border-[#618764]/40 shrink-0">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={cn(
                'px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                filterType === 'all'
                  ? 'bg-white dark:bg-[#202B2F] text-[#273338] dark:text-white shadow-xs'
                  : 'text-[#4A5D54] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white'
              )}
            >
              <span>All Issues</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#D8E2D6] dark:bg-[#2B5748] text-[#273338] dark:text-white font-bold">
                {issues.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterType('email')}
              className={cn(
                'px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                filterType === 'email'
                  ? 'bg-white dark:bg-[#202B2F] text-[#273338] dark:text-white shadow-xs'
                  : 'text-[#4A5D54] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white'
              )}
            >
              <MaterialIcon name="mail" size={13} className="text-rose-500" />
              <span>Invalid Emails</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold">
                {emailIssueCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterType('phone')}
              className={cn(
                'px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                filterType === 'phone'
                  ? 'bg-white dark:bg-[#202B2F] text-[#273338] dark:text-white shadow-xs'
                  : 'text-[#4A5D54] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white'
              )}
            >
              <MaterialIcon name="phone" size={13} className="text-amber-500" />
              <span>Unformatted Phones</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold">
                {phoneIssueCount}
              </span>
            </button>
          </div>
        </div>

        {/* Action Controls Row - Below navigation: Search & Table/Grid toggle */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          {/* Quick Search Input */}
          <div className="relative w-full sm:w-72">
            <MaterialIcon
              name="search"
              size={16}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#4A5D54] dark:text-[#A0B2A6]"
            />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contact or email..."
              className="h-8 pl-8 text-xs border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#202B2F] rounded-xl"
            />
          </div>

          {/* Table vs Grid (2 per row) Toggle - Below navigation */}
          <div className="flex items-center justify-end">
            <TableGridToggleButton
              view={view}
              onViewChange={handleViewChange}
              tableTitle="Table View"
              gridTitle="Grid View (2 per row)"
            />
          </div>
        </div>
      </div>

      {/* ── 2. Content: Toggleable Table and Grid (2 per row) ── */}
      <TableGridToggle<ContactWithDataIssues>
        data={filteredIssues}
        view={view}
        onViewChange={handleViewChange}
        storageKey="crm_datahealth_issues_view"
        hideToggle={true}
        emptyState={
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 border border-dashed border-[#D8E2D6] dark:border-[#618764]/40 rounded-xl p-6 bg-[#F5F7F4]/50 dark:bg-[#1A2E26]/20">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-1">
              <MaterialIcon name="verified" size={26} />
            </div>
            <h3 className="text-sm font-bold text-[#273338] dark:text-white">
              {searchQuery ? 'No matching record issues found' : 'Zero Record Issues Detected'}
            </h3>
            <p className="text-xs text-[#4A5D54] dark:text-[#A0B2A6] max-w-sm">
              {searchQuery
                ? 'Try modifying your search filter.'
                : 'All active contact records comply with deliverability standards and E.164 phone formats.'}
            </p>
          </div>
        }
        columns={[
          {
            id: 'contact',
            header: 'Contact',
            cell: (item) => {
              const initials = `${item.firstName?.[0] || ''}${item.lastName?.[0] || ''}`.toUpperCase() || 'C'
              return (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#2B5748] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {initials}
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => handleOpenProfile(item, false)}
                      className="font-bold text-[#273338] dark:text-white hover:text-[#008069] dark:hover:text-[#9CB080] text-left transition-colors cursor-pointer"
                    >
                      {item.firstName} {item.lastName}
                    </button>
                    <div className="text-[11px] text-[#4A5D54] dark:text-[#A0B2A6] flex items-center gap-1.5 mt-0.5">
                      <span>Score: {item.leadScore}</span>
                      <span>•</span>
                      <span>{item.leadSource}</span>
                    </div>
                  </div>
                </div>
              )
            },
          },
          {
            id: 'email',
            header: 'Email Address (Click to open profile)',
            cell: (item) => (
              <div className="flex flex-col items-start gap-1">
                <button
                  type="button"
                  onClick={() => handleOpenProfile(item, false)}
                  title="Click to view complete user profile card"
                  className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[#008069] dark:text-[#9CB080] hover:underline cursor-pointer group/email text-left"
                >
                  <MaterialIcon
                    name="mail"
                    size={14}
                    className={item.hasInvalidEmail ? 'text-rose-500' : 'text-[#618764]'}
                  />
                  <span className="truncate max-w-[200px] sm:max-w-[240px]">
                    {item.email || <span className="text-rose-500 italic">&lt;Missing Email&gt;</span>}
                  </span>
                </button>
                {item.hasInvalidEmail && (
                  <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                    Invalid RFC syntax
                  </span>
                )}
              </div>
            ),
          },
          {
            id: 'phone',
            header: 'Phone Number',
            cell: (item) => (
              <div className="flex flex-col items-start gap-1">
                <div className="flex items-center gap-1.5 font-mono text-xs text-[#273338] dark:text-white">
                  <MaterialIcon
                    name="phone"
                    size={14}
                    className={item.hasInvalidPhone ? 'text-amber-500' : 'text-[#618764]'}
                  />
                  <span>{item.phone || <span className="text-amber-500 italic">&lt;Missing Phone&gt;</span>}</span>
                </div>
                {item.hasInvalidPhone && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                    Non-E.164 format
                  </span>
                )}
              </div>
            ),
          },
          {
            id: 'issues',
            header: 'Issues Flagged',
            cell: (item) => (
              <div className="flex flex-wrap gap-1.5">
                {item.hasInvalidEmail && (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60 font-semibold gap-1 py-0.5"
                  >
                    <MaterialIcon name="cancel" size={11} className="text-rose-500" />
                    <span>Invalid Email</span>
                  </Badge>
                )}
                {item.hasInvalidPhone && (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/60 font-semibold gap-1 py-0.5"
                  >
                    <MaterialIcon name="warning" size={11} className="text-amber-500" />
                    <span>Unformatted Phone</span>
                  </Badge>
                )}
              </div>
            ),
          },
          {
            id: 'actions',
            header: 'Actions',
            align: 'right',
            cell: (item) => (
              <div className="flex items-center justify-end gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenProfile(item, false)}
                  className="h-8 text-xs font-semibold border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#202B2F] text-[#273338] dark:text-white hover:bg-[#EDF2EB] dark:hover:bg-[#1A2E26] cursor-pointer"
                >
                  <MaterialIcon name="account_circle" size={14} className="mr-1" />
                  <span>View Profile</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleOpenProfile(item, true)}
                  className="h-8 text-xs font-bold bg-[#2B5748] hover:bg-[#24463a] text-white cursor-pointer shadow-xs"
                >
                  <MaterialIcon name="edit" size={14} className="mr-1" />
                  <span>Quick Fix</span>
                </Button>
              </div>
            ),
          },
        ]}
        renderCard={(item) => {
          const initials = `${item.firstName?.[0] || ''}${item.lastName?.[0] || ''}`.toUpperCase() || 'C'
          return (
            <div className="h-full flex flex-col justify-between rounded-xl border border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#202B2F] p-4 space-y-3 shadow-xs hover:shadow-md transition-shadow">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-[#2B5748] text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {initials}
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => handleOpenProfile(item, false)}
                        className="text-sm font-bold text-[#273338] dark:text-white hover:text-[#008069] dark:hover:text-[#9CB080] text-left cursor-pointer transition-colors"
                      >
                        {item.firstName} {item.lastName}
                      </button>
                      <div className="text-[11px] text-[#4A5D54] dark:text-[#A0B2A6]">
                        Score: {item.leadScore} • {item.leadSource}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase font-bold border-[#D8E2D6] dark:border-[#618764]/40">
                    {item.status}
                  </Badge>
                </div>

                {/* Email row (clickable) */}
                <div className="p-2.5 rounded-lg bg-[#F5F7F4] dark:bg-[#1A2E26] space-y-1">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[#4A5D54] dark:text-[#A0B2A6] block">
                    Email (Tap to open profile)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenProfile(item, false)}
                    className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[#008069] dark:text-[#9CB080] hover:underline cursor-pointer text-left w-full truncate"
                  >
                    <MaterialIcon
                      name="mail"
                      size={14}
                      className={item.hasInvalidEmail ? 'text-rose-500' : 'text-[#618764]'}
                    />
                    <span className="truncate">{item.email || '<Missing Email>'}</span>
                  </button>
                </div>

                {/* Phone row */}
                <div className="flex items-center justify-between text-xs font-mono text-[#273338] dark:text-white px-1">
                  <span className="flex items-center gap-1.5">
                    <MaterialIcon
                      name="phone"
                      size={14}
                      className={item.hasInvalidPhone ? 'text-amber-500' : 'text-[#618764]'}
                    />
                    <span>{item.phone || '<Missing Phone>'}</span>
                  </span>
                </div>

                {/* Issue Badges */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {item.hasInvalidEmail && (
                    <Badge variant="outline" className="text-[10px] bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200">
                      Invalid Email
                    </Badge>
                  )}
                  {item.hasInvalidPhone && (
                    <Badge variant="outline" className="text-[10px] bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200">
                      Unformatted Phone
                    </Badge>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#D8E2D6] dark:border-[#618764]/30">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenProfile(item, false)}
                  className="h-8 text-xs font-semibold border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#202B2F] hover:bg-[#EDF2EB] dark:hover:bg-[#1A2E26] cursor-pointer"
                >
                  Profile
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleOpenProfile(item, true)}
                  className="h-8 text-xs font-bold bg-[#2B5748] hover:bg-[#24463a] text-white cursor-pointer shadow-xs"
                >
                  Quick Fix
                </Button>
              </div>
            </div>
          )
        }}
      />

      {/* ── 3. Complete User Profile Card Modal ── */}
      <ContactProfileModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        record={selectedContact}
        initialEditMode={modalInitialEdit}
      />
    </div>
  )
}
