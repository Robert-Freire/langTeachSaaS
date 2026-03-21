import { Link } from 'react-router-dom'
import { GraduationCap, PlusCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CourseSummary } from '../../api/courses'

const MAX_VISIBLE = 3

interface CoursesOverviewProps {
  courses: CourseSummary[]
}

export function CoursesOverview({ courses }: CoursesOverviewProps) {
  const visible = courses.slice(0, MAX_VISIBLE)
  const hasMore = courses.length > MAX_VISIBLE

  return (
    <Card className="bg-white border border-zinc-200" data-testid="courses-overview">
      <CardHeader className="py-3 px-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-zinc-700 flex items-center gap-1.5">
            <GraduationCap className="h-4 w-4 text-zinc-400" />
            Courses ({courses.length})
          </CardTitle>
          <Link
            to="/courses/new"
            data-testid="dashboard-new-course-btn"
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-1 text-xs h-7')}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            New
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {courses.length === 0 ? (
          <p className="text-xs text-zinc-400 py-2">No courses yet.</p>
        ) : (
          <div className="space-y-2">
            {visible.map(course => (
              <Link
                key={course.id}
                to={`/courses/${course.id}`}
                data-testid={`dashboard-course-${course.id}`}
                className="flex items-center gap-3 p-2 rounded-lg border border-zinc-100 hover:bg-zinc-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 truncate">{course.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-24 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${course.sessionCount > 0 ? (course.lessonsCreated / course.sessionCount) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-zinc-400">
                      {course.lessonsCreated}/{course.sessionCount}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
            {hasMore && (
              <Link
                to="/courses"
                className="block text-center text-xs text-indigo-600 hover:text-indigo-700 py-1"
                data-testid="view-all-courses"
              >
                View all {courses.length} courses
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
