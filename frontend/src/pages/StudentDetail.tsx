import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, NotebookPen } from 'lucide-react'
import { getStudent } from '../api/students'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { getCefrBadgeClasses } from '@/lib/cefr-colors'
import { StudentProfileSummary } from '@/components/StudentProfileSummary'
import { LessonHistoryCard } from '@/components/student/LessonHistoryCard'
import { StudentCoursesCard } from '@/components/student/StudentCoursesCard'
import { SessionLogDialog } from '@/components/session/SessionLogDialog'

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [logSessionOpen, setLogSessionOpen] = useState(false)

  const { data: student, isLoading, isError } = useQuery({
    queryKey: ['student', id],
    queryFn: () => getStudent(id!),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-6 w-12 rounded-full" />
        </div>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (isError || !student) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-sm text-zinc-500">Student not found.</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/students')}>
          Go back
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            to="/students"
            className="text-zinc-400 hover:text-zinc-600 transition-colors"
            aria-label="Back to students"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-semibold text-zinc-900" data-testid="student-detail-name">
            {student.name}
          </h1>
          <Badge
            variant="outline"
            className={`text-xs ${getCefrBadgeClasses(student.cefrLevel)}`}
          >
            {student.cefrLevel}
          </Badge>
          <Badge variant="outline" className="text-xs text-zinc-500 border-zinc-200">
            {student.learningLanguage}
          </Badge>
        </div>

        <Button
          onClick={() => setLogSessionOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
          size="sm"
          data-testid="log-session-button"
        >
          <NotebookPen className="h-4 w-4 mr-1.5" />
          Log session
        </Button>
      </div>

      {/* Profile summary */}
      <StudentProfileSummary student={student} />

      {/* Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        <LessonHistoryCard studentId={student.id} />
        <StudentCoursesCard studentId={student.id} />
      </div>

      {/* Session log dialog */}
      <SessionLogDialog
        studentId={student.id}
        open={logSessionOpen}
        onOpenChange={setLogSessionOpen}
      />
    </div>
  )
}
