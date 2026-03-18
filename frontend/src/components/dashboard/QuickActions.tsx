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
        <Link to="/lessons/new">
          <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" data-testid="new-lesson-btn">
            <Plus className="h-4 w-4 mr-1.5" />
            New Lesson
          </Button>
        </Link>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-zinc-100 border-l-2 border-l-indigo-400 bg-indigo-50/50 p-2">
            <Users className="h-4 w-4 text-indigo-500 mx-auto mb-1" />
            <p className="text-lg font-semibold text-zinc-900" data-testid="stat-students">{studentCount}</p>
            <p className="text-[10px] text-zinc-400">Students</p>
          </div>
          <div className="rounded-lg border border-zinc-100 border-l-2 border-l-indigo-400 bg-indigo-50/50 p-2">
            <CalendarDays className="h-4 w-4 text-indigo-500 mx-auto mb-1" />
            <p className="text-lg font-semibold text-zinc-900" data-testid="stat-week-lessons">{weekLessonCount}</p>
            <p className="text-[10px] text-zinc-400">This Week</p>
          </div>
          <div className="rounded-lg border border-zinc-100 border-l-2 border-l-indigo-400 bg-indigo-50/50 p-2">
            <BookOpen className="h-4 w-4 text-indigo-500 mx-auto mb-1" />
            <p className="text-lg font-semibold text-zinc-900" data-testid="stat-total-lessons">{totalLessonCount}</p>
            <p className="text-[10px] text-zinc-400">Total</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
