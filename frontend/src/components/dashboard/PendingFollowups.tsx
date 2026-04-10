import type { ActiveStudent } from '@/api/dashboard'

interface PendingFollowupsProps {
  students: ActiveStudent[]
}

interface PendingRow {
  studentId: string
  studentName: string
  todoId: string
  text: string
  createdAt: string
}

function ageBadge(createdAt: string): { label: string; className: string } {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000)
  if (days === 0) return { label: 'new', className: 'bg-emerald-100 text-emerald-700' }
  if (days <= 3) return { label: `${days}d`, className: 'bg-emerald-100 text-emerald-700' }
  if (days <= 7) return { label: `${days}d`, className: 'bg-amber-100 text-amber-700' }
  return { label: `${days}d`, className: 'bg-red-100 text-red-700' }
}

export function PendingFollowups({ students }: PendingFollowupsProps) {
  const rows: PendingRow[] = []
  for (const student of students) {
    for (const todo of student.pendingTodos) {
      rows.push({
        studentId: student.studentId,
        studentName: student.name,
        todoId: todo.id,
        text: todo.text,
        createdAt: todo.createdAt,
      })
    }
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_12px_40px_rgba(26,27,34,0.06)] ring-1 ring-[#C7C4D8]/20" data-testid="zone2-pending-followups">
      <h3 className="font-manrope text-[1.25rem] font-bold text-[#1A1B22] mb-4">Pending Followups</h3>

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-400 font-inter py-4 text-center">All caught up</p>
      ) : (
        <div className="space-y-2">
          {rows.map(row => {
            const badge = ageBadge(row.createdAt)
            return (
              <div
                key={row.todoId}
                className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-[#F4F2FD] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400 font-inter mb-0.5">
                    {row.studentName}
                  </p>
                  <p className="text-sm text-[#1A1B22] font-inter">{row.text}</p>
                </div>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-bold font-inter shrink-0 ${badge.className}`}>
                  {badge.label}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
