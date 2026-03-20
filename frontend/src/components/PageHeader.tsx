import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  backTo?: string
  backLabel?: string
  title: string
  titleTestId?: string
  subtitle?: string
  actions?: ReactNode
}

export function PageHeader({ backTo, backLabel, title, titleTestId, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="space-y-1">
      {backTo && (
        <Link
          to={backTo}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors mb-1"
          data-testid="page-header-back"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
      )}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-zinc-900" data-testid={titleTestId}>{title}</h1>
          {subtitle && <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
      </div>
    </div>
  )
}
