import { cn } from '@/lib/utils'

export type StatusBadgeVariant = 'active' | 'inactive' | 'private' | 'corporate'

const VARIANT_CLASSES: Record<StatusBadgeVariant, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-zinc-100 text-zinc-500',
  private: 'bg-indigo-100 text-indigo-700',
  corporate: 'bg-indigo-100 text-indigo-700',
}

const VARIANT_LABELS: Record<StatusBadgeVariant, string> = {
  active: 'Active',
  inactive: 'Inactive',
  private: 'Private',
  corporate: 'Corporate',
}

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant: StatusBadgeVariant
}

export function StatusBadge({ variant, className, ...rest }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-[0.05em]',
        VARIANT_CLASSES[variant],
        className
      )}
      {...rest}
    >
      {VARIANT_LABELS[variant]}
    </span>
  )
}
