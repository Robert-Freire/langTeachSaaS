import { useState } from 'react'
import { Plus, Check } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import type { TeacherFollowup } from '@/api/followups'
import { createFollowup, updateFollowupStatus, deleteFollowup } from '@/api/followups'

interface Props {
  ideas: TeacherFollowup[]
  groupId: string
  onRefetch: () => void
}

const DONE_STATUSES = new Set(['done', 'covered', 'dismissed'])

export function GroupTeachingIdeasCard({ ideas, groupId, onRefetch }: Props) {
  const [newText, setNewText] = useState('')

  const addMutation = useMutation({
    mutationFn: (text: string) =>
      createFollowup({ text, groupId, kind: 'pedagogical' }),
    onSuccess: () => {
      setNewText('')
      onRefetch()
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'pending' | 'done' }) =>
      updateFollowupStatus(id, status),
    onSuccess: () => onRefetch(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFollowup(id),
    onSuccess: () => onRefetch(),
  })

  const pending = ideas.filter(i => !DONE_STATUSES.has(i.status))
  const done = ideas.filter(i => DONE_STATUSES.has(i.status)).slice(-2)

  function handleAdd() {
    const text = newText.trim()
    if (!text || addMutation.isPending) return
    addMutation.mutate(text)
  }

  return (
    <div data-testid="group-teaching-ideas-card">
      <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-zinc-400 mb-3">Teaching Ideas</h3>

      {pending.length === 0 && done.length === 0 ? (
        <p className="text-xs text-zinc-400 italic py-2" data-testid="ideas-empty">
          No ideas yet. What do you want to try next class?
        </p>
      ) : (
        <div className="space-y-1.5">
          {pending.map(idea => (
            <div key={idea.id} className="flex items-start gap-2 group">
              <button
                type="button"
                onClick={() => toggleMutation.mutate({ id: idea.id, status: 'done' })}
                aria-label="Mark done"
                className="mt-0.5 shrink-0 w-3 h-3 rounded-full border-2 border-indigo-300 bg-indigo-50 hover:bg-indigo-400 hover:border-indigo-400 transition-colors"
              />
              <p className="flex-1 text-sm text-[#1A1B22]">{idea.text}</p>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(idea.id)}
                className="shrink-0 text-[0.6875rem] text-zinc-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                aria-label="Remove idea"
              >
                ×
              </button>
            </div>
          ))}
          {done.map(idea => (
            <div key={idea.id} className="flex items-start gap-2 opacity-40">
              <Check className="mt-0.5 shrink-0 h-3 w-3 text-indigo-400" />
              <p className="text-sm text-zinc-500 line-through">{idea.text}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={newText}
          onChange={e => setNewText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Add teaching idea..."
          className="flex-1 rounded-md border border-zinc-200 bg-indigo-50/50 px-3 py-1.5 text-sm text-[#1A1B22] placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          data-testid="idea-input"
          disabled={addMutation.isPending}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={addMutation.isPending || !newText.trim()}
          className="shrink-0 rounded-lg bg-indigo-500 p-1.5 text-white hover:bg-indigo-600 disabled:opacity-40 transition-colors"
          data-testid="idea-add-btn"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
