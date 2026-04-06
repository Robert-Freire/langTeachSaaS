import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, Minus, CalendarDays, BookOpen, Target, Clock } from 'lucide-react'
import { getProgress, type PacingStatus, type TimelineEntry, type DifficultyProgress } from '@/api/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface Props {
  studentId: string
}

function PacingChip({ status }: { status: PacingStatus }) {
  const config: Record<PacingStatus, { label: string; className: string }> = {
    'on-track': { label: 'On track',  className: 'bg-green-100 text-green-800 border-green-200' },
    'ahead':    { label: 'Ahead',     className: 'bg-blue-100 text-blue-800 border-blue-200' },
    'behind':   { label: 'Behind',    className: 'bg-amber-100 text-amber-800 border-amber-200' },
    'unknown':  { label: 'No data',   className: 'bg-zinc-100 text-zinc-500 border-zinc-200' },
  }
  const { label, className } = config[status]
  return (
    <Badge variant="outline" className={`text-xs font-medium ${className}`} data-testid="pacing-status">
      {label}
    </Badge>
  )
}

function TrendIcon({ trend }: { trend: DifficultyProgress['trend'] }) {
  if (trend === 'improving') return <TrendingUp className="h-3.5 w-3.5 text-green-500" />
  if (trend === 'worsening') return <TrendingDown className="h-3.5 w-3.5 text-red-500" />
  return <Minus className="h-3.5 w-3.5 text-zinc-400" />
}

function StatusDot({ status }: { status: TimelineEntry['status'] }) {
  const color =
    status === 'taught'  ? 'bg-green-500' :
    status === 'created' ? 'bg-blue-400'  :
    'bg-zinc-300'
  return <span className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${color}`} />
}

export function ProgressDashboard({ studentId }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['progress', studentId],
    queryFn: () => getProgress(studentId),
  })

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="progress-loading">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <p className="text-sm text-zinc-500 py-8 text-center">Could not load progress data.</p>
    )
  }

  if (!data.courseId) {
    return (
      <div className="py-12 text-center space-y-2" data-testid="progress-no-course">
        <BookOpen className="h-8 w-8 text-zinc-300 mx-auto" />
        <p className="text-sm text-zinc-500">No active course found for this student.</p>
        <p className="text-xs text-zinc-400">Create a course to track curriculum coverage and pacing.</p>
      </div>
    )
  }

  const coveragePercent = data.totalEntries > 0 ? Math.round((data.taughtEntries / data.totalEntries) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Coverage */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-indigo-500" />
            Curriculum Coverage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-600">
              {data.taughtEntries} of {data.totalEntries} topics taught
            </span>
            <span className="font-semibold text-zinc-900">{coveragePercent}%</span>
          </div>
          <div
            className="h-2.5 w-full rounded-full bg-zinc-100 overflow-hidden"
            data-testid="coverage-bar"
            aria-label={`Coverage: ${coveragePercent}%`}
          >
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${coveragePercent}%` }}
            />
          </div>
          <div className="flex gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
              {data.taughtEntries} taught
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-blue-400" />
              {data.createdEntries} in progress
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-zinc-300" />
              {data.plannedEntries} planned
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Pacing */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-500" />
            Pacing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <PacingChip status={data.pacingStatus} />
            <span className="text-sm text-zinc-600">
              {data.sessionsDone} session{data.sessionsDone !== 1 ? 's' : ''} done
              {data.plannedSessionCount != null && ` of ${data.plannedSessionCount} planned`}
            </span>
            {data.sessionsRemaining != null && (
              <span className="text-sm text-zinc-500">
                {data.sessionsRemaining} remaining
              </span>
            )}
            {data.daysUntilExam != null && (
              <span className="flex items-center gap-1 text-sm text-zinc-500">
                <CalendarDays className="h-3.5 w-3.5" />
                {data.daysUntilExam > 0
                  ? `${data.daysUntilExam} days until exam`
                  : 'Exam date passed'}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Difficulty Trends */}
      {data.difficulties.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-500" />
              Difficulty Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5" data-testid="difficulty-trends">
              {data.difficulties.map((d) => (
                <li
                  key={d.id}
                  className={`flex items-center gap-2 text-sm ${d.status === 'Covered' ? 'text-zinc-400' : 'text-zinc-700'}`}
                >
                  <TrendIcon trend={d.trend} />
                  <span className={d.status === 'Covered' ? 'line-through' : ''}>
                    {d.description}
                  </span>
                  <span className="text-xs text-zinc-400">({d.competency})</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-indigo-500" />
            Session Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.timeline.length === 0 ? (
            <p className="text-sm text-zinc-400 italic">No curriculum entries yet.</p>
          ) : (
            <ol className="space-y-2" data-testid="progress-timeline">
              {data.timeline.map((entry) => (
                <li key={entry.orderIndex} className="flex items-start gap-2.5">
                  <StatusDot status={entry.status} />
                  <div className="min-w-0">
                    <p className={`text-sm leading-snug ${entry.status === 'planned' ? 'text-zinc-500' : 'text-zinc-800'}`}>
                      {entry.topic}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {entry.grammarFocus && `${entry.grammarFocus} · `}
                      {entry.sessionDate
                        ? new Date(entry.sessionDate).toLocaleDateString()
                        : entry.status === 'created'
                          ? 'Lesson created'
                          : 'Planned'}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
