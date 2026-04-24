import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, ChevronRight } from 'lucide-react'
import { getSessionsList, type SessionListItem, type SessionFilterStudent } from '@/api/sessions'
import { CefrBadge } from '@/components/dashboard/CefrBadge'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { getDisplayStatus, sessionStatusChipClass } from '@/utils/sessionStatusUtils'

function groupByDate(items: SessionListItem[]): Map<string, SessionListItem[]> {
  const map = new Map<string, SessionListItem[]>()
  for (const item of items) {
    const date = new Date(item.sessionDate)
    const key = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return map
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

interface SessionRowProps {
  session: SessionListItem
  onClick: (studentId: string, sessionLogId: string) => void
}

function SessionRow({ session, onClick }: SessionRowProps) {
  return (
    <button
      onClick={() => onClick(session.studentId, session.sessionLogId)}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#F4F2FD] transition-colors text-left"
      data-testid={`session-row-${session.sessionLogId}`}
    >
      <span className="text-sm font-mono text-zinc-400 w-14 shrink-0">{formatTime(session.sessionDate)}</span>
      <span className="font-medium text-[#1A1B22] text-sm font-inter min-w-0 flex-1">{session.studentName}</span>
      <CefrBadge level={session.studentCefrLevel} className="shrink-0" />
      {session.plannedContent && (
        <span className="text-sm text-zinc-400 font-inter truncate flex-1 hidden md:block">
          {session.plannedContent}
        </span>
      )}
      <span
        className={cn(
          'text-[0.6875rem] font-bold uppercase tracking-[0.05em] px-2 py-0.5 rounded shrink-0',
          sessionStatusChipClass(getDisplayStatus(session.status, session.sessionDate))
        )}
      >
        {getDisplayStatus(session.status, session.sessionDate)}
      </span>
      <ChevronRight className="h-4 w-4 text-zinc-300 shrink-0" />
    </button>
  )
}

interface SectionProps {
  title: string
  items: SessionListItem[]
  grouped?: boolean
  onSessionClick: (studentId: string, sessionLogId: string) => void
}

function Section({ title, items, grouped = false, onSessionClick }: SectionProps) {
  if (items.length === 0) return null

  const groups = grouped ? groupByDate(items) : null

  return (
    <section>
      <h2 className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400 font-inter px-1 mb-2">
        {title}
      </h2>
      <div className="bg-white rounded-xl overflow-hidden">
        {groups ? (
          Array.from(groups.entries()).map(([dateLabel, groupSessions]) => (
            <div key={dateLabel}>
              <div className="px-4 py-2 bg-[#F4F2FD]">
                <span className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-500 font-inter">
                  {dateLabel}
                </span>
              </div>
              {groupSessions.map(s => (
                <SessionRow key={s.sessionLogId} session={s} onClick={onSessionClick} />
              ))}
            </div>
          ))
        ) : (
          items.map(s => (
            <SessionRow key={s.sessionLogId} session={s} onClick={onSessionClick} />
          ))
        )}
      </div>
    </section>
  )
}

interface StudentFilterProps {
  students: SessionFilterStudent[]
  value: string
  onChange: (v: string | null) => void
}

function StudentFilter({ students, value, onChange }: StudentFilterProps) {
  const studentName = students.find(s => s.studentId === value)?.name

  return (
    <Select value={value} onValueChange={(v: string | null) => onChange(!v || v === 'all' ? 'all' : v)}>
      <SelectTrigger className="w-48 bg-white" data-testid="student-filter">
        <SelectValue placeholder="All students">
          {() => value === 'all' ? 'All students' : (studentName ?? 'All students')}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All students</SelectItem>
        {students.map(s => (
          <SelectItem key={s.studentId} value={s.studentId}>
            {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export default function Sessions() {
  const navigate = useNavigate()
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all')

  const studentId = selectedStudentId === 'all' ? undefined : selectedStudentId

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sessions', studentId],
    queryFn: () => getSessionsList(studentId),
  })

  const handleSessionClick = (sId: string, slId: string) => navigate(`/students/${sId}/sessions/${slId}/edit`)
  const handleStudentChange = (v: string | null) => setSelectedStudentId(v ?? 'all')

  const isEmpty = data && data.upcoming.length === 0 && data.today.length === 0 && data.recent.length === 0

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-center">
        <p className="font-manrope text-[1.75rem] font-bold text-[#1A1B22]">Could not load sessions</p>
        <p className="text-sm text-zinc-500 font-inter">Check your connection and try refreshing the page.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sessions"
        actions={data && (
          <StudentFilter
            students={data.students}
            value={selectedStudentId}
            onChange={handleStudentChange}
          />
        )}
      />

      {isLoading && (
        <div className="space-y-4" data-testid="sessions-skeleton">
          <Skeleton className="h-6 w-24 rounded" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-6 w-24 rounded" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      )}

      {!isLoading && isEmpty && (
        <div
          className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center"
          data-testid="sessions-empty"
        >
          <CalendarDays className="h-12 w-12 text-zinc-200" />
          <p className="font-manrope text-xl font-bold text-[#1A1B22]">No sessions found</p>
          <p className="text-sm text-zinc-400 font-inter">
            {selectedStudentId !== 'all'
              ? 'This student has no upcoming or recent sessions.'
              : 'Schedule sessions with your students to see them here.'}
          </p>
        </div>
      )}

      {!isLoading && data && !isEmpty && (
        <div className="space-y-6" data-testid="sessions-list">
          <Section
            title="Upcoming"
            items={data.upcoming}
            grouped
            onSessionClick={handleSessionClick}
          />
          <Section
            title="Today"
            items={data.today}
            onSessionClick={handleSessionClick}
          />
          <Section
            title="Recent"
            items={data.recent}
            grouped
            onSessionClick={handleSessionClick}
          />
        </div>
      )}
    </div>
  )
}
