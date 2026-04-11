import { useState, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { TeacherFollowup } from '@/api/followups'
import { createFollowup, updateFollowupStatus } from '@/api/followups'

interface StudentFollowupsCardProps {
  followups: TeacherFollowup[]
  studentId: string
  onFollowupChange: () => void
}

function daysAgo(createdAt: string): number {
  return Math.floor(Math.max(0, Date.now() - new Date(createdAt).getTime()) / 86400000)
}

export function StudentFollowupsCard({ followups, studentId, onFollowupChange }: StudentFollowupsCardProps) {
  const [newText, setNewText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const createMutation = useMutation({
    mutationFn: (text: string) => createFollowup({ text, studentId }),
    onSuccess: () => {
      setNewText('')
      onFollowupChange()
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'pending' | 'done' }) =>
      updateFollowupStatus(id, status),
    onSuccess: () => onFollowupChange(),
  })

  function handleAdd() {
    const text = newText.trim()
    if (!text || createMutation.isPending) return
    createMutation.mutate(text)
  }

  function handleToggle(f: TeacherFollowup) {
    if (toggleMutation.isPending) return
    const next = f.status === 'pending' ? 'done' : 'pending'
    toggleMutation.mutate({ id: f.id, status: next })
  }

  const pending = followups.filter(f => f.status === 'pending')
  const done = followups.filter(f => f.status === 'done').slice(-3)

  return (
    <div data-testid="student-followups-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-zinc-400">Pending Followups</h3>
        {pending.length > 0 && (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[0.6875rem] font-bold text-amber-700">
            {pending.length}
          </span>
        )}
      </div>

      {pending.length === 0 && done.length === 0 ? (
        <p className="text-xs text-zinc-400 py-2">No pending followups</p>
      ) : (
        <div className="space-y-1.5">
          {pending.map(f => {
            const days = daysAgo(f.createdAt)
            const isOverdue = days > 7
            return (
              <div key={f.id} className="flex items-start gap-2 group">
                <button
                  onClick={() => handleToggle(f)}
                  aria-label="Mark done"
                  data-testid={`followup-toggle-${f.id}`}
                  className="mt-0.5 shrink-0 w-3 h-3 rounded-full border-2 border-amber-400 bg-amber-100 hover:bg-amber-500 transition-colors"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#1A1B22]">{f.text}</p>
                  {isOverdue && (
                    <p className="text-[0.6875rem] font-semibold text-red-600" data-testid={`followup-overdue-${f.id}`}>
                      Overdue ({days} days)
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleToggle(f)}
                  className="shrink-0 text-[0.6875rem] font-semibold text-zinc-400 hover:text-emerald-600 transition-colors opacity-0 group-hover:opacity-100"
                  data-testid={`followup-done-btn-${f.id}`}
                >
                  Done
                </button>
              </div>
            )
          })}

          {done.map(f => (
            <div key={f.id} className="flex items-start gap-2 opacity-50">
              <span className="mt-0.5 shrink-0 w-3 h-3 rounded-full bg-emerald-500" />
              <p className="text-sm text-zinc-500 line-through">{f.text}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={newText}
          onChange={e => setNewText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Add followup..."
          className="flex-1 rounded-md border border-zinc-200 bg-amber-50 px-3 py-1.5 text-sm text-[#1A1B22] placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
          data-testid="followup-input"
          disabled={createMutation.isPending}
        />
        <button
          onClick={handleAdd}
          disabled={createMutation.isPending || !newText.trim()}
          className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-40 transition-colors"
          data-testid="followup-add-btn"
        >
          Add
        </button>
      </div>
    </div>
  )
}
