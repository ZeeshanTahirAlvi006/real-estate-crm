import { useState, useEffect, useMemo, useRef } from 'react'
import { monitorForElements, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ContactKanbanCard } from './ContactKanbanCard'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { Contact, ContactStatus } from '@/types'

interface ContactsKanbanViewProps {
  contacts: Contact[]
  isLoading: boolean
  onEditContact: (c: Contact) => void
  onCredsContact: (c: Contact) => void
  onDeleteContact: (id: string) => void
  onUpdateContactStatus: (id: string, newStatus: ContactStatus) => void
  onAddContact?: () => void
}

type GroupByOption = 'status' | 'source' | 'score'

interface ColumnDef {
  id: string
  label: string
  color: string
  description?: string
  filter: (c: Contact) => boolean
}

function KanbanColumn({
  column,
  contacts,
  groupBy,
  onEditContact,
  onCredsContact,
  onDeleteContact,
  onUpdateContactStatus,
  onAddContact,
}: {
  column: ColumnDef
  contacts: Contact[]
  groupBy: GroupByOption
  onEditContact: (c: Contact) => void
  onCredsContact: (c: Contact) => void
  onDeleteContact: (id: string) => void
  onUpdateContactStatus: (id: string, newStatus: ContactStatus) => void
  onAddContact?: () => void
}) {
  const colRef = useRef<HTMLDivElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  useEffect(() => {
    if (!colRef.current) return
    return dropTargetForElements({
      element: colRef.current,
      getData: () => ({ columnId: column.id }),
      canDrop: () => groupBy === 'status',
      onDragEnter: () => setIsDragOver(true),
      onDragLeave: () => setIsDragOver(false),
      onDrop: () => setIsDragOver(false),
    })
  }, [column.id, groupBy])

  return (
    <div
      ref={colRef}
      className={cn(
        'w-72 sm:w-80 shrink-0 flex flex-col rounded-2xl transition-all duration-200',
        'bg-white/90 dark:bg-[#1A2E26]/60 border border-[#D8E2D6] dark:border-[#618764]/60 shadow-xs',
        isDragOver && 'border-[#9CB080] ring-2 ring-[#9CB080]/30 bg-[#9CB080]/5'
      )}
    >
      {/* Column Header */}
      <div className="p-3.5 border-b border-[#D8E2D6] dark:border-[#618764]/40 flex items-center justify-between gap-2 bg-[#F5F7F4]/70 dark:bg-[#202B2F]/60 rounded-t-2xl">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="h-3 w-3 rounded-full shrink-0 ring-1 ring-black/10 dark:ring-white/10"
            style={{ backgroundColor: column.color }}
          />
          <h3 className="text-sm font-bold text-[#273338] dark:text-white truncate">
            {column.label}
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full text-xs font-bold bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#2B5748] dark:text-[#9CB080] border border-[#D8E2D6] dark:border-[#618764]/40">
            {contacts.length}
          </span>
          {onAddContact && (
            <button
              type="button"
              onClick={onAddContact}
              className="h-5 w-5 rounded-full flex items-center justify-center text-[#75887E] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white hover:bg-[#D8E2D6] dark:hover:bg-[#254238] transition-colors cursor-pointer"
              title="Add contact"
            >
              <MaterialIcon name="add" size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Cards List Viewport */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-21rem)] min-h-[160px] no-scrollbar">
        {contacts.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center text-center p-4 border border-dashed border-[#D8E2D6] dark:border-[#618764]/40 rounded-xl">
            <MaterialIcon name="person_off" size={24} className="text-[#75887E]/60 dark:text-[#A0B2A6]/50 mb-1" />
            <p className="text-xs text-[#75887E] dark:text-[#A0B2A6]">
              No contacts in this column
            </p>
            {onAddContact && (
              <button
                type="button"
                onClick={onAddContact}
                className="mt-1.5 text-[11px] font-bold text-[#2B5748] dark:text-[#9CB080] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <MaterialIcon name="add" size={13} />
                <span>Add contact</span>
              </button>
            )}
          </div>
        ) : (
          contacts.map((contact) => (
            <ContactKanbanCard
              key={contact.id}
              contact={contact}
              onEdit={onEditContact}
              onCreds={onCredsContact}
              onDelete={onDeleteContact}
              onMoveStatus={groupBy === 'status' ? onUpdateContactStatus : undefined}
              currentStatusGroup={groupBy === 'status' ? column.id : undefined}
            />
          ))
        )}
      </div>
    </div>
  )
}

export function ContactsKanbanView({
  contacts,
  isLoading,
  onEditContact,
  onCredsContact,
  onDeleteContact,
  onUpdateContactStatus,
  onAddContact,
}: ContactsKanbanViewProps) {
  const [groupBy, setGroupBy] = useState<GroupByOption>('status')

  // Pragmatic Drag and drop monitor
  useEffect(() => {
    return monitorForElements({
      onDrop({ source, location }) {
        const target = location.current.dropTargets[0]
        if (!target) return
        const contactId = source.data.contactId as string
        const targetColId = target.data.columnId as string

        if (groupBy === 'status') {
          const contact = contacts.find((c) => c.id === contactId)
          if (contact && contact.status !== targetColId) {
            onUpdateContactStatus(contactId, targetColId as ContactStatus)
          }
        }
      },
    })
  }, [groupBy, contacts, onUpdateContactStatus])

  // Define Columns depending on groupBy state
  const columns: ColumnDef[] = useMemo(() => {
    if (groupBy === 'status') {
      return [
        {
          id: 'active',
          label: 'Active',
          color: '#9CB080',
          description: 'Engaged and active clients',
          filter: (c) => c.status === 'active' || (!c.status && true),
        },
        {
          id: 'inactive',
          label: 'Inactive',
          color: '#75887E',
          description: 'Dormant or paused contacts',
          filter: (c) => c.status === 'inactive',
        },
        {
          id: 'do_not_contact',
          label: 'Do Not Contact',
          color: '#EF4444',
          description: 'Opted out or DNC list',
          filter: (c) => c.status === 'do_not_contact',
        },
        {
          id: 'archived',
          label: 'Archived',
          color: '#6B7280',
          description: 'Historical records',
          filter: (c) => c.status === 'archived',
        },
      ]
    }

    if (groupBy === 'score') {
      return [
        {
          id: 'hot',
          label: 'Hot Leads (80-100)',
          color: '#9CB080',
          description: 'Highly engaged leads ready to transact',
          filter: (c) => (c.leadScore ?? 0) >= 80,
        },
        {
          id: 'warm',
          label: 'Warm Leads (60-79)',
          color: '#618764',
          description: 'Active nurturing and follow-up required',
          filter: (c) => (c.leadScore ?? 0) >= 60 && (c.leadScore ?? 0) < 80,
        },
        {
          id: 'cool',
          label: 'Cool Leads (40-59)',
          color: '#F59E0B',
          description: 'Early discovery phase',
          filter: (c) => (c.leadScore ?? 0) >= 40 && (c.leadScore ?? 0) < 60,
        },
        {
          id: 'cold',
          label: 'Cold Leads (<40)',
          color: '#EF4444',
          description: 'Low engagement or unresponsive',
          filter: (c) => (c.leadScore ?? 0) < 40,
        },
      ]
    }

    // Default 'source'
    const sources = ['Zillow', 'Meta Ads', 'Google Ads', 'Realtor.com', 'Website', 'Referral', 'Manual Entry']
    const colors = ['#3B82F6', '#6366F1', '#10B981', '#F97316', '#8B5CF6', '#EC4899', '#75887E']

    const colList: ColumnDef[] = sources.map((src, i) => ({
      id: src,
      label: src,
      color: colors[i % colors.length],
      filter: (c) => (c.leadSource || 'Manual Entry').toLowerCase() === src.toLowerCase(),
    }))

    // Add Other column for any uncategorized sources
    colList.push({
      id: 'other',
      label: 'Other Sources',
      color: '#94A3B8',
      filter: (c) => !sources.some((s) => s.toLowerCase() === (c.leadSource || '').toLowerCase()),
    })

    return colList
  }, [groupBy])

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="w-80 shrink-0 space-y-3">
            <Skeleton className="h-12 w-full rounded-2xl bg-[#EDF2EB] dark:bg-[#202B2F]" />
            <Skeleton className="h-32 w-full rounded-xl bg-[#EDF2EB] dark:bg-[#202B2F]" />
            <Skeleton className="h-32 w-full rounded-xl bg-[#EDF2EB] dark:bg-[#202B2F]" />
            <Skeleton className="h-32 w-full rounded-xl bg-[#EDF2EB] dark:bg-[#202B2F]" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Sub-toolbar: Grouping Mode & Summary */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#4A5D54] dark:text-[#A0B2A6]">
            Group By:
          </span>
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupByOption)}>
            <SelectTrigger className="h-8 w-44 bg-white dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white text-xs font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764]">
              <SelectItem value="status">Status (Lifecycle)</SelectItem>
              <SelectItem value="score">Lead Score</SelectItem>
              <SelectItem value="source">Lead Source</SelectItem>
            </SelectContent>
          </Select>

          {groupBy === 'status' && (
            <span className="hidden sm:inline-flex text-[11px] text-[#75887E] dark:text-[#A0B2A6] items-center gap-1 ml-2">
              <MaterialIcon name="touch_app" size={14} className="text-[#9CB080]" />
              Drag cards to change status
            </span>
          )}
        </div>

        <div className="text-xs font-medium text-[#75887E] dark:text-[#A0B2A6]">
          {contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'} loaded
        </div>
      </div>

      {/* Horizontal Scrollable Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 items-start select-none">
        {columns.map((column) => {
          const colContacts = contacts.filter(column.filter)
          return (
            <KanbanColumn
              key={column.id}
              column={column}
              contacts={colContacts}
              groupBy={groupBy}
              onEditContact={onEditContact}
              onCredsContact={onCredsContact}
              onDeleteContact={onDeleteContact}
              onUpdateContactStatus={onUpdateContactStatus}
              onAddContact={onAddContact}
            />
          )
        })}
      </div>
    </div>
  )
}
