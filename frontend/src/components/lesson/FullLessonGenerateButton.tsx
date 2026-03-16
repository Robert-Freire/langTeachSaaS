import { useState, useRef, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { streamText } from '../../lib/streamText'
import { saveContentBlock, type ContentBlockDto } from '../../api/generate'
import type { LessonSection } from '../../api/lessons'
import type { ContentBlockType } from '../../types/contentTypes'

const SECTION_TASK_MAP: Record<string, ContentBlockType> = {
  WarmUp: 'vocabulary',
  Presentation: 'grammar',
  Practice: 'exercises',
  Production: 'conversation',
  WrapUp: 'homework',
}

const SECTION_ORDER = ['WarmUp', 'Presentation', 'Practice', 'Production', 'WrapUp']

const SECTION_LABELS: Record<string, string> = {
  WarmUp: 'Warm Up',
  Presentation: 'Presentation',
  Practice: 'Practice',
  Production: 'Production',
  WrapUp: 'Wrap Up',
}

type Phase = 'idle' | 'confirming' | 'generating' | 'done' | 'error'

interface FullLessonGenerateButtonProps {
  lessonId: string
  sections: LessonSection[]
  lessonContext: {
    language: string
    cefrLevel: string
    topic: string
    studentId?: string
  }
  onBlockSaved: (block: ContentBlockDto) => void
}

export function FullLessonGenerateButton({
  lessonId,
  sections,
  lessonContext,
  onBlockSaved,
}: FullLessonGenerateButtonProps) {
  const { getAccessTokenSilently } = useAuth0()
  const [phase, setPhase] = useState<Phase>('idle')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sectionStatus, setSectionStatus] = useState<Record<string, 'pending' | 'active' | 'done' | 'error'>>({})
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const doneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (doneTimerRef.current) clearTimeout(doneTimerRef.current)
  }, [])

  const disabled = !lessonContext.topic.trim() || !lessonContext.language.trim()

  const handleConfirm = async () => {
    setPhase('generating')
    setCurrentIndex(0)
    setSectionStatus(Object.fromEntries(SECTION_ORDER.map(s => [s, 'pending'])))

    const controller = new AbortController()
    abortRef.current = controller

    let token: string
    try {
      token = await getAccessTokenSilently()
    } catch {
      setErrorMessage('Failed to get auth token.')
      setPhase('error')
      return
    }

    for (let i = 0; i < SECTION_ORDER.length; i++) {
      const sectionType = SECTION_ORDER[i]
      const section = sections.find(s => s.sectionType === sectionType)
      if (!section) {
        setSectionStatus(prev => ({ ...prev, [sectionType]: 'error' }))
        setErrorMessage(`Section "${sectionType}" not found.`)
        setPhase('error')
        return
      }

      const taskType = SECTION_TASK_MAP[sectionType]
      setSectionStatus(prev => ({ ...prev, [sectionType]: 'active' }))
      setCurrentIndex(i)

      try {
        const content = await streamText(
          taskType,
          {
            lessonId,
            language: lessonContext.language,
            cefrLevel: lessonContext.cefrLevel,
            topic: lessonContext.topic,
            studentId: lessonContext.studentId,
          },
          token,
          controller.signal,
        )

        const block = await saveContentBlock(lessonId, {
          lessonSectionId: section.id,
          blockType: taskType,
          generatedContent: content,
          generationParams: JSON.stringify({
            lessonId,
            language: lessonContext.language,
            cefrLevel: lessonContext.cefrLevel,
            topic: lessonContext.topic,
            studentId: lessonContext.studentId,
          }),
        })

        onBlockSaved(block)
        setSectionStatus(prev => ({ ...prev, [sectionType]: 'done' }))
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setPhase('idle')
          return
        }
        setSectionStatus(prev => ({ ...prev, [sectionType]: 'error' }))
        setErrorMessage(err instanceof Error ? err.message : 'Generation failed.')
        setPhase('error')
        return
      }
    }

    setPhase('done')
    doneTimerRef.current = setTimeout(() => setPhase('idle'), 2000)
  }

  const handleCancel = () => {
    abortRef.current?.abort()
    setPhase('idle')
  }

  const dialogOpen = phase === 'confirming' || phase === 'generating' || phase === 'done' || phase === 'error'

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setPhase('confirming')}
        disabled={disabled}
        data-testid="generate-full-lesson-btn"
        className="gap-1.5 text-xs"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Generate Full Lesson
      </Button>

      <AlertDialog open={dialogOpen} onOpenChange={(open) => { if (!open) handleCancel() }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {phase === 'confirming' && 'Generate Full Lesson?'}
              {phase === 'generating' && 'Generating lesson...'}
              {phase === 'done' && 'Lesson generated!'}
              {phase === 'error' && 'Generation failed'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {phase === 'confirming' && (
                'This will generate content for all 5 sections. Existing notes will be preserved as context.'
              )}
              {phase === 'error' && (errorMessage ?? 'An error occurred.')}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {(phase === 'generating' || phase === 'done') && (
            <div className="px-1 py-2 space-y-2" data-testid="generation-progress">
              <div className="text-xs text-zinc-500 mb-1">
                {phase === 'done' ? 'All sections complete' : `${currentIndex + 1} / ${SECTION_ORDER.length}`}
              </div>
              <ol className="space-y-1">
                {SECTION_ORDER.map((s) => {
                  const status = sectionStatus[s] ?? 'pending'
                  return (
                    <li key={s} className="flex items-center gap-2 text-sm">
                      <span className="w-4 text-center" aria-hidden>
                        {status === 'done' && '✓'}
                        {status === 'active' && (
                          <svg className="h-3 w-3 animate-spin text-indigo-500 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        )}
                        {status === 'pending' && '·'}
                        {status === 'error' && '✕'}
                      </span>
                      <span className={status === 'done' ? 'text-green-700' : status === 'active' ? 'text-indigo-700 font-medium' : 'text-zinc-400'}>
                        {SECTION_LABELS[s]}
                      </span>
                    </li>
                  )
                })}
              </ol>
            </div>
          )}

          <AlertDialogFooter>
            {phase === 'confirming' && (
              <>
                <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirm}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  data-testid="confirm-generate-full-lesson"
                >
                  Generate
                </AlertDialogAction>
              </>
            )}
            {phase === 'generating' && (
              <button
                onClick={handleCancel}
                className="text-xs text-zinc-500 underline hover:text-zinc-700"
              >
                Cancel
              </button>
            )}
            {(phase === 'done' || phase === 'error') && (
              <AlertDialogAction onClick={() => {
                if (doneTimerRef.current) clearTimeout(doneTimerRef.current)
                setPhase('idle')
              }}>
                Close
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
