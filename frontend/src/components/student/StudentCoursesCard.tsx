import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getCourses } from '../../api/courses'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface StudentCoursesCardProps {
  studentId: string
}

const MODE_LABELS: Record<string, string> = {
  general: 'General',
  'exam-prep': 'Exam Prep',
}

export function StudentCoursesCard({ studentId }: StudentCoursesCardProps) {
  const navigate = useNavigate()

  const { data: courses, isLoading } = useQuery({
    queryKey: ['studentCourses', studentId],
    queryFn: async () => {
      const all = await getCourses()
      return all.filter(c => c.studentId === studentId)
    },
  })

  return (
    <Card data-testid="student-courses-card">
      <CardHeader>
        <CardTitle className="text-base">Courses</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="border border-zinc-100 rounded-lg p-3 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        )}
        {!isLoading && (courses?.length ?? 0) === 0 && (
          <div className="space-y-3" data-testid="student-courses-empty">
            <p className="text-sm text-zinc-400">No courses yet. Create one from the student&apos;s profile.</p>
            <Button
              size="sm"
              variant="outline"
              data-testid="student-courses-create-btn"
              onClick={() => navigate(`/courses/new?studentId=${studentId}`)}
            >
              Create Course
            </Button>
          </div>
        )}
        {!isLoading && (courses?.length ?? 0) > 0 && (
          <div className="space-y-3" data-testid="student-courses-list">
            {courses!.map(course => (
              <div
                key={course.id}
                className="flex items-center justify-between rounded-lg border border-zinc-100 p-3 cursor-pointer hover:bg-zinc-50 transition-colors"
                data-testid={`student-course-row-${course.id}`}
                onClick={() => navigate(`/courses/${course.id}`)}
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium text-zinc-900 truncate">{course.name}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs text-zinc-500">
                      {MODE_LABELS[course.mode] ?? course.mode}
                    </Badge>
                    <span className="text-xs text-zinc-400">
                      {course.lessonsCreated}/{course.sessionCount} sessions
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
