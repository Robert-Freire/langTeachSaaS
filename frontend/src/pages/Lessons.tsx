import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Copy, Pencil, PlusCircle, Trash2 } from 'lucide-react'
import { getLessons, deleteLesson, duplicateLesson, type Lesson } from '../api/lessons'
import { logger } from '../lib/logger'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { getCefrBadgeClasses } from '@/lib/cefr-colors'
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

const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Mandarin', 'Japanese', 'Arabic', 'Other']
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

function statusBadgeClass(status: string) {
  return status === 'Published'
    ? 'text-green-700 border-green-200 bg-green-50'
    : 'text-zinc-500 border-zinc-200'
}


export default function Lessons() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [language, setLanguage] = useState<string | undefined>()
  const [cefrLevel, setCefrLevel] = useState<string | undefined>()
  const [status, setStatus] = useState<string | undefined>(searchParams.get('status') ?? undefined)
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  const queryKey = ['lessons', { search: debouncedSearch, language, cefrLevel, status }]

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => getLessons({
      search: debouncedSearch || undefined,
      language,
      cefrLevel,
      status,
    }),
  })

  const { mutate: doDelete, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) => deleteLesson(id),
    onSuccess: () => {
      logger.info('Lessons', 'lesson deleted')
      queryClient.invalidateQueries({ queryKey: ['lessons'] })
      setLessonToDelete(null)
      setDeleteError(null)
    },
    onError: (err) => {
      logger.error('Lessons', 'delete failed', err)
      setDeleteError('Failed to delete lesson. Please try again.')
      setLessonToDelete(null)
    },
  })

  const { mutate: doDuplicate, isPending: isDuplicating } = useMutation({
    mutationFn: (id: string) => duplicateLesson(id),
    onSuccess: (copy) => {
      logger.info('Lessons', 'lesson duplicated', { id: copy.id })
      queryClient.invalidateQueries({ queryKey: ['lessons'] })
      navigate(`/lessons/${copy.id}`)
    },
    onError: (err) => {
      logger.error('Lessons', 'duplicate failed', err)
    },
  })

  const lessons = data?.items ?? []

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-56 mt-2" />
          </div>
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="bg-white border border-zinc-200">
              <CardContent className="flex items-center justify-between py-4 px-6">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-10 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-56" />
                </div>
                <div className="flex gap-1">
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-sm text-red-600 font-medium">Failed to load lessons. Please try again.</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Lessons</h1>
          <p className="text-sm text-zinc-500 mt-1">Create and manage your lesson plans.</p>
        </div>
        <Link
          to="/lessons/new"
          className={cn(buttonVariants(), 'bg-indigo-600 hover:bg-indigo-700 text-white')}
          data-testid="new-lesson-btn"
        >
          <PlusCircle className="h-4 w-4 mr-1.5" />
          New Lesson
        </Link>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search by title or topic..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-xs"
          data-testid="search-input"
        />
        <Select value={language ?? 'all'} onValueChange={(v) => setLanguage(!v || v === 'all' ? undefined : v)}>
          <SelectTrigger className="w-full sm:w-36" data-testid="filter-language">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Language: All</SelectItem>
            {LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={cefrLevel ?? 'all'} onValueChange={(v) => setCefrLevel(!v || v === 'all' ? undefined : v)}>
          <SelectTrigger className="w-full sm:w-32" data-testid="filter-level">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Level: All</SelectItem>
            {CEFR_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status ?? 'all'} onValueChange={(v) => setStatus(!v || v === 'all' ? undefined : v)}>
          <SelectTrigger className="w-full sm:w-32" data-testid="filter-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Status: All</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Published">Published</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Delete error */}
      {deleteError && (
        <span className="text-sm text-red-600 font-medium" data-testid="delete-error">{deleteError}</span>
      )}

      {/* Empty state */}
      {lessons.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center" data-testid="empty-state">
          <BookOpen className="h-12 w-12 text-zinc-300 mb-4" />
          <h2 className="text-lg font-medium text-zinc-700 mb-1">No lessons yet</h2>
          <p className="text-sm text-zinc-500 mb-6">Create your first lesson to get started.</p>
          <Link
            to="/lessons/new"
            className={cn(buttonVariants(), 'bg-indigo-600 hover:bg-indigo-700 text-white')}
          >
            Create your first lesson
          </Link>
        </div>
      )}

      {/* Lesson list */}
      {lessons.length > 0 && (
        <div className="space-y-3">
          {lessons.map((lesson) => (
            <Card key={lesson.id} className="bg-white border border-zinc-200 shadow-sm transition-all hover:shadow-md hover:border-zinc-300" data-testid={`lesson-row-${lesson.id}`}>
              <CardContent className="flex items-center justify-between py-4 px-4 sm:px-6">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-zinc-900 text-sm" data-testid="lesson-title">
                      {lesson.title}
                    </span>
                    {lesson.studentName && (
                      <span className="text-sm text-indigo-600 font-medium" data-testid="lesson-student-name">
                        {lesson.studentName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-xs text-zinc-500 border-zinc-200">
                      {lesson.language}
                    </Badge>
                    <Badge variant="outline" className={`text-xs ${getCefrBadgeClasses(lesson.cefrLevel)}`}>
                      {lesson.cefrLevel}
                    </Badge>
                    <Badge variant="outline" className={cn('text-xs', statusBadgeClass(lesson.status))} data-testid="lesson-status">
                      {lesson.status}
                    </Badge>
                    <span className="text-xs text-zinc-400">{lesson.topic} &middot; {lesson.durationMinutes} min</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2 sm:ml-4 shrink-0">
                  <Tooltip>
                    <TooltipTrigger render={<span />}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => doDuplicate(lesson.id)}
                        disabled={isDuplicating}
                        aria-label={`Duplicate ${lesson.title}`}
                        data-testid="duplicate-lesson"
                      >
                        <Copy className="h-4 w-4 text-zinc-400" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Clone</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger render={<span />}>
                      <Link
                        to={`/lessons/${lesson.id}`}
                        aria-label={`Edit ${lesson.title}`}
                        className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
                        data-testid="edit-lesson"
                      >
                        <Pencil className="h-4 w-4 text-zinc-400" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>Edit</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger render={<span />}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setLessonToDelete(lesson)}
                        aria-label={`Delete ${lesson.title}`}
                        data-testid="delete-lesson"
                      >
                        <Trash2 className="h-4 w-4 text-zinc-400" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete</TooltipContent>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!lessonToDelete} onOpenChange={(open) => !open && setLessonToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{lessonToDelete?.title}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this lesson and all its sections. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => lessonToDelete && doDelete(lessonToDelete.id)}
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
