import { cn } from '@/lib/utils'

interface CefrBadgeProps {
  level: string
  className?: string
}

function cefrColors(level: string): string {
  const prefix = level[0]?.toUpperCase()
  if (prefix === 'A') return 'bg-[#DDE8F5] text-[#1A4B7A]'
  if (prefix === 'B') return 'bg-[#ECEAFD] text-[#3525CD]'
  if (prefix === 'C') return 'bg-[#F8E9D6] text-[#7E3000]'
  return 'bg-zinc-100 text-zinc-700'
}

export function CefrBadge({ level, className }: CefrBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-[0.6875rem] font-bold uppercase tracking-[0.05em] font-inter',
        cefrColors(level),
        className,
      )}
    >
      {level}
    </span>
  )
}
