import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCefrBadgeClasses } from '@/lib/cefr-colors'
import type { Lesson } from '../../api/lessons'

const COLLAPSED_LIMIT = 5

interface UnscheduledDraftsProps {
  lessons: Lesson[]
}

export function UnscheduledDrafts({ lessons }: UnscheduledDraftsProps) {
  const unscheduled = lessons.filter(l => !l.scheduledAt)
  const [expanded, setExpanded] = useState(false)
  const [showAll, setShowAll] = useState(false)

  // Auto-expand when unscheduled drafts first appear (sync with derived data)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (unscheduled.length > 0) setExpanded(true) }, [unscheduled.length])

  if (unscheduled.length === 0) return null

  const visibleItems = showAll ? unscheduled : unscheduled.slice(0, COLLAPSED_LIMIT)
  const hasMore = unscheduled.length > COLLAPSED_LIMIT

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
            Unscheduled Lessons ({unscheduled.length})
          </CardTitle>
          {expanded ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0">
          <div className="space-y-2">
            {visibleItems.map(lesson => (
              <Link
                key={lesson.id}
                to={`/lessons/${lesson.id}`}
                className="flex items-center justify-between p-2 rounded-lg border border-zinc-100 hover:bg-zinc-50 transition-colors"
                data-testid={`unscheduled-${lesson.id}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-800 truncate">{lesson.title}</span>
                    <Badge variant="outline" className={`text-xs ${getCefrBadgeClasses(lesson.cefrLevel)}`}>{lesson.cefrLevel}</Badge>
                    {lesson.status === 'Published' && (
                      <Badge variant="outline" className="text-xs text-green-700 border-green-300">Published</Badge>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">{lesson.studentName ?? 'No student'}</p>
                </div>
              </Link>
            ))}
            {hasMore && !showAll && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); setShowAll(true) }}
                className="w-full text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                data-testid="show-all-drafts"
              >
                Show all ({unscheduled.length})
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
