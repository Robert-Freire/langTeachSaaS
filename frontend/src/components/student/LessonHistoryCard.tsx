import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getLessonHistory } from '../../api/students'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface LessonHistoryCardProps {
  studentId: string
}

const NOTE_LABELS: { key: 'whatWasCovered' | 'homeworkAssigned' | 'areasToImprove' | 'nextLessonIdeas'; label: string }[] = [
  { key: 'whatWasCovered', label: 'Covered' },
  { key: 'homeworkAssigned', label: 'Homework' },
  { key: 'areasToImprove', label: 'Improve' },
  { key: 'nextLessonIdeas', label: 'Next ideas' },
]

export function LessonHistoryCard({ studentId }: LessonHistoryCardProps) {
  const { data: entries, isLoading } = useQuery({
    queryKey: ['lessonHistory', studentId],
    queryFn: () => getLessonHistory(studentId),
  })

  return (
    <Card data-testid="lesson-history-card">
      <CardHeader>
        <CardTitle className="text-base">Lesson History</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-zinc-400">Loading...</p>}
        {!isLoading && (!entries || entries.length === 0) && (
          <p className="text-sm text-zinc-400" data-testid="lesson-history-empty">No lesson notes yet.</p>
        )}
        {entries && entries.length > 0 && (
          <div className="space-y-4">
            {entries.map((entry) => (
              <div key={entry.lessonId} className="border border-zinc-100 rounded-lg p-3 space-y-2" data-testid="lesson-history-entry">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    to={`/lessons/${entry.lessonId}`}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                    data-testid="lesson-history-title"
                  >
                    {entry.title}
                  </Link>
                  {entry.templateName && (
                    <Badge variant="outline" className="text-xs">{entry.templateName}</Badge>
                  )}
                  <span className="text-xs text-zinc-400">
                    {new Date(entry.lessonDate).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <div className="space-y-1">
                  {NOTE_LABELS.map(({ key, label }) =>
                    entry[key] ? (
                      <p key={key} className="text-xs text-zinc-600">
                        <span className="font-medium text-zinc-700">{label}:</span> {entry[key]}
                      </p>
                    ) : null
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
