import React, { useState, useEffect } from 'react'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export type TableGridViewMode = 'table' | 'grid' | 'stages'

export interface TableColumn<T> {
  id?: string
  header: React.ReactNode
  accessorKey?: keyof T
  cell?: (item: T, index: number) => React.ReactNode
  className?: string
  headerClassName?: string
  align?: 'left' | 'center' | 'right'
}

export interface TableGridToggleButtonProps {
  view: TableGridViewMode
  onViewChange: (newView: TableGridViewMode) => void
  tableLabel?: string
  gridLabel?: string
  stagesLabel?: string
  tableTitle?: string
  gridTitle?: string
  stagesTitle?: string
  showStages?: boolean
  className?: string
  size?: 'sm' | 'md'
  storageKey?: string
}

/**
 * Standalone toggle button switch between Table View, 2-per-row Grid View, and optional Stages View.
 * Can be used inside page headers or toolbars independently.
 */
export function TableGridToggleButton({
  view,
  onViewChange,
  tableLabel = 'Table',
  gridLabel = 'Grid',
  stagesLabel = 'Stages',
  tableTitle = 'Table View',
  gridTitle = 'Grid View (2 per row)',
  stagesTitle = 'Stages View (Drag & Drop)',
  showStages = false,
  className,
  size = 'sm',
  storageKey,
}: TableGridToggleButtonProps) {
  const isSmall = size === 'sm'

  const handleClick = (newView: TableGridViewMode) => {
    onViewChange(newView)
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, newView)
      } catch {
        // ignore localStorage errors
      }
    }
  }

  return (
    <div
      className={cn(
        'inline-flex items-center p-0.5 rounded-lg bg-white dark:bg-[#1A2E26] border border-[#D8E2D6] dark:border-[#618764] shadow-xs shrink-0',
        className
      )}
    >
      <button
        type="button"
        onClick={() => handleClick('table')}
        className={cn(
          'flex items-center gap-1.5 rounded-md font-bold transition-all cursor-pointer',
          isSmall ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs',
          view === 'table'
            ? 'bg-[#9CB080] text-[#1A2E26] shadow-xs'
            : 'text-[#4A5D54] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white'
        )}
        title={tableTitle}
      >
        <MaterialIcon name="table_rows" size={isSmall ? 15 : 16} />
        {tableLabel && <span>{tableLabel}</span>}
      </button>

      <button
        type="button"
        onClick={() => handleClick('grid')}
        className={cn(
          'flex items-center gap-1.5 rounded-md font-bold transition-all cursor-pointer',
          isSmall ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs',
          view === 'grid'
            ? 'bg-[#9CB080] text-[#1A2E26] shadow-xs'
            : 'text-[#4A5D54] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white'
        )}
        title={gridTitle}
      >
        <MaterialIcon name="grid_view" size={isSmall ? 15 : 16} />
        {gridLabel && <span>{gridLabel}</span>}
      </button>

      {showStages && (
        <button
          type="button"
          onClick={() => handleClick('stages')}
          className={cn(
            'flex items-center gap-1.5 rounded-md font-bold transition-all cursor-pointer',
            isSmall ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs',
            view === 'stages'
              ? 'bg-[#9CB080] text-[#1A2E26] shadow-xs'
              : 'text-[#4A5D54] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white'
          )}
          title={stagesTitle}
        >
          <MaterialIcon name="view_column" size={isSmall ? 15 : 16} />
          {stagesLabel && <span>{stagesLabel}</span>}
        </button>
      )}
    </div>
  )
}

export interface TableGridToggleProps<T> {
  data: T[]
  isLoading?: boolean
  view?: TableGridViewMode
  defaultView?: TableGridViewMode
  onViewChange?: (view: TableGridViewMode) => void
  storageKey?: string
  keyExtractor?: (item: T, index: number) => string | number

  // Renderers
  columns?: TableColumn<T>[]
  renderCard: (item: T, index: number) => React.ReactNode
  renderRow?: (item: T, index: number) => React.ReactNode
  renderTable?: (items: T[]) => React.ReactNode
  onRowClick?: (item: T, index: number) => void
  rowClassName?: (item: T, index: number) => string

  // Layout & Styling
  className?: string
  gridClassName?: string // Default: 'grid grid-cols-1 md:grid-cols-2 gap-4' (Two per row)
  tableClassName?: string
  tableWrapperClassName?: string

  // Empty & Loading states
  emptyIcon?: string
  emptyTitle?: string
  emptyDescription?: string
  emptyMessage?: string
  emptyState?: React.ReactNode
  skeletonCount?: number
  renderSkeleton?: (view: TableGridViewMode) => React.ReactNode

  // Header/Toolbar options
  toolbar?: React.ReactNode
  hideToggle?: boolean
  tableLabel?: string
  gridLabel?: string
  stagesLabel?: string
  stagesTitle?: string
  showStages?: boolean

  // Stages mode
  stagesContent?: React.ReactNode
  renderStages?: () => React.ReactNode

  // Pagination
  pagination?: {
    page: number
    total: number
    limit: number
    onPageChange: (newPage: number) => void
  }
}

/**
 * Generic Table & Grid (2 cards per row) Toggleable Component.
 * Eliminates redundant table/card implementations and preserves full functionality.
 */
export function TableGridToggle<T>({
  data,
  isLoading = false,
  view: controlledView,
  defaultView = 'table',
  onViewChange: controlledOnViewChange,
  storageKey,
  keyExtractor,

  // Renderers
  columns = [],
  renderCard,
  renderRow,
  renderTable,
  onRowClick,
  rowClassName,

  // Styling
  className,
  gridClassName = 'grid grid-cols-1 md:grid-cols-2 gap-4', // Strictly two per row on md+
  tableClassName,
  tableWrapperClassName,

  // Empty & Skeletons
  emptyIcon = 'inbox',
  emptyTitle = 'No items found',
  emptyDescription = 'No records match your criteria.',
  emptyState,
  skeletonCount = 6,
  renderSkeleton,

  // Toolbar & Options
  toolbar,
  hideToggle = false,
  tableLabel,
  gridLabel,
  stagesLabel,
  stagesTitle,
  showStages = false,

  // Stages mode
  stagesContent,
  renderStages,

  // Pagination
  pagination,
}: TableGridToggleProps<T>) {
  // Use controlled view if provided, otherwise internal view state
  const [internalView, setInternalView] = useState<TableGridViewMode>(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(storageKey)
        if (saved === 'table' || saved === 'grid' || saved === 'stages') return saved
      } catch {
        // ignore localStorage errors
      }
    }
    return defaultView
  })

  const currentView = controlledView ?? internalView

  const handleViewChange = (newView: TableGridViewMode) => {
    if (controlledOnViewChange) {
      controlledOnViewChange(newView)
    } else {
      setInternalView(newView)
    }

    if (storageKey) {
      try {
        localStorage.setItem(storageKey, newView)
      } catch {
        // ignore localStorage errors
      }
    }
  }

  // Keep internal state in sync with external controlled view
  useEffect(() => {
    if (controlledView && controlledView !== internalView) {
      setInternalView(controlledView)
    }
  }, [controlledView])

  // Pagination computations
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 0
  const startItem = pagination ? (pagination.page - 1) * pagination.limit + 1 : 0
  const endItem = pagination ? Math.min(pagination.page * pagination.limit, pagination.total) : 0

  // 1. Loading Skeleton State
  if (isLoading) {
    if (renderSkeleton) {
      return <>{renderSkeleton(currentView)}</>
    }

    if (currentView === 'grid') {
      return (
        <div className={cn('space-y-4', className)}>
          {toolbar && <div className="flex items-center justify-between gap-3 mb-2">{toolbar}</div>}
          <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-4', gridClassName)}>
            {[...Array(skeletonCount)].map((_, i) => (
              <Skeleton
                key={i}
                className="h-44 rounded-xl bg-[#EDF2EB] dark:bg-[#254238] border border-[#D8E2D6] dark:border-[#618764]/30"
              />
            ))}
          </div>
        </div>
      )
    }

    return (
      <div className={cn('space-y-2', className)}>
        {toolbar && <div className="flex items-center justify-between gap-3 mb-2">{toolbar}</div>}
        {[...Array(skeletonCount)].map((_, i) => (
          <Skeleton
            key={i}
            className="h-14 w-full rounded-lg bg-[#EDF2EB] dark:bg-[#254238] border border-[#D8E2D6] dark:border-[#618764]/30"
          />
        ))}
      </div>
    )
  }

  // 2. Empty State (skip if in stages view with stagesContent)
  if (data.length === 0 && !(currentView === 'stages' && (stagesContent || renderStages))) {
    return (
      <div className={cn('space-y-4', className)}>
        {(toolbar || !hideToggle) && (
          <div className="flex items-center justify-between gap-3">
            <div>{toolbar}</div>
            {!hideToggle && (
              <TableGridToggleButton
                view={currentView}
                onViewChange={handleViewChange}
                tableLabel={tableLabel}
                gridLabel={gridLabel}
                stagesLabel={stagesLabel}
                stagesTitle={stagesTitle}
                showStages={showStages}
              />
            )}
          </div>
        )}

        {emptyState ? (
          emptyState
        ) : (
          <div className="rounded-2xl border border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#254238] p-10 text-center shadow-xs">
            <MaterialIcon
              name={emptyIcon}
              size={36}
              className="text-[#75887E]/60 dark:text-[#A0B2A6]/60 mx-auto mb-2"
            />
            <h3 className="text-base font-bold text-[#273338] dark:text-white">
              {emptyTitle || 'No records found'}
            </h3>
            {emptyDescription && (
              <p className="mt-1 text-xs text-[#75887E] dark:text-[#A0B2A6] max-w-sm mx-auto">
                {emptyDescription}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  // 3. Main Rendered Content
  return (
    <div className={cn('space-y-4', className)}>
      {/* Optional Toolbar Row */}
      {(toolbar || !hideToggle) && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex-1">{toolbar}</div>
          {!hideToggle && (
            <TableGridToggleButton
              view={currentView}
              onViewChange={handleViewChange}
              tableLabel={tableLabel}
              gridLabel={gridLabel}
              stagesLabel={stagesLabel}
              stagesTitle={stagesTitle}
              showStages={showStages}
            />
          )}
        </div>
      )}

      {/* Stages Mode */}
      {currentView === 'stages' ? (
        stagesContent || (renderStages ? renderStages() : null)
      ) : currentView === 'grid' ? (
        /* Grid Mode (Two Cards Per Row) */
        <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-4', gridClassName)}>
          {data.map((item, index) => {
            const key = keyExtractor ? keyExtractor(item, index) : (item as any)?.id ?? index
            return (
              <div
                key={key}
                onClick={onRowClick ? () => onRowClick(item, index) : undefined}
                className={cn('h-full', onRowClick && 'cursor-pointer')}
              >
                {renderCard(item, index)}
              </div>
            )
          })}
        </div>
      ) : (
        /* Table Mode */
        <div>
          {renderTable ? (
            renderTable(data)
          ) : (
            <div
              className={cn(
                'rounded-xl border border-[#D8E2D6] dark:border-[#618764] overflow-hidden bg-white dark:bg-[#254238] shadow-md shadow-black/5 w-full max-w-full',
                tableWrapperClassName
              )}
            >
              <div className="w-full max-w-full overflow-x-auto">
                <table className={cn('w-full text-left border-collapse text-xs table-fixed', tableClassName)}>
                  <thead>
                    <tr className="bg-[#EDF2EB] dark:bg-[#1A2E26] border-b border-[#D8E2D6] dark:border-[#618764]">
                      {columns.map((col, idx) => (
                        <th
                          key={col.id || idx}
                          className={cn(
                            'py-2.5 px-2.5 text-[11px] font-bold tracking-wider text-[#4A5D54] dark:text-[#C2D6C7] truncate',
                            col.align === 'center' && 'text-center',
                            col.align === 'right' && 'text-right',
                            col.headerClassName
                          )}
                        >
                          {col.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D8E2D6] dark:divide-[#618764]/30 text-xs">
                    {data.map((item, index) => {
                      const key = keyExtractor
                        ? keyExtractor(item, index)
                        : (item as any)?.id ?? index

                      if (renderRow) {
                        return renderRow(item, index)
                      }

                      return (
                        <tr
                          key={key}
                          onClick={onRowClick ? () => onRowClick(item, index) : undefined}
                          className={cn(
                            'transition-colors hover:bg-[#EDF2EB]/80 dark:hover:bg-[#2E5246]',
                            index % 2 === 1 ? 'dark:bg-[#202B2F]/40' : 'dark:bg-transparent',
                            onRowClick && 'cursor-pointer',
                            rowClassName ? rowClassName(item, index) : ''
                          )}
                        >
                          {columns.map((col, colIdx) => (
                            <td
                              key={col.id || colIdx}
                              className={cn(
                                'py-2.5 px-2.5 text-[#273338] dark:text-[#E2ECE4] truncate',
                                col.align === 'center' && 'text-center',
                                col.align === 'right' && 'text-right',
                                col.className
                              )}
                            >
                              {col.cell
                                ? col.cell(item, index)
                                : col.accessorKey
                                ? String((item as any)[col.accessorKey] ?? '')
                                : null}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pagination Footer */}
      {pagination && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-[#4A5D54] dark:text-[#A0B2A6]">
          <span>
            Showing <span className="font-bold text-[#273338] dark:text-white">{startItem}-{endItem}</span> of{' '}
            <span className="font-bold text-[#273338] dark:text-white">{pagination.total}</span> records
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              className="px-3 py-1.5 rounded-md border border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#1A2E26] text-[#273338] dark:text-[#E2ECE4] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#EDF2EB] dark:hover:bg-[#254238] font-semibold text-xs cursor-pointer transition-colors shadow-2xs"
            >
              Previous
            </button>
            <span className="px-2 font-bold text-[#273338] dark:text-white">
              Page {pagination.page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={pagination.page >= totalPages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              className="px-3 py-1.5 rounded-md border border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#1A2E26] text-[#273338] dark:text-[#E2ECE4] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#EDF2EB] dark:hover:bg-[#254238] font-semibold text-xs cursor-pointer transition-colors shadow-2xs"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
