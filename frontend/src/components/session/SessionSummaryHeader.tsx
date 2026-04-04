import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ChevronDown, ChevronUp, ListChecks } from 'lucide-react'
import { getSessionSummary } from '../../api/sessionLogs'
import { formatDate, relativeTime } from '../../utils/formatDate'
import { Skeleton } from '@/components/ui/skeleton'

function titleCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

interface SessionSummaryHeaderProps {
  studentId: string
}

export function SessionSummaryHeader({ studentId }: SessionSummaryHeaderProps) {
  const [actionItemsOpen, setActionItemsOpen] = useState(false)
  const [reassessmentOpen, setReassessmentOpen] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['session-summary', studentId],
    queryFn: () => getSessionSummary(studentId),
  })

  if (isLoading) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-4 space-y-2" data-testid="session-summary-loading">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    )
  }

  if (isError) return null

  if (!data) return null

  if (data.totalSessions === 0) {
    return (
      <div
        className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-400"
        data-testid="session-summary-no-sessions"
      >
        No sessions yet
      </div>
    )
  }

  const hasActionItems = data.openActionItems.length > 0
  const skillEntries = Object.entries(data.skillLevelOverrides)

  return (
    <div
      className="rounded-lg border border-zinc-200 bg-white divide-y divide-zinc-100"
      data-testid="session-summary-header"
    >
      {/* Stats row */}
      <div className="flex items-center gap-4 px-4 py-3 text-sm text-zinc-700">
        <span className="font-medium">{data.totalSessions} {data.totalSessions === 1 ? 'session' : 'sessions'}</span>
        {data.lastSessionDate && (
          <span className="text-zinc-500">
            Last: {formatDate(data.lastSessionDate)}
            <span className="text-zinc-400 ml-1">({relativeTime(data.lastSessionDate)})</span>
          </span>
        )}
      </div>

      {/* Badges row */}
      {(hasActionItems || data.levelReassessmentPending) && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
          {hasActionItems && (
            <div>
              <button
                onClick={() => setActionItemsOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition-colors"
                data-testid="session-summary-action-items-toggle"
                aria-expanded={actionItemsOpen}
              >
                <ListChecks className="h-3.5 w-3.5 text-zinc-500" />
                {data.openActionItems.length} action {data.openActionItems.length === 1 ? 'item' : 'items'}
                {actionItemsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              {actionItemsOpen && (
                <ul
                  className="mt-2 ml-1 space-y-1"
                  data-testid="session-summary-action-items-list"
                >
                  {data.openActionItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-700">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {data.levelReassessmentPending && (
            <div>
              <button
                onClick={() => setReassessmentOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
                data-testid="session-summary-reassessment-badge"
                aria-expanded={reassessmentOpen}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Level reassessment flagged
                {reassessmentOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              {reassessmentOpen && skillEntries.length > 0 && (
                <ul
                  className="mt-2 ml-1 space-y-1"
                  data-testid="session-summary-reassessment-details"
                >
                  {skillEntries.map(([skill, level]) => (
                    <li key={skill} className="text-xs text-zinc-700">
                      <span className="font-medium">{titleCase(skill)}:</span> {level}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
