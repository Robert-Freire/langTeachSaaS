import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Lesson } from '../../api/lessons'
import { formatDateShort } from '../../utils/formatDate'

interface NeedsPreparationProps {
  lessons: Lesson[]
}

export function NeedsPreparation({ lessons }: NeedsPreparationProps) {
  const now = new Date()
  const nextWeek = new Date(now)
  nextWeek.setDate(now.getDate() + 7)

  const needsPrep = lessons
    .filter(l => {
      if (l.status !== 'Draft' || !l.scheduledAt) return false
      const scheduled = new Date(l.scheduledAt)
      return scheduled >= now && scheduled <= nextWeek
    })
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())

  return (
    <Card className="bg-white border border-zinc-200" data-testid="needs-preparation">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-700">Needs Preparation</CardTitle>
      </CardHeader>
      <CardContent>
        {needsPrep.length === 0 ? (
          <p className="text-sm text-zinc-400" data-testid="needs-prep-empty">All caught up!</p>
        ) : (
          <div className="space-y-2">
            {needsPrep.map(lesson => (
              <Link
                key={lesson.id}
                to={`/lessons/${lesson.id}`}
                className="flex items-center justify-between p-2 rounded-lg border border-zinc-100 hover:bg-zinc-50 transition-colors"
                data-testid={`needs-prep-${lesson.id}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-800 truncate">{lesson.studentName ?? 'No student'}</span>
                    <Badge variant="outline" className="text-xs">{lesson.cefrLevel}</Badge>
                  </div>
                  <p className="text-xs text-zinc-500 truncate">{lesson.topic}</p>
                </div>
                <span className="text-xs text-zinc-400 shrink-0 ml-2">
                  {formatDateShort(lesson.scheduledAt!)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
