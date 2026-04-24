import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getDashboard } from '@/api/dashboard'
import { Skeleton } from '@/components/ui/skeleton'
import { NextSessionHero } from '@/components/dashboard/NextSessionHero'
import { TodayAgenda } from '@/components/dashboard/TodayAgenda'
import { PendingFollowups } from '@/components/dashboard/PendingFollowups'
import { StudentRoster } from '@/components/dashboard/StudentRoster'

const SLOW_THRESHOLD_MS = 5000

export default function Dashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
  })

  const [slowTimerFired, setSlowTimerFired] = useState(false)
  useEffect(() => {
    if (!isLoading) return
    const timer = setTimeout(() => setSlowTimerFired(true), SLOW_THRESHOLD_MS)
    return () => clearTimeout(timer)
  }, [isLoading])

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-center">
        <p className="font-manrope text-[1.75rem] font-bold text-[#1A1B22]">Could not load dashboard</p>
        <p className="text-sm text-zinc-500 font-inter">Check your connection and try refreshing the page.</p>
      </div>
    )
  }

  // Intentional divergence: skeleton (not spinner) because Dashboard has multiple distinct regions; use this pattern only for similarly complex multi-region pages.
  if (isLoading) {
    return (
      <div className="space-y-5" data-testid="dashboard-skeleton">
        {isLoading && slowTimerFired && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" data-testid="slow-connection-message">
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 10.5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM8.75 4.75a.75.75 0 0 0-1.5 0v3.5a.75.75 0 0 0 1.5 0v-3.5Z" />
            </svg>
            Still connecting to the server... This may take a moment.
          </div>
        )}
        <Skeleton className="h-[200px] w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Skeleton className="h-[220px] rounded-2xl" />
          <Skeleton className="h-[220px] rounded-2xl" />
        </div>
        <Skeleton className="h-[240px] w-full rounded-2xl" />
      </div>
    )
  }

  const nextSession = data?.nextSession ?? null
  const todaySessions = data?.todaySessions ?? []
  const activeStudents = data?.activeStudents ?? []
  const pendingFollowups = data?.pendingFollowups ?? []
  const upcomingThisWeek = data?.upcomingThisWeek ?? []

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-manrope text-[1.75rem] font-bold text-[#1A1B22]">Dashboard</h1>
        <p className="text-[0.6875rem] font-bold tracking-[0.05em] text-zinc-400 font-inter mt-1">
          Your teaching command center
        </p>
      </div>

      {/* Zone 1: Next Session Hero */}
      <NextSessionHero session={nextSession} />

      {/* Zone 2: Today's Agenda + Pending Followups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <TodayAgenda
          sessions={todaySessions}
          nextSessionId={nextSession?.sessionLogId ?? null}
          upcomingThisWeek={upcomingThisWeek}
        />
        <PendingFollowups followups={pendingFollowups} />
      </div>

      {/* Zone 3: Student Roster */}
      <StudentRoster students={activeStudents} />
    </div>
  )
}
