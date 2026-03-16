import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Lesson } from '../../api/lessons'

interface UnscheduledDraftsProps {
  lessons: Lesson[]
}

export function UnscheduledDrafts({ lessons }: UnscheduledDraftsProps) {
  const unscheduled = lessons.filter(l => l.status === 'Draft' && !l.scheduledAt)
  const [expanded, setExpanded] = useState(false)

  // Auto-expand when unscheduled drafts first appear
  useEffect(() => {
    if (unscheduled.length > 0) setExpanded(true)
  }, [unscheduled.length])

  if (unscheduled.length === 0) return null

  return (
    <Card className="bg-white border border-zinc-200" data-testid="unscheduled-drafts">
      <CardHeader
        className="py-3 px-6 cursor-pointer"
        onClick={() => setExpanded(v => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setExpanded(v => !v)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-zinc-700">
            Unscheduled Drafts ({unscheduled.length})
          </CardTitle>
          {expanded ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0">
          <div className="space-y-2">
            {unscheduled.map(lesson => (
              <Link
                key={lesson.id}
                to={`/lessons/${lesson.id}`}
                className="flex items-center justify-between p-2 rounded-lg border border-zinc-100 hover:bg-zinc-50 transition-colors"
                data-testid={`unscheduled-${lesson.id}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-800 truncate">{lesson.title}</span>
                    <Badge variant="outline" className="text-xs">{lesson.cefrLevel}</Badge>
                  </div>
                  <p className="text-xs text-zinc-500">{lesson.studentName ?? 'No student'}</p>
                </div>
                <span className="text-xs text-indigo-600 shrink-0 ml-2">Open</span>
              </Link>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
