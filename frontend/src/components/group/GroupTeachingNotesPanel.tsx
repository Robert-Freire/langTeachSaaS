import { useState } from 'react'
import { Brain } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { updateGroupTeachingNotes } from '@/api/groups'
import { formatMonthYear } from '@/utils/formatDate'

interface Props {
  groupId: string
  teachingNotes: string | null
  createdAt: string
  onNotesChange: () => void
}

export function GroupTeachingNotesPanel({ groupId, teachingNotes, createdAt, onNotesChange }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)

  const saveMutation = useMutation({
    mutationFn: (notes: string | null) => updateGroupTeachingNotes(groupId, notes),
    onSuccess: () => {
      setEditing(false)
      setSaveError(null)
      onNotesChange()
    },
    onError: () => {
      setSaveError('Could not save. Please try again.')
    },
  })

  function handleEdit() {
    setDraft(teachingNotes ?? '')
    setEditing(true)
  }

  function handleSave() {
    saveMutation.mutate(draft.trim() || null)
  }

  return (
    <section
      className="rounded-3xl p-8 text-white relative overflow-hidden"
      style={{ background: '#1A1B22' }}
      data-testid="group-teaching-notes-panel"
    >
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-9">
          <h3 className="text-base font-bold font-manrope mb-4 flex items-center gap-2 text-[#C3C0FF]">
            <Brain className="h-4 w-4" />
            Teacher&apos;s Working Memory
          </h3>

          {editing ? (
            <div className="space-y-3">
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                rows={5}
                className="w-full rounded-xl bg-white/10 border border-white/20 text-white text-sm p-3 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-400 placeholder:text-white/40"
                placeholder="Ideas for next class with the group..."
                data-testid="teaching-notes-textarea"
                autoFocus
              />
              {saveError && <p className="text-sm text-red-300">{saveError}</p>}
              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className="rounded-xl px-4 py-1.5 font-bold"
                  data-testid="teaching-notes-save-btn"
                >
                  Save
                </Button>
                <button
                  onClick={() => setEditing(false)}
                  className="rounded-xl bg-white/10 hover:bg-white/20 px-4 py-1.5 text-sm font-medium transition-all"
                  data-testid="teaching-notes-cancel-btn"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {teachingNotes ? (
                <p
                  className="text-sm text-zinc-400 leading-relaxed mb-5"
                  data-testid="teaching-notes-text"
                >
                  {teachingNotes}
                </p>
              ) : (
                <p className="text-sm text-zinc-600 italic mb-5" data-testid="teaching-notes-empty">
                  No notes yet.
                </p>
              )}
              <Button
                onClick={handleEdit}
                className="rounded-xl px-5 py-2 font-bold"
                data-testid="add-memory-btn"
              >
                Add Memory
              </Button>
            </>
          )}
        </div>

        <div className="md:col-span-3">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5 h-full flex flex-col justify-center">
            <h4 className="text-[0.6875rem] font-bold uppercase tracking-widest text-zinc-400 mb-3">
              Lifecycle
            </h4>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Group Since</span>
              <span className="font-bold text-white" data-testid="group-since">
                {formatMonthYear(createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
