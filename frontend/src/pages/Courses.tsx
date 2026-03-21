import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { GraduationCap, PlusCircle, Trash2 } from 'lucide-react'
import { getCourses, deleteCourse } from '../api/courses'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const MODE_LABELS: Record<string, string> = {
  general: 'General',
  'exam-prep': 'Exam Prep',
}

export default function Courses() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: courses, isLoading, isError } = useQuery({
    queryKey: ['courses'],
    queryFn: getCourses,
  })

  const { mutate: doDelete } = useMutation({
    mutationFn: (id: string) => deleteCourse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      setDeleteId(null)
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Courses"
        titleTestId="courses-page-title"
        subtitle="Plan and manage your multi-session curricula."
        actions={
          <Link
            to="/courses/new"
            data-testid="new-course-btn"
            className={cn(buttonVariants(), 'gap-1.5')}
          >
            <PlusCircle className="h-4 w-4" />
            New Course
          </Link>
        }
      />

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      )}

      {isError && (
        <p className="text-sm text-red-500">Failed to load courses.</p>
      )}

      {!isLoading && !isError && courses?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-zinc-400">
          <GraduationCap className="h-10 w-10" />
          <div className="text-center">
            <p className="font-medium text-zinc-600">No courses yet</p>
            <p className="text-sm">Create your first course to plan a curriculum.</p>
          </div>
          <Button onClick={() => navigate('/courses/new')} data-testid="empty-new-course-btn">
            New Course
          </Button>
        </div>
      )}

      {!isLoading && !isError && (courses?.length ?? 0) > 0 && (
        <div className="space-y-3" data-testid="courses-list">
          {courses!.map(course => (
            <div
              key={course.id}
              data-testid={`course-card-${course.id}`}
              className="flex items-center gap-4 rounded-lg border border-zinc-200 bg-white p-4 hover:border-zinc-300 transition-colors"
            >
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/courses/${course.id}`)}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-zinc-900">{course.name}</span>
                  <Badge variant="outline" className="text-xs text-zinc-500">
                    {MODE_LABELS[course.mode] ?? course.mode}
                  </Badge>
                  {(course.targetCefrLevel ?? course.targetExam) && (
                    <Badge variant="outline" className="text-xs">
                      {course.targetCefrLevel ?? course.targetExam}
                    </Badge>
                  )}
                  {course.studentName && (
                    <span className="text-xs text-zinc-400">{course.studentName}</span>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="w-32 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${course.sessionCount > 0 ? (course.lessonsCreated / course.sessionCount) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-400">
                    {course.lessonsCreated}/{course.sessionCount} sessions
                  </span>
                </div>
              </div>
              <button
                type="button"
                data-testid={`delete-course-${course.id}`}
                onClick={() => setDeleteId(course.id)}
                className="p-1.5 rounded text-zinc-300 hover:text-red-500 transition-colors"
                aria-label="Delete course"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete course?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the course and its curriculum plan. Lessons already generated from this course will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="confirm-delete-course"
              onClick={() => deleteId && doDelete(deleteId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
