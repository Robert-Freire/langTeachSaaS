import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getLessons } from '../api/lessons'
import { getStudents } from '../api/students'
import { getCourses } from '../api/courses'
import { getWeekBounds, toISODateString } from '../lib/weekUtils'
import { WeekStrip } from '@/components/dashboard/WeekStrip'
import { NeedsPreparation } from '@/components/dashboard/NeedsPreparation'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { UnscheduledDrafts } from '@/components/dashboard/UnscheduledDrafts'
import { CoursesOverview } from '@/components/dashboard/CoursesOverview'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

const SLOW_THRESHOLD_MS = 5000

export default function Dashboard() {
  const [weekOffset, setWeekOffset] = useState(0)
  const { start, end } = getWeekBounds(weekOffset)

  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ['students', { pageSize: 100 }],
    queryFn: () => getStudents({ pageSize: 100 }),
  })

  // pageSize: 100 is sufficient for beta (teachers rarely have 100+ lessons per week or drafts).
  // If this becomes limiting, add server-side pagination or a dedicated dashboard endpoint.
  const { data: weekLessonsData, isLoading: weekLoading } = useQuery({
    queryKey: ['lessons', { scheduledFrom: toISODateString(start), scheduledTo: toISODateString(end) }],
    queryFn: () => getLessons({
      scheduledFrom: toISODateString(start),
      scheduledTo: toISODateString(end),
      pageSize: 100,
    }),
  })

  const { data: draftsData, isLoading: draftsLoading } = useQuery({
    queryKey: ['lessons', { status: 'Draft', pageSize: 100 }],
    queryFn: () => getLessons({ status: 'Draft', pageSize: 100 }),
  })

  const { data: publishedData, isLoading: publishedLoading } = useQuery({
    queryKey: ['lessons', { status: 'Published', pageSize: 100 }],
    queryFn: () => getLessons({ status: 'Published', pageSize: 100 }),
  })

  const { data: totalData, isLoading: totalLoading } = useQuery({
    queryKey: ['lessons', { pageSize: 1 }],
    queryFn: () => getLessons({ pageSize: 1 }),
  })

  const { data: coursesData } = useQuery({
    queryKey: ['courses'],
    queryFn: getCourses,
  })

  const isLoading = studentsLoading || weekLoading || draftsLoading || publishedLoading || totalLoading

  const [showSlowMessage, setShowSlowMessage] = useState(false)
  useEffect(() => {
    if (!isLoading) {
      setShowSlowMessage(false)
      return
    }
    const timer = setTimeout(() => setShowSlowMessage(true), SLOW_THRESHOLD_MS)
    return () => clearTimeout(timer)
  }, [isLoading])

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="dashboard-skeleton">
        <div>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-56 mt-2" />
        </div>

        {showSlowMessage && (
          <div
            className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
            data-testid="slow-connection-message"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 10.5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM8.75 4.75a.75.75 0 0 0-1.5 0v3.5a.75.75 0 0 0 1.5 0v-3.5Z" />
            </svg>
            Still connecting to the server... This may take a moment.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-3 space-y-6">
            <Card className="bg-white border border-zinc-200">
              <CardContent className="py-4 px-6 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-32" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map(i => (
                    <Skeleton key={i} className="h-24 rounded-md" />
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-zinc-200">
              <CardContent className="py-4 px-6 space-y-3">
                <Skeleton className="h-5 w-40" />
                {[1, 2].map(i => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="bg-white border border-zinc-200">
                <CardContent className="py-4 px-6 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card className="bg-white border border-zinc-200">
          <CardContent className="py-4 px-6 space-y-3">
            <Skeleton className="h-5 w-44" />
            {[1, 2].map(i => (
              <Skeleton key={i} className="h-10 rounded-md" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  const courses = coursesData ?? []
  const studentCount = studentsData?.totalCount ?? 0
  const students = studentsData?.items ?? []
  const weekLessons = weekLessonsData?.items ?? []
  const allDrafts = draftsData?.items ?? []
  const allPublished = publishedData?.items ?? []
  const unscheduledDrafts = allDrafts.filter(l => !l.scheduledAt)
  const unscheduledPublished = allPublished.filter(l => !l.scheduledAt)
  const allUnscheduled = [...unscheduledDrafts, ...unscheduledPublished]
  const totalLessonCount = totalData?.totalCount ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">Your teaching command center.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-3 space-y-6">
          <WeekStrip
            weekOffset={weekOffset}
            onPrev={() => setWeekOffset(o => o - 1)}
            onNext={() => setWeekOffset(o => o + 1)}
            lessons={weekLessons}
            students={students}
            unscheduledDrafts={allUnscheduled}
          />

          <NeedsPreparation lessons={allDrafts} />
        </div>

        <div className="space-y-6">
          <QuickActions
            studentCount={studentCount}
            weekLessonCount={weekLessons.length}
            totalLessonCount={totalLessonCount}
          />
        </div>
      </div>

      <UnscheduledDrafts lessons={allUnscheduled} />

      {courses.length > 0 && <CoursesOverview courses={courses} />}
    </div>
  )
}
