import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getFeatureGuideForPath } from '@/constants/featureGuides'
import { HelpGuideDrawer } from './HelpGuideDrawer'
import { useAppSelector } from '@/store/hooks'
import {
  QuestionMarkCircleIcon,
  SparklesIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

interface HelpGuideFloatingButtonProps {
  isAuthLayout?: boolean
}

export const HelpGuideFloatingButton: React.FC<HelpGuideFloatingButtonProps> = ({
  isAuthLayout = false,
}) => {
  const location = useLocation()
  const sidebarCollapsed = useAppSelector((state) => state.ui?.sidebarCollapsed ?? false)
  const [isOpen, setIsOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const currentGuide = getFeatureGuideForPath(location.pathname)

  // Listen for global keyboard shortcut "?"
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      const activeTag = document.activeElement?.tagName?.toLowerCase()
      if (activeTag === 'input' || activeTag === 'textarea' || document.activeElement?.getAttribute('contenteditable')) {
        return
      }

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      {/* Floating Bottom-Left Trigger */}
      <div
        className={cn(
          'fixed bottom-6 z-40 flex items-center gap-2.5 transition-all duration-300 pointer-events-auto select-none',
          isAuthLayout
            ? 'left-6'
            : sidebarCollapsed
            ? 'left-[82px]'
            : 'left-[276px]'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Glowing Pulsing Button */}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={cn(
            'group relative flex h-12 w-12 items-center justify-center rounded-2xl shadow-xl transition-all duration-300',
            'bg-gradient-to-tr from-primary via-chart-3 to-chart-2 text-white',
            'hover:scale-110 active:scale-95 focus:outline-hidden',
            'ring-2 ring-white/30 dark:ring-white/20'
          )}
          aria-label={`Open Help Guide for ${currentGuide.title}`}
          title={`Help & Step-by-Step Guide for ${currentGuide.title}`}
        >
          {/* Ambient Glow Aura Effect */}
          <span className="absolute -inset-1.5 rounded-2xl bg-gradient-to-r from-primary via-chart-3 to-chart-2 opacity-60 blur-md transition-all group-hover:opacity-100 group-hover:blur-lg animate-pulse -z-10" />

          {/* Icon */}
          <div className="relative flex items-center justify-center">
            <QuestionMarkCircleIcon className="h-6 w-6 stroke-[2.2] transition-transform duration-300 group-hover:rotate-12" />
            <SparklesIcon className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 text-amber-300 animate-bounce" />
          </div>
        </button>

        {/* Expandable Context Label / Tooltip Pill */}
        <div
          onClick={() => setIsOpen(true)}
          className={cn(
            'cursor-pointer overflow-hidden rounded-2xl border border-primary/30 bg-background/95 px-3.5 py-2 shadow-lg backdrop-blur-md transition-all duration-300 flex items-center gap-2.5',
            isHovered
              ? 'opacity-100 translate-x-0 max-w-[280px]'
              : 'opacity-0 -translate-x-2 max-w-0 px-0 pointer-events-none'
          )}
        >
          <BookOpenIcon className="w-4 h-4 text-primary shrink-0" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-[11px] font-bold text-foreground truncate">
              {currentGuide.title}
            </p>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <span className="truncate">Steps & Workarounds</span>
              <kbd className="px-1 py-0.2 rounded bg-muted text-[9px] font-mono border border-border shrink-0">?</kbd>
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Guide Drawer Dialog */}
      <HelpGuideDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}
