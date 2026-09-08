import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, WrenchScrewdriverIcon, ClockIcon } from '@heroicons/react/24/outline'

interface FeatureStatusPlaceholderProps {
  title: string
  description: string
  sprintNumber?: number
  icon?: ReactNode
  status?: 'under_development' | 'maintenance' | 'coming_soon'
}

export function FeatureStatusPlaceholder({
  title,
  description,
  sprintNumber,
  icon = <WrenchScrewdriverIcon className="h-8 w-8 text-primary" />,
  status = 'under_development',
}: FeatureStatusPlaceholderProps) {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-2xl mx-auto p-6 text-center">
      <Card className="border-border/60 bg-card/60 backdrop-blur-xl shadow-xl w-full p-8 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-chart-2/10 rounded-full blur-2xl pointer-events-none" />

        <CardContent className="flex flex-col items-center p-0 space-y-4">
          <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 shadow-inner">
            {icon}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">{title}</h2>
              {sprintNumber && (
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                  Sprint {sprintNumber}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">{description}</p>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground/80 bg-muted/40 px-3 py-1.5 rounded-full border border-border/50">
            <ClockIcon className="h-4 w-4 text-amber-500" />
            <span>
              {status === 'maintenance'
                ? 'Temporarily down for scheduled maintenance'
                : 'Scheduled on the active 22-Sprint roadmap'}
            </span>
          </div>

          <div className="pt-4 flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeftIcon className="mr-2 h-4 w-4" /> Go to Dashboard
            </Button>
            <Button size="sm" onClick={() => navigate('/contacts')}>
              Go to Contacts
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
