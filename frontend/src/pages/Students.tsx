import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2, UserPlus, Users } from 'lucide-react'
import { getStudents, deleteStudent, type Student } from '../api/students'
import { logger } from '../lib/logger'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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

export default function Students() {
  const queryClient = useQueryClient()
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null)

  const { data, isLoading, isError: isStudentsError } = useQuery({
    queryKey: ['students'],
    queryFn: () => getStudents(),
  })

  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { mutate: doDelete, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) => deleteStudent(id),
    onSuccess: () => {
      logger.info('Students', 'student deleted')
      queryClient.invalidateQueries({ queryKey: ['students'] })
      setStudentToDelete(null)
      setDeleteError(null)
    },
    onError: (err) => {
      logger.error('Students', 'delete failed', err)
      setDeleteError('Failed to delete student. Please try again.')
      setStudentToDelete(null)
    },
  })

  const students = data?.items ?? []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-zinc-500">
        Loading students...
      </div>
    )
  }

  if (isStudentsError) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-sm text-red-600 font-medium">Failed to load students. Please try again.</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Students</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage your student profiles.</p>
        </div>
        <Link
          to="/students/new"
          className={cn(buttonVariants(), 'bg-indigo-600 hover:bg-indigo-700 text-white')}
        >
          <UserPlus className="h-4 w-4 mr-1.5" />
          Add Student
        </Link>
      </div>

      {/* Delete error */}
      {deleteError && (
        <span className="text-sm text-red-600 font-medium" data-testid="delete-error">{deleteError}</span>
      )}

      {/* Empty state */}
      {students.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center" data-testid="empty-state">
          <Users className="h-12 w-12 text-zinc-300 mb-4" />
          <h2 className="text-lg font-medium text-zinc-700 mb-1">No students yet</h2>
          <p className="text-sm text-zinc-500 mb-6">Add your first student to get started.</p>
          <Link
            to="/students/new"
            className={cn(buttonVariants(), 'bg-indigo-600 hover:bg-indigo-700 text-white')}
          >
            Add your first student
          </Link>
        </div>
      )}

      {/* Student list */}
      {students.length > 0 && (
        <div className="space-y-3">
          {students.map((student) => (
            <Card key={student.id} className="bg-white border border-zinc-200" data-testid={`student-row-${student.id}`}>
              <CardContent className="flex items-center justify-between py-4 px-6">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-medium text-zinc-900 text-sm" data-testid="student-name">
                      {student.name}
                    </span>
                    <Badge variant="outline" className="text-xs text-zinc-500 border-zinc-200">
                      {student.learningLanguage}
                    </Badge>
                    <Badge variant="outline" className="text-xs text-indigo-600 border-indigo-200 bg-indigo-50" data-testid="student-level">
                      {student.cefrLevel}
                    </Badge>
                    {student.nativeLanguage && (
                      <Badge variant="outline" className="text-xs text-zinc-500 border-zinc-200" data-testid="native-language-chip">
                        {student.nativeLanguage} speaker
                      </Badge>
                    )}
                    {student.interests.slice(0, 3).map((interest) => (
                      <Badge
                        key={interest}
                        variant="outline"
                        className="text-xs text-zinc-500 border-zinc-200"
                        data-testid="interest-chip"
                      >
                        {interest}
                      </Badge>
                    ))}
                    {student.interests.length > 3 && (
                      <span className="text-xs text-zinc-400">+{student.interests.length - 3} more</span>
                    )}
                  </div>
                  {student.notes && (
                    <p className="text-xs text-zinc-400 mt-1 truncate">{student.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-4 shrink-0">
                  <Link
                    to={`/students/${student.id}/edit`}
                    aria-label={`Edit ${student.name}`}
                    className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
                    data-testid="edit-student"
                  >
                    <Pencil className="h-4 w-4 text-zinc-400" />
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setStudentToDelete(student)}
                    aria-label={`Delete ${student.name}`}
                    data-testid="delete-student"
                  >
                    <Trash2 className="h-4 w-4 text-zinc-400" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!studentToDelete} onOpenChange={(open) => !open && setStudentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {studentToDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this student profile. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => studentToDelete && doDelete(studentToDelete.id)}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
              data-testid="confirm-delete"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
