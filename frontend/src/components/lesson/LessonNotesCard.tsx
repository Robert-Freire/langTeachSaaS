import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import { getLessonNotes, saveLessonNotes, type SaveLessonNotesRequest } from '../../api/lessons'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface LessonNotesCardProps {
  lessonId: string
  studentId: string | null
}

const FIELDS = [
  { key: 'whatWasCovered' as const, label: 'What was covered' },
  { key: 'homeworkAssigned' as const, label: 'Homework assigned' },
  { key: 'areasToImprove' as const, label: 'Areas to improve' },
  { key: 'nextLessonIdeas' as const, label: 'Next lesson ideas' },
]

export function LessonNotesCard({ lessonId, studentId }: LessonNotesCardProps) {
  const [form, setForm] = useState<SaveLessonNotesRequest>({
    whatWasCovered: '',
    homeworkAssigned: '',
    areasToImprove: '',
    nextLessonIdeas: '',
  })
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef<string>('')

  const { data: notes } = useQuery({
    queryKey: ['lessonNotes', lessonId],
    queryFn: () => getLessonNotes(lessonId),
    enabled: !!studentId,
  })

  useEffect(() => {
    if (notes) {
      const loaded = {
        whatWasCovered: notes.whatWasCovered ?? '',
        homeworkAssigned: notes.homeworkAssigned ?? '',
        areasToImprove: notes.areasToImprove ?? '',
        nextLessonIdeas: notes.nextLessonIdeas ?? '',
      }
      setForm(loaded)
      lastSavedRef.current = JSON.stringify(loaded)
    }
  }, [notes])

  const { mutate: doSave } = useMutation({
    mutationFn: (data: SaveLessonNotesRequest) => saveLessonNotes(lessonId, data),
    onSuccess: (_result, variables) => {
      lastSavedRef.current = JSON.stringify(variables)
      setSavedAt(Date.now())
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setSavedAt(null), 2500)
    },
  })

  if (!studentId) return null

  function handleBlur() {
    if (JSON.stringify(form) === lastSavedRef.current) return
    doSave(form)
  }

  return (
    <Card className="bg-amber-50/50 border border-amber-200" data-testid="lesson-notes-card">
      <CardHeader className="py-3 px-6 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-amber-900">Lesson Notes</CardTitle>
          {savedAt && (
            <span className="text-xs text-green-600 flex items-center gap-1" data-testid="notes-saved-indicator">
              <Save className="h-3 w-3" /> Saved
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-4 space-y-3">
        {FIELDS.map(({ key, label }) => (
          <div key={key} className="space-y-1">
            <Label className="text-xs text-amber-800">{label}</Label>
            <Textarea
              value={form[key] ?? ''}
              onChange={(e) => setForm(prev => ({ ...prev, [key]: e.target.value }))}
              onBlur={handleBlur}
              placeholder={`${label}...`}
              rows={2}
              className="resize-none text-sm bg-white/70"
              data-testid={`notes-${key}`}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
