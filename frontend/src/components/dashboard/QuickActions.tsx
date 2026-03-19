import { Link } from 'react-router-dom'
import { Plus, Users, BookOpen, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface QuickActionsProps {
  studentCount: number | string
  weekLessonCount: number
  totalLessonCount: number | string
}

export function QuickActions({ studentCount, weekLessonCount, totalLessonCount }: QuickActionsProps) {
  return (
    <Card className="bg-white border border-zinc-200" data-testid="quick-actions">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-700">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Link to="/lessons/new">
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" data-testid="new-lesson-btn">
              <Plus className="h-4 w-4 mr-1.5" />
              New Lesson
            </Button>
          </Link>
          <Link to="/students/new">
            <Button
              variant="outline"
              className="w-full border-indigo-600 text-indigo-600 hover:bg-indigo-100"
              data-testid="new-student-btn"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              New Student
            </Button>
          </Link>
        </div>

        <div className="border-t border-zinc-100 pt-4">
          <div className="space-y-2">
            <Link
              to="/students"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 outline-none transition-colors"
              data-testid="stat-link-students"
            >
              <Users className="h-4 w-4 text-indigo-500 shrink-0" />
              <span className="text-sm text-zinc-700">
                <span className="font-semibold text-zinc-900" data-testid="stat-students">{studentCount}</span> Students
              </span>
            </Link>
            <Link
              to="/lessons"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 outline-none transition-colors"
              data-testid="stat-link-week"
            >
              <CalendarDays className="h-4 w-4 text-indigo-500 shrink-0" />
              <span className="text-sm text-zinc-700">
                <span className="font-semibold text-zinc-900" data-testid="stat-week-lessons">{weekLessonCount}</span> This Week
              </span>
            </Link>
            <Link
              to="/lessons"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 outline-none transition-colors"
              data-testid="stat-link-total"
            >
              <BookOpen className="h-4 w-4 text-indigo-500 shrink-0" />
              <span className="text-sm text-zinc-700">
                <span className="font-semibold text-zinc-900" data-testid="stat-total-lessons">{totalLessonCount}</span> Total
              </span>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
