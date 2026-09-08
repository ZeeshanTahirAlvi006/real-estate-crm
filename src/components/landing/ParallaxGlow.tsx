import { theme } from '@/theme'

export function ParallaxGlow() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Plain Solid Background from theme.ts */}
      <div className={`absolute inset-0 ${theme.classes.pageBg} transition-colors duration-300`} />
    </div>
  )
}
