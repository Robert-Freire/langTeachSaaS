import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CefrBadge } from './CefrBadge'
import type { ActiveStudent } from '@/api/dashboard'

interface StudentRosterProps {
  students: ActiveStudent[]
}

type SortOption = 'lastSession' | 'nextSession' | 'name'

interface RosterSignal {
  label: string
  className: string
  redDot?: boolean
}

function buildRosterSignal(student: ActiveStudent): RosterSignal | null {
  if (student.cancelledSessionsLast30Days >= 2) {
    return { label: 'Cancelled 2x', className: 'bg-[#1A1B22] text-white', redDot: true }
  }
  const now = Date.now()
  const lastSessionMs = student.lastSessionDate ? new Date(student.lastSessionDate).getTime() : null
  const lastSessionGapDays = lastSessionMs != null
    ? Math.floor((now - lastSessionMs) / (1000 * 60 * 60 * 24))
    : null
  if (lastSessionGapDays != null && lastSessionGapDays >= 14 && !student.nextSessionDate) {
    return { label: `Inactive ${lastSessionGapDays}d`, className: 'bg-amber-500 text-white' }
  }
  if (student.pendingTodos.length > 0) {
    return { label: 'Review pending', className: 'bg-[#3525CD] text-white' }
  }
  return null
}

function sortStudents(students: ActiveStudent[], sortBy: SortOption): ActiveStudent[] {
  const sorted = [...students]
  switch (sortBy) {
    case 'lastSession':
      return sorted.sort((a, b) => {
        if (!a.lastSessionDate && !b.lastSessionDate) return 0
        if (!a.lastSessionDate) return 1
        if (!b.lastSessionDate) return -1
        return new Date(b.lastSessionDate).getTime() - new Date(a.lastSessionDate).getTime()
      })
    case 'nextSession':
      return sorted.sort((a, b) => {
        if (!a.nextSessionDate && !b.nextSessionDate) return 0
        if (!a.nextSessionDate) return 1
        if (!b.nextSessionDate) return -1
        return new Date(a.nextSessionDate).getTime() - new Date(b.nextSessionDate).getTime()
      })
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name))
    default:
      return sorted
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'lastSession', label: 'Last Session' },
  { value: 'nextSession', label: 'Next Session' },
  { value: 'name', label: 'Name' },
]

export function StudentRoster({ students }: StudentRosterProps) {
  const [sortBy, setSortBy] = useState<SortOption>('lastSession')

  const sorted = sortStudents(students, sortBy)

  return (
    <div className="rounded-2xl bg-white shadow-[0_12px_40px_rgba(26,27,34,0.06)] ring-1 ring-[#C7C4D8]/20 overflow-hidden" data-testid="zone3-student-roster">
      <div className="px-6 pt-5 pb-3 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-manrope text-[1.25rem] font-bold text-[#1A1B22]">Student Roster</h3>
          {students.length > 0 && (
            <p className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400 font-inter mt-0.5" data-testid="student-count">
              {students.length} active enrollment{students.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {students.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400 font-inter hidden sm:block">Sort</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortOption)}
              className="text-xs font-inter text-[#1A1B22] bg-[#F4F2FD] rounded-lg px-2 py-1.5 border-none outline-none cursor-pointer"
              aria-label="Sort students"
              data-testid="roster-sort"
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="px-6 pb-6 text-center">
          <p className="text-sm text-zinc-400 font-inter py-4">No students yet.</p>
          <Link
            to="/students/new"
            className="inline-flex items-center rounded-xl bg-gradient-to-br from-[#3525CD] to-indigo-500 px-4 py-2 text-sm font-semibold text-white font-inter transition-opacity hover:opacity-90"
          >
            Add your first student
          </Link>
        </div>
      ) : (
        <>
          <table className="w-full text-sm font-inter">
            <thead>
              <tr className="border-none">
                <th className="px-6 py-2 text-left text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400">Name</th>
                <th className="px-3 py-2 text-left text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400">Level</th>
                <th className="px-3 py-2 text-left text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400 hidden sm:table-cell">L1</th>
                <th className="px-3 py-2 text-left text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400 hidden sm:table-cell">Last</th>
                <th className="px-3 py-2 text-left text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400 hidden sm:table-cell">Next</th>
                <th className="px-3 py-2 text-left text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400 hidden md:table-cell">Signal</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(student => {
                const signal = buildRosterSignal(student)
                const l1 = student.nativeLanguages[0] ?? null

                return (
                  <tr
                    key={student.studentId}
                    className="group hover:bg-[#F4F2FD] transition-colors"
                    data-testid="zone3-student-row"
                  >
                    <td className="px-6 py-2.5">
                      <Link
                        to={`/students/${student.studentId}`}
                        className="font-medium text-[#1A1B22] group-hover:text-indigo-700 transition-colors"
                      >
                        {student.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <CefrBadge level={student.cefrLevel} />
                    </td>
                    <td className="px-3 py-2.5 text-zinc-500 hidden sm:table-cell">
                      {l1 ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-500 hidden sm:table-cell">
                      {formatDate(student.lastSessionDate)}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-500 hidden sm:table-cell">
                      {formatDate(student.nextSessionDate)}
                    </td>
                    <td className="px-3 py-2.5 hidden md:table-cell">
                      {signal && (
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.6875rem] font-bold font-inter ${signal.className}`}>
                          {signal.redDot && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                          )}
                          {signal.label}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="px-6 py-3 border-t border-none bg-[#F4F2FD] rounded-b-2xl">
            <Link
              to="/students"
              className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-indigo-600 hover:text-indigo-800 font-inter transition-colors"
            >
              View entire student base &rarr;
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
