import { useRef, useState, useEffect, useCallback } from 'react'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { cn } from '@/lib/utils'

export interface NavTabItem {
  id: string
  label: string
  icon?: string
  badge?: string | number
}

interface CommonNavProps {
  tabs: NavTabItem[]
  activeTab: string
  onSelectTab: (id: string) => void
  variant?: 'sage' | 'pine'
}

/**
 * Mobile & Tablet Sliding Navbar Pill:
 * The currently selected tab's name is completely visible in the center,
 * while other tabs slide to the sides with overflow:hidden out of the navbar pill.
 * Supports chevron buttons, touch swipe gestures, and trackpad/wheel scrolling.
 */
export function MobileTabletNavPill({
  tabs,
  activeTab,
  onSelectTab,
  variant = 'sage',
  className,
}: CommonNavProps & { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [translateX, setTranslateX] = useState(0)
  const touchStartX = useRef<number | null>(null)

  const activeIndex = tabs.findIndex((t) => t.id === activeTab)

  const updatePosition = useCallback(() => {
    if (!containerRef.current || activeIndex === -1) return
    const container = containerRef.current
    const activeEl = tabRefs.current[activeIndex]
    if (!activeEl) return

    const containerWidth = container.offsetWidth
    const activeCenter = activeEl.offsetLeft + activeEl.offsetWidth / 2
    const targetOffset = containerWidth / 2 - activeCenter
    setTranslateX(targetOffset)
  }, [activeIndex])

  useEffect(() => {
    const timer = setTimeout(updatePosition, 25)
    return () => clearTimeout(timer)
  }, [updatePosition, activeTab, tabs])

  useEffect(() => {
    window.addEventListener('resize', updatePosition)
    return () => window.removeEventListener('resize', updatePosition)
  }, [updatePosition])

  const handlePrev = () => {
    if (activeIndex > 0) {
      onSelectTab(tabs[activeIndex - 1].id)
    }
  }

  const handleNext = () => {
    if (activeIndex < tabs.length - 1) {
      onSelectTab(tabs[activeIndex + 1].id)
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    if (deltaX > 35) {
      handlePrev()
    } else if (deltaX < -35) {
      handleNext()
    }
    touchStartX.current = null
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 15) {
      if (e.deltaX > 0) handleNext()
      else handlePrev()
    }
  }

  const activeBgClass =
    variant === 'pine'
      ? 'bg-[#2B5748] text-white font-bold shadow-xs'
      : 'bg-[#9CB080] text-[#273338] font-bold shadow-xs'

  return (
    <div
      className={cn(
        'relative flex items-center justify-between w-full max-w-2xl mx-auto rounded-full bg-white dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/60 p-0.5 shadow-xs overflow-hidden select-none',
        className
      )}
    >
      {/* Left Chevron */}
      <button
        type="button"
        onClick={handlePrev}
        disabled={activeIndex === 0}
        aria-label="Previous tab"
        className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-[#75887E] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white disabled:opacity-20 transition-all cursor-pointer z-10"
      >
        <MaterialIcon name="chevron_left" size={18} />
      </button>

      {/* Sliding Viewport with overflow-hidden */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        className="relative flex-1 overflow-hidden h-9 flex items-center justify-start select-none"
      >
        <div
          className="flex items-center gap-1.5 transition-transform duration-300 ease-out will-change-transform absolute left-0"
          style={{ transform: `translateX(${translateX}px)` }}
        >
          {tabs.map((tab, idx) => {
            const isActive = tab.id === activeTab
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[idx] = el
                }}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 py-1.5 px-3.5 rounded-full text-xs whitespace-nowrap transition-all duration-300 shrink-0 cursor-pointer',
                  isActive
                    ? cn('scale-100 opacity-100 z-10', activeBgClass)
                    : 'text-[#75887E] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white opacity-40 scale-90'
                )}
              >
                {tab.icon && <MaterialIcon name={tab.icon} size={16} />}
                <span className="inline-block whitespace-nowrap font-bold">{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                      isActive
                        ? 'bg-black/15 text-inherit'
                        : 'bg-[#D8E2D6] dark:bg-[#1A2E26] text-[#273338] dark:text-white'
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Right Chevron */}
      <button
        type="button"
        onClick={handleNext}
        disabled={activeIndex === tabs.length - 1}
        aria-label="Next tab"
        className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-[#75887E] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white disabled:opacity-20 transition-all cursor-pointer z-10"
      >
        <MaterialIcon name="chevron_right" size={18} />
      </button>
    </div>
  )
}

/**
 * Desktop Horizontal Navigation Track:
 * Expands horizontally on large screens with full visibility.
 */
export function DesktopNavTrack({
  tabs,
  activeTab,
  onSelectTab,
  variant = 'sage',
  className,
}: CommonNavProps & { className?: string }) {
  const activeBgClass =
    variant === 'pine'
      ? 'bg-[#2B5748] text-white shadow-xs'
      : 'bg-[#9CB080] text-[#273338] shadow-xs'

  return (
    <div
      className={cn(
        'h-auto p-1 bg-white/90 dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/60 rounded-xl flex items-center gap-1 overflow-x-auto max-w-full no-scrollbar shadow-xs',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            className={cn(
              'text-xs font-semibold px-3.5 py-2 rounded-lg gap-2 whitespace-nowrap flex items-center transition-all cursor-pointer',
              isActive
                ? cn('font-bold', activeBgClass)
                : 'text-[#4A5D54] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white'
            )}
          >
            {tab.icon && <MaterialIcon name={tab.icon} size={16} />}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                  isActive
                    ? 'bg-black/15 text-inherit'
                    : 'bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#273338] dark:text-white'
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export interface ResponsivePageNavProps {
  tabs: NavTabItem[]
  activeTab: string
  onSelectTab: (id: string) => void
  desktopBreakpoint?: 'md' | 'lg'
  variant?: 'sage' | 'pine'
  extraAction?: React.ReactNode
  sticky?: boolean
  className?: string
}

/**
 * Unified Responsive Page Navigation Component:
 * - Mobile & Tablet (< lg): Shows identical sliding navbar pill with centered active tab.
 * - Desktop (lg+): Shows horizontal expanded track.
 * - Supports optional sticky container with backdrop blur and optional extra header action.
 */
export function ResponsivePageNav({
  tabs,
  activeTab,
  onSelectTab,
  desktopBreakpoint = 'lg',
  variant = 'sage',
  extraAction,
  sticky = false,
  className,
}: ResponsivePageNavProps) {
  const desktopDisplayClass = desktopBreakpoint === 'md' ? 'hidden md:flex' : 'hidden lg:flex'
  const mobileTabletDisplayClass = desktopBreakpoint === 'md' ? 'flex md:hidden' : 'flex lg:hidden'

  const content = (
    <div className={cn('flex items-center justify-between gap-2.5 max-w-full w-full', className)}>
      {/* Desktop Navigation Track */}
      <div className={cn('items-center flex-1 min-w-0', desktopDisplayClass)}>
        <DesktopNavTrack
          tabs={tabs}
          activeTab={activeTab}
          onSelectTab={onSelectTab}
          variant={variant}
        />
      </div>

      {/* Mobile & Tablet Navigation Pill */}
      <div className={cn('flex-1 min-w-0', mobileTabletDisplayClass)}>
        <MobileTabletNavPill
          tabs={tabs}
          activeTab={activeTab}
          onSelectTab={onSelectTab}
          variant={variant}
        />
      </div>

      {/* Optional Extra Action Button */}
      {extraAction && (
        <div className="shrink-0 flex items-center">
          {extraAction}
        </div>
      )}
    </div>
  )

  if (sticky) {
    return (
      <div className="sticky top-0 z-20 -mt-4 sm:-mt-6 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 bg-[#F5F7F4]/95 dark:bg-[#1E282D]/95 backdrop-blur-md border-b border-[#D8E2D6] dark:border-[#618764]/40 shadow-xs">
        {content}
      </div>
    )
  }

  return content
}
