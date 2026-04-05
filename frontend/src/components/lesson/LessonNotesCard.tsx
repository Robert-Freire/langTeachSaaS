import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Save, Loader2 } from 'lucide-react'
import { getLessonNotes, saveLessonNotes, extractReflectionNotes, type SaveLessonNotesRequest, type ExtractedReflection } from '../../api/lessons'
import { type VoiceNote } from '../../api/voiceNotes'
import { AudioRecorder } from '../audio/AudioRecorder'
import { SuggestedNotesPanel } from './SuggestedNotesPanel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

interface LessonNotesCardProps {
  lessonId: string
  studentId: string | null
}

const FIELDS: { key: keyof SaveLessonNotesRequest; label: string }[] = [
  { key: 'whatWasCovered', label: 'What was covered' },
  { key: 'areasToImprove', label: 'Areas to improve' },
  { key: 'emotionalSignals', label: 'Emotional observations' },
  { key: 'homeworkAssigned', label: 'Homework assigned' },
  { key: 'nextLessonIdeas', label: 'Next lesson ideas' },
]

export function LessonNotesCard({ lessonId, studentId }: LessonNotesCardProps) {
  const [form, setForm] = useState<SaveLessonNotesRequest>({
    whatWasCovered: '',
    areasToImprove: '',
    emotionalSignals: '',
    homeworkAssigned: '',
    nextLessonIdeas: '',
  })
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef<string>('')

  const [voiceNote, setVoiceNote] = useState<VoiceNote | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [suggestions, setSuggestions] = useState<ExtractedReflection | null>(null)

  const { data: notes } = useQuery({
    queryKey: ['lessonNotes', lessonId],
    queryFn: () => getLessonNotes(lessonId),
    enabled: !!studentId,
  })

  // Sync server data to local form state
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (notes) {
      const loaded = {
        whatWasCovered: notes.whatWasCovered ?? '',
        areasToImprove: notes.areasToImprove ?? '',
        emotionalSignals: notes.emotionalSignals ?? '',
        homeworkAssigned: notes.homeworkAssigned ?? '',
        nextLessonIdeas: notes.nextLessonIdeas ?? '',
      }
      setForm(loaded)
      lastSavedRef.current = JSON.stringify(loaded)
    }
  }, [notes])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

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

  function handleVoiceNote(note: VoiceNote) {
    setVoiceNote(note)
    setSuggestions(null)
  }

  async function handleExtract() {
    if (!voiceNote?.transcription) return
    setExtracting(true)
    try {
      const extracted = await extractReflectionNotes(lessonId, voiceNote.transcription)
      setSuggestions(extracted)
    } finally {
      setExtracting(false)
    }
  }

  function handleApplySuggestions(values: Partial<SaveLessonNotesRequest>) {
    const updated = { ...form, ...values }
    setForm(updated)
    setSuggestions(null)
    doSave(updated)
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

        <div className="pt-2 border-t border-amber-200 space-y-3" data-testid="voice-input-section">
          <p className="text-xs text-amber-700 font-medium">Or record a voice note</p>
          <AudioRecorder onVoiceNote={handleVoiceNote} />

          {voiceNote?.transcription && (
            <div className="space-y-2">
              <div className="rounded-md bg-white/60 border border-amber-200 p-2">
                <p className="text-xs text-amber-700 font-medium mb-1">Transcription</p>
                <p className="text-xs text-amber-900 line-clamp-3" data-testid="voice-note-transcription">
                  {voiceNote.transcription}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
                onClick={handleExtract}
                disabled={extracting}
                data-testid="extract-notes-button"
              >
                {extracting ? (
                  <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Extracting notes...</>
                ) : (
                  'Extract notes from transcription'
                )}
              </Button>
            </div>
          )}

          {suggestions && (
            <SuggestedNotesPanel
              suggestions={suggestions}
              onApplyAll={handleApplySuggestions}
              onDismiss={() => setSuggestions(null)}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
