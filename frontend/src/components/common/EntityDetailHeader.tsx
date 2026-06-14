import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

interface EntityDetailHeaderProps {
  backTo: string
  backLabel?: string
  avatar: ReactNode
  title: string
  titleTestId?: string
  cefrBadge?: ReactNode
  subtitle?: string
  badges?: ReactNode
  meta?: ReactNode
  actions: ReactNode
  'data-testid'?: string
}

export function EntityDetailHeader({
  backTo,
  backLabel = 'Back',
  avatar,
  title,
  titleTestId,
  cefrBadge,
  subtitle,
  badges,
  meta,
  actions,
  'data-testid': testId,
}: EntityDetailHeaderProps) {
  return (
    <div
      className="bg-white rounded-2xl p-5 lg:p-6 shadow-card"
      data-testid={testId}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4 min-w-0">
          <Link
            to={backTo}
            className="text-zinc-400 hover:text-zinc-600 transition-colors shrink-0 mt-1"
            aria-label={backLabel}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          {avatar}

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-manrope text-[1.75rem] font-bold text-foreground leading-tight truncate" data-testid={titleTestId}>
                {title}
              </h1>
              {cefrBadge}
            </div>

            {subtitle && (
              <p className="text-sm text-zinc-500 mt-0.5 truncate">
                {subtitle}
              </p>
            )}

            {badges && (
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {badges}
              </div>
            )}

            {meta}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 md:self-start">
          {actions}
        </div>
      </div>
    </div>
  )
}
