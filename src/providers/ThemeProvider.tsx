import { createContext, useContext, useEffect, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'

export type Theme = 'dark' | 'light' | 'system'

export type ThemeEvent =
  | ReactMouseEvent
  | MouseEvent
  | { clientX?: number; clientY?: number; currentTarget?: EventTarget | null; target?: EventTarget | null }

export interface ThemeContextType {
  theme: Theme
  resolvedTheme: 'dark' | 'light'
  setTheme: (theme: Theme, event?: ThemeEvent) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

function getSystemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const applyThemeToDOM = (nextTheme: Theme, nextResolved: 'dark' | 'light') => {
  const root = document.documentElement
  const opposite = nextResolved === 'dark' ? 'light' : 'dark'
  root.classList.remove(opposite)
  root.classList.add(nextResolved)
  localStorage.setItem('pp_theme', nextTheme)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('pp_theme') as Theme | null
    return stored || 'dark'
  })

  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme

  useEffect(() => {
    applyThemeToDOM(theme, resolvedTheme)
  }, [theme, resolvedTheme])

  useEffect(() => {
    if (theme !== 'system') return
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const nextResolved = getSystemTheme()
      applyThemeToDOM(theme, nextResolved)
    }
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [theme])

  const setTheme = (t: Theme, event?: ThemeEvent) => {
    const nextResolved = t === 'system' ? getSystemTheme() : t

    const doc = typeof window !== 'undefined' ? window.document : null
    if (!doc) {
      setThemeState(t)
      return
    }

    if (t === theme && nextResolved === resolvedTheme) {
      return
    }

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

    // Check if View Transition API is supported
    const isViewTransitionSupported =
      'startViewTransition' in doc &&
      typeof (doc as any).startViewTransition === 'function' &&
      !prefersReducedMotion

    if (!isViewTransitionSupported) {
      // Synchronized fallback: apply smooth transition class to all elements simultaneously
      const root = doc.documentElement
      root.classList.add('theme-transitioning')
      setThemeState(t)
      applyThemeToDOM(t, nextResolved)
      window.setTimeout(() => {
        root.classList.remove('theme-transitioning')
      }, 300)
      return
    }

    // 1. Get click coordinates, fallback to center of screen if triggered via keyboard
    let x = window.innerWidth / 2
    let y = window.innerHeight / 2

    if (event) {
      const clientX = 'clientX' in event && typeof event.clientX === 'number' ? event.clientX : undefined
      const clientY = 'clientY' in event && typeof event.clientY === 'number' ? event.clientY : undefined

      if (clientX !== undefined && clientY !== undefined && (clientX !== 0 || clientY !== 0)) {
        x = clientX
        y = clientY
      } else {
        const target = (('currentTarget' in event && event.currentTarget) ||
          ('target' in event && event.target)) as Element | null
        if (target && typeof target.getBoundingClientRect === 'function') {
          const rect = target.getBoundingClientRect()
          x = rect.left + rect.width / 2
          y = rect.top + rect.height / 2
        }
      }
    }

    // 2. Calculate distance to the farthest corner
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    )

    const root = doc.documentElement
    root.style.setProperty('--theme-x', `${Math.round(x)}px`)
    root.style.setProperty('--theme-y', `${Math.round(y)}px`)
    root.style.setProperty('--theme-r', `${Math.ceil(endRadius)}px`)

    // 3. Inject dynamic keyframe matching click coordinates with explicit duration & forwards fill
    const existingStyle = document.getElementById('theme-transition-styles')
    if (existingStyle) existingStyle.remove()

    const style = document.createElement('style')
    style.id = 'theme-transition-styles'
    style.textContent = `
      ::view-transition-new(root) {
        animation: circularReveal 450ms cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
      }
      @keyframes circularReveal {
        from {
          clip-path: circle(0px at ${Math.round(x)}px ${Math.round(y)}px);
        }
        to {
          clip-path: circle(${Math.ceil(endRadius)}px at ${Math.round(x)}px ${Math.round(y)}px);
        }
      }
    `
    document.head.appendChild(style)

    const opposite = nextResolved === 'dark' ? 'light' : 'dark'

    // 4. Trigger View Transition with lightweight DOM update inside callback
    try {
      const transition = (doc as any).startViewTransition(() => {
        root.classList.remove(opposite)
        root.classList.add(nextResolved)
        setThemeState(t)
      })

      // Clean up the dynamic style element once animation finishes or aborts
      transition?.finished
        ?.finally(() => {
          const injectedStyle = document.getElementById('theme-transition-styles')
          if (injectedStyle) injectedStyle.remove()
          root.style.removeProperty('--theme-x')
          root.style.removeProperty('--theme-y')
          root.style.removeProperty('--theme-r')
        })
        ?.catch(() => { })
    } catch {
      root.classList.remove(opposite)
      root.classList.add(nextResolved)
      setThemeState(t)
      const injectedStyle = document.getElementById('theme-transition-styles')
      if (injectedStyle) injectedStyle.remove()
      root.style.removeProperty('--theme-x')
      root.style.removeProperty('--theme-y')
      root.style.removeProperty('--theme-r')
    }

    localStorage.setItem('pp_theme', t)
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}
