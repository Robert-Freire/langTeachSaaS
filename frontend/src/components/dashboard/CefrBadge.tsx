import { cn } from '@/lib/utils'
import { cefrColors } from '@/lib/cefr-colors'

interface CefrBadgeProps {
  level: string
  className?: string
  'data-testid'?: string
}

export function CefrBadge({ level, className, 'data-testid': dataTestId }: CefrBadgeProps) {
  return (
    <span
      data-testid={dataTestId}
      className={cn(
        'inline-flex items-center justify-center rounded-md px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-[0.05em] font-inter',
        cefrColors(level),
        className,
      )}
    >
      {level}
    </span>
  )
}
