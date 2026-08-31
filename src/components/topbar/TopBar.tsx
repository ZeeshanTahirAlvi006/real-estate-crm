import { BellIcon, SunIcon, MoonIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useTheme } from '@/providers/ThemeProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useGetNotificationsQuery } from '@/store/api/settingsApi'
import { NotificationDropdown } from './NotificationDropdown'
import { useState } from 'react'

export function TopBar() {
  const { resolvedTheme, setTheme } = useTheme()
  const { data: notifications } = useGetNotificationsQuery()
  const [showNotifications, setShowNotifications] = useState(false)

  const notifList = Array.isArray(notifications) ? notifications : []
  const unreadCount = notifList.filter((n) => !n.isRead).length

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-sm">
      {/* Search */}
      <div className="relative w-full max-w-sm">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search contacts, deals..."
          className="h-9 pl-9 bg-muted/50 border-0 focus-visible:ring-1"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-9 w-9 text-muted-foreground hover:text-foreground"
        >
          {resolvedTheme === 'dark' ? (
            <SunIcon className="h-5 w-5" />
          ) : (
            <MoonIcon className="h-5 w-5" />
          )}
        </Button>

        {/* Notifications */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowNotifications(!showNotifications)}
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
          >
            <BellIcon className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </Button>
          {showNotifications && (
            <NotificationDropdown
              notifications={notifList}
              onClose={() => setShowNotifications(false)}
            />
          )}
        </div>
      </div>
    </header>
  )
}
