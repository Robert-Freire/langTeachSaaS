import { Card, CardContent } from '@/components/ui/card'
import type { SessionMappingResult } from '../api/curricula'

interface SessionMappingPreviewProps {
  mapping: SessionMappingResult
}

const STRATEGY_LABEL: Record<string, string> = {
  exact: '1 session per template unit',
  expand: 'Units spread across sessions for deeper practice',
  compress: 'Partial coverage — limited by session count',
}

export function SessionMappingPreview({ mapping }: SessionMappingPreviewProps) {
  const label = STRATEGY_LABEL[mapping.strategy] ?? mapping.strategy

  // Group sessions by unit for expand strategy to show rationale once per group
  const sessionsByUnit = mapping.sessions.reduce<Record<string, typeof mapping.sessions>>((acc, s) => {
    if (!acc[s.unitRef]) acc[s.unitRef] = []
    acc[s.unitRef].push(s)
    return acc
  }, {})

  return (
    <Card
      className="border-blue-100 bg-blue-50"
      data-testid="session-mapping-preview"
    >
      <CardContent className="p-3 space-y-2">
        <p className="text-xs font-medium text-blue-700">{label}</p>

        <ul className="space-y-0.5">
          {mapping.sessions.map(s => (
            <li key={s.sessionIndex} className="text-xs text-zinc-600 flex gap-2">
              <span className="text-zinc-400 shrink-0 w-16">Session {s.sessionIndex}</span>
              <span>{s.subFocus}</span>
            </li>
          ))}
        </ul>

        {mapping.strategy === 'expand' && (
          <div className="space-y-1 pt-1 border-t border-blue-100">
            {Object.entries(sessionsByUnit).map(([unitRef, sessions]) => {
              if (sessions.length <= 1) return null
              return (
                <p key={unitRef} className="text-xs text-zinc-500 italic">
                  {sessions[0].rationale}
                </p>
              )
            })}
          </div>
        )}

        {mapping.excludedUnits.length > 0 && (
          <div className="rounded bg-amber-50 border border-amber-200 px-2 py-1.5 text-xs text-amber-800" data-testid="excluded-units">
            <span className="font-medium">Not covered: </span>
            {mapping.excludedUnits.join(', ')}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
