import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { getGroup, createGroupSession } from '@/api/groups'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
function todayLocal(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function GroupLogSession() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [sessionDate, setSessionDate] = useState<string>(todayLocal())
  const [title, setTitle] = useState('')
  const [actualContent, setActualContent] = useState('')
  const [generalNotes, setGeneralNotes] = useState('')
  const [duration, setDuration] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)

  const { data: group, isLoading } = useQuery({
    queryKey: ['group', id],
    queryFn: () => getGroup(id!),
    enabled: !!id,
  })

  const saveMutation = useMutation({
    mutationFn: () =>
      createGroupSession(id!, {
        sessionDate: sessionDate ? new Date(sessionDate + 'T12:00:00').toISOString() : null,
        title: title.trim() || null,
        actualContent: actualContent.trim() || null,
        generalNotes: generalNotes.trim() || null,
        duration: duration ? parseInt(duration, 10) : null,
        status: 'Confirmed',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-sessions', id] })
      navigate(`/groups/${id}?tab=sessions`)
    },
    onError: () => {
      setSaveError('Could not save session. Please try again.')
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F6FC]">
      <div className="bg-white border-b border-zinc-100 px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <Link
            to={`/groups/${id}`}
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 mb-4"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to {group?.name ?? 'Group'}
          </Link>
          <h1 className="text-xl font-bold font-manrope text-[#1A1B22]">Log Group Session</h1>
          {group?.name && (
            <p className="text-sm text-zinc-500 mt-0.5">{group.name}</p>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6 space-y-5">
        <div className="bg-white rounded-2xl p-6 space-y-4" style={{ boxShadow: '0 12px 40px rgba(26, 27, 34, 0.06)' }}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="session-date">Date</Label>
              <Input
                id="session-date"
                type="date"
                value={sessionDate}
                onChange={e => setSessionDate(e.target.value)}
                data-testid="session-date-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="session-duration">Duration (minutes)</Label>
              <Input
                id="session-duration"
                type="number"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                placeholder="60"
                min={1}
                data-testid="session-duration-input"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="session-title">Session title (optional)</Label>
            <Input
              id="session-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Subjunctive review"
              data-testid="session-title-input"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="actual-content">What was covered</Label>
            <Textarea
              id="actual-content"
              value={actualContent}
              onChange={e => setActualContent(e.target.value)}
              placeholder="Topics covered in the session..."
              rows={4}
              data-testid="actual-content-input"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="general-notes">Notes</Label>
            <Textarea
              id="general-notes"
              value={generalNotes}
              onChange={e => setGeneralNotes(e.target.value)}
              placeholder="General observations about the group..."
              rows={3}
              data-testid="general-notes-input"
            />
          </div>
        </div>

        {saveError && (
          <p className="text-sm text-red-600">{saveError}</p>
        )}

        <div className="flex gap-3">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="gap-1.5"
            data-testid="save-session-btn"
          >
            {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Session
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/groups/${id}`)}
            disabled={saveMutation.isPending}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
