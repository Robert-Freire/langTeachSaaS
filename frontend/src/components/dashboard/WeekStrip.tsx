import { useNavigate } from 'react-router-dom'
import { useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { getCefrBadgeClasses } from '@/lib/cefr-colors'
import { Button } from '@/components/ui/button'
import type { Lesson } from '../../api/lessons'
import type { Student } from '../../api/students'
import { getWeekDays, formatWeekDay, isToday, formatWeekRange } from '../../lib/weekUtils'
import { SchedulePopover } from './SchedulePopover'

interface WeekStripProps {
  weekOffset: number
  onPrev: () => void
  onNext: () => void
  lessons: Lesson[]
  students: Student[]
  unscheduledDrafts: Lesson[]
}

export function WeekStrip({ weekOffset, onPrev, onNext, lessons, students, unscheduledDrafts }: WeekStripProps) {
  const navigate = useNavigate()
  const days = getWeekDays(weekOffset)
  const dayRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const weekDays = getWeekDays(weekOffset)
    const todayIdx = weekDays.findIndex(d => isToday(d))
    if (todayIdx >= 0) {
      dayRefs.current[todayIdx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [weekOffset])

  const lessonsByDay: Record<number, Lesson[]> = {}
  for (const lesson of lessons) {
    if (!lesson.scheduledAt) continue
    const date = new Date(lesson.scheduledAt)
    const dayIdx = days.findIndex(d =>
      d.getFullYear() === date.getFullYear() &&
      d.getMonth() === date.getMonth() &&
      d.getDate() === date.getDate()
    )
    if (dayIdx < 0) continue
    if (!lessonsByDay[dayIdx]) lessonsByDay[dayIdx] = []
    lessonsByDay[dayIdx].push(lesson)
  }

  return (
    <div data-testid="week-strip">
      <div className="flex items-center justify-between mb-3">
        <Button variant="ghost" size="icon" onClick={onPrev} aria-label="Previous week" data-testid="week-prev">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-zinc-700" data-testid="week-range">
          {formatWeekRange(weekOffset)}
        </span>
        <Button variant="ghost" size="icon" onClick={onNext} aria-label="Next week" data-testid="week-next">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex overflow-x-auto snap-x snap-mandatory pb-2 gap-1 md:grid md:grid-cols-7 md:overflow-visible md:snap-none md:pb-0">
        {days.map((day, idx) => {
          const dayLessons = lessonsByDay[idx] ?? []
          const today = isToday(day)
          return (
            <div
              key={idx}
              ref={(el) => { dayRefs.current[idx] = el }}
              className={`min-w-[120px] shrink-0 snap-start md:min-w-0 md:shrink min-h-[100px] rounded-lg border p-2 ${
                today ? 'bg-indigo-50 border-indigo-200 border-t-2 border-t-indigo-500' : 'bg-white border-zinc-200'
              }`}
              data-testid={`week-day-${idx}`}
            >
              <div className={`text-xs font-medium mb-1 flex items-center justify-between ${today ? 'text-indigo-700' : 'text-zinc-500'}`}>
                <span>{formatWeekDay(day)}</span>
                <SchedulePopover date={day} students={students} unscheduledDrafts={unscheduledDrafts} />
              </div>
              <div className="space-y-1">
                {dayLessons.map(lesson => (
                  <button
                    key={lesson.id}
                    onClick={() => navigate(`/lessons/${lesson.id}`)}
                    className={`w-full text-left rounded px-1.5 py-1 text-xs border transition-colors hover:shadow-sm ${
                      lesson.status === 'Published'
                        ? 'border-green-300 bg-green-50 hover:bg-green-100'
                        : 'border-amber-300 bg-amber-50 hover:bg-amber-100'
                    }`}
                    data-testid={`lesson-pill-${lesson.id}`}
                  >
                    <div className="font-medium truncate">{lesson.studentName ?? 'No student'}</div>
                    <Badge variant="outline" className={`text-[10px] px-1 py-0 mt-0.5 ${getCefrBadgeClasses(lesson.cefrLevel)}`}>{lesson.cefrLevel}</Badge>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
