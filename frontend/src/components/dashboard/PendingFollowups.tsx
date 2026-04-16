import type { TeacherFollowup } from '@/api/followups'
import { updateFollowupStatus } from '@/api/followups'
import { useState } from 'react'

interface PendingFollowupsProps {
  followups: TeacherFollowup[]
}

interface AgeBadgeInfo {
  label: string
  dotColor: string
  badgeClassName: string
}

function ageBadge(createdAt: string): AgeBadgeInfo {
  const days = Math.floor(Math.max(0, Date.now() - new Date(createdAt).getTime()) / 86400000)
  if (days === 0) return {
    label: 'TODAY',
    dotColor: 'bg-emerald-500',
    badgeClassName: 'bg-emerald-100 text-emerald-700',
  }
  if (days === 1) return {
    label: 'YESTERDAY',
    dotColor: 'bg-amber-400',
    badgeClassName: 'bg-amber-100 text-amber-700',
  }
  if (days <= 3) return {
    label: `${days} DAYS AGO`,
    dotColor: 'bg-amber-400',
    badgeClassName: 'bg-amber-100 text-amber-700',
  }
  return {
    label: `${days} DAYS OVERDUE`,
    dotColor: 'bg-red-500',
    badgeClassName: 'bg-red-100 text-red-700',
  }
}

export function PendingFollowups({ followups }: PendingFollowupsProps) {
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  async function handleMarkDone(id: string) {
    setHidden(prev => new Set([...prev, id]))
    try {
      await updateFollowupStatus(id, 'done')
    } catch {
      setHidden(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const visible = followups.filter(f => !hidden.has(f.id))

  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_12px_40px_rgba(26,27,34,0.06)] ring-1 ring-[#C7C4D8]/20" data-testid="zone2-pending-followups">
      <h3 className="font-manrope text-[1.25rem] font-bold text-[#1A1B22] mb-4">Pending Followups</h3>

      {visible.length === 0 ? (
        <p className="text-sm text-zinc-400 font-inter py-4 text-center">All caught up</p>
      ) : (
        <div className="space-y-2">
          {visible.map(f => {
            const badge = ageBadge(f.createdAt)
            return (
              <div
                key={f.id}
                className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-[#F4F2FD] transition-colors"
              >
                <button
                  onClick={() => handleMarkDone(f.id)}
                  aria-label="Mark done"
                  className={`mt-0.5 shrink-0 w-3.5 h-3.5 rounded-full border-2 ${badge.dotColor} border-transparent hover:opacity-80 transition-opacity`}
                  data-testid={`followup-dot-${f.id}`}
                />
                <div className="flex-1 min-w-0">
                  {f.studentName && (
                    <p className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400 font-inter mb-0.5">
                      {f.studentName}
                    </p>
                  )}
                  <p className="text-sm text-[#1A1B22] font-inter">{f.text}</p>
                </div>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-bold font-inter shrink-0 ${badge.badgeClassName}`} data-testid={`followup-age-${f.id}`}>
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
