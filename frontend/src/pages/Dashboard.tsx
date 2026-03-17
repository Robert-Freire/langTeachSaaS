import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getLessons } from '../api/lessons'
import { getStudents } from '../api/students'
import { getWeekBounds, toISODateString } from '../lib/weekUtils'
import { WeekStrip } from '@/components/dashboard/WeekStrip'
import { NeedsPreparation } from '@/components/dashboard/NeedsPreparation'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { UnscheduledDrafts } from '@/components/dashboard/UnscheduledDrafts'

export default function Dashboard() {
  const [weekOffset, setWeekOffset] = useState(0)
  const { start, end } = getWeekBounds(weekOffset)

  const { data: studentsData } = useQuery({
    queryKey: ['students', { pageSize: 100 }],
    queryFn: () => getStudents({ pageSize: 100 }),
  })

  // pageSize: 100 is sufficient for beta (teachers rarely have 100+ lessons per week or drafts).
  // If this becomes limiting, add server-side pagination or a dedicated dashboard endpoint.
  const { data: weekLessonsData } = useQuery({
    queryKey: ['lessons', { scheduledFrom: toISODateString(start), scheduledTo: toISODateString(end) }],
    queryFn: () => getLessons({
      scheduledFrom: toISODateString(start),
      scheduledTo: toISODateString(end),
      pageSize: 100,
    }),
  })

  const { data: draftsData } = useQuery({
    queryKey: ['lessons', { status: 'Draft', pageSize: 100 }],
    queryFn: () => getLessons({ status: 'Draft', pageSize: 100 }),
  })

  const { data: totalData } = useQuery({
    queryKey: ['lessons', { pageSize: 1 }],
    queryFn: () => getLessons({ pageSize: 1 }),
  })

  const studentCount = studentsData?.totalCount ?? 0
  const students = studentsData?.items ?? []
  const weekLessons = weekLessonsData?.items ?? []
  const allDrafts = draftsData?.items ?? []
  const unscheduledDrafts = allDrafts.filter(l => !l.scheduledAt)
  const totalLessonCount = totalData?.totalCount ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">Your teaching command center.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <WeekStrip
            weekOffset={weekOffset}
            onPrev={() => setWeekOffset(o => o - 1)}
            onNext={() => setWeekOffset(o => o + 1)}
            lessons={weekLessons}
            students={students}
            unscheduledDrafts={unscheduledDrafts}
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

      <UnscheduledDrafts lessons={allDrafts} />
    </div>
  )
}
