import { useProfile } from '../hooks/useProfile'
import { cn } from '@/lib/utils'

export function UsageIndicator() {
  const { data: profile } = useProfile()

  if (!profile) return null

  const { generationsUsedThisMonth: used, generationsMonthlyLimit: limit, subscriptionTier: tier } = profile

  if (tier === 'Pro' || limit < 0) {
    return (
      <div className="px-3 py-2" data-testid="usage-indicator">
        <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
          Pro
        </span>
      </div>
    )
  }

  const ratio = limit > 0 ? used / limit : 0
  const exhausted = used >= limit
  const warning = ratio >= 0.8 && !exhausted

  return (
    <div className="px-3 py-2 space-y-1.5" data-testid="usage-indicator">
      <div className="flex items-center justify-between text-xs">
        <span className={cn(
          'font-medium',
          exhausted ? 'text-red-600' : warning ? 'text-amber-600' : 'text-muted-foreground'
        )}>
          {used} / {limit} generations
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            exhausted ? 'bg-red-500' : warning ? 'bg-amber-400' : 'bg-indigo-500'
          )}
          style={{ width: `${Math.min(ratio * 100, 100)}%` }}
          data-testid="usage-progress-bar"
        />
      </div>
      {exhausted && (
        <p className="text-xs text-red-600" data-testid="usage-exhausted-msg">
          Limit reached. Upgrade for more generations.
        </p>
      )}
    </div>
  )
}
