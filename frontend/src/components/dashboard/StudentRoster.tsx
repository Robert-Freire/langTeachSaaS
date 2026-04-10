import { Link } from 'react-router-dom'
import { CefrBadge } from './CefrBadge'
import type { ActiveStudent } from '@/api/dashboard'

interface StudentRosterProps {
  students: ActiveStudent[]
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function StudentRoster({ students }: StudentRosterProps) {
  const sorted = [...students]
    .sort((a, b) => {
      if (!a.nextSessionDate && !b.nextSessionDate) return 0
      if (!a.nextSessionDate) return 1
      if (!b.nextSessionDate) return -1
      return new Date(a.nextSessionDate).getTime() - new Date(b.nextSessionDate).getTime()
    })
    .slice(0, 10)

  return (
    <div className="rounded-2xl bg-white shadow-[0_12px_40px_rgba(26,27,34,0.06)] ring-1 ring-[#C7C4D8]/20 overflow-hidden" data-testid="zone3-student-roster">
      <div className="px-6 pt-5 pb-3">
        <h3 className="font-manrope text-[1.25rem] font-bold text-[#1A1B22]">Students</h3>
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
                <th className="px-3 py-2 text-left text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400 hidden sm:table-cell">Last</th>
                <th className="px-3 py-2 text-left text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400 hidden sm:table-cell">Next</th>
                <th className="px-3 py-2 text-right text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400 hidden md:table-cell">Pending</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(student => (
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
                    {formatDate(student.lastSessionDate)}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-500 hidden sm:table-cell">
                    {formatDate(student.nextSessionDate)}
                  </td>
                  <td className="px-3 py-2.5 text-right hidden md:table-cell">
                    {(student.pendingTodos?.length ?? 0) > 0 && (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[0.6875rem] font-bold text-amber-700">
                        {student.pendingTodos.length}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
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
