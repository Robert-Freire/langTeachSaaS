import { useState, useMemo } from 'react'
import type { SectionType } from '../../api/lessons'
import {
  saveContentBlock,
  type ContentBlockDto,
  type GenerateRequest,
} from '../../api/generate'
import { useGenerate } from '../../hooks/useGenerate'
import { getRenderer } from './contentRegistry'
import { ContentErrorBoundary } from './ContentErrorBoundary'
import type { ContentBlockType } from '../../types/contentTypes'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

const SECTION_DEFAULT_TASK: Record<SectionType, ContentBlockType> = {
  WarmUp: 'conversation',
  Presentation: 'vocabulary',
  Practice: 'exercises',
  Production: 'grammar',
  WrapUp: 'homework',
}

const TASK_TYPES: { value: ContentBlockType; label: string }[] = [
  { value: 'vocabulary', label: 'Vocabulary' },
  { value: 'grammar', label: 'Grammar' },
  { value: 'exercises', label: 'Exercises' },
  { value: 'conversation', label: 'Conversation' },
  { value: 'reading', label: 'Reading' },
  { value: 'homework', label: 'Homework' },
]

interface GeneratePanelProps {
  lessonId: string
  sectionId: string
  sectionType: SectionType
  initialTaskType?: ContentBlockType
  initialStyle?: string
  initialDirection?: string
  lessonContext: {
    language: string
    cefrLevel: string
    topic: string
    studentId?: string | null
    existingNotes?: string | null
  }
  onInsert: (block: ContentBlockDto) => void
  onClose: () => void
}

export function GeneratePanel({
  lessonId,
  sectionId,
  sectionType,
  initialTaskType,
  initialStyle,
  initialDirection,
  lessonContext,
  onInsert,
  onClose,
}: GeneratePanelProps) {
  const [taskType, setTaskType] = useState<ContentBlockType>(initialTaskType ?? SECTION_DEFAULT_TASK[sectionType])
  const [style, setStyle] = useState(initialStyle ?? 'Conversational')
  const [direction, setDirection] = useState<string | undefined>(initialDirection)
  const [inserting, setInserting] = useState(false)
  const [insertError, setInsertError] = useState<string | null>(null)

  const { status, output, error, generate, abort } = useGenerate()

  const request: GenerateRequest = useMemo(() => ({
    lessonId,
    language: lessonContext.language,
    cefrLevel: lessonContext.cefrLevel,
    topic: lessonContext.topic,
    style,
    studentId: lessonContext.studentId ?? undefined,
    existingNotes: lessonContext.existingNotes ?? undefined,
    direction,
  }), [lessonId, lessonContext, style, direction])

  const handleGenerate = () => {
    generate(taskType, request)
  }

  const handleInsert = async () => {
    if (!output) return
    setInserting(true)
    setInsertError(null)
    try {
      const block = await saveContentBlock(lessonId, {
        lessonSectionId: sectionId,
        blockType: taskType,
        generatedContent: output,
        generationParams: JSON.stringify(request),
      })
      onInsert(block)
      onClose()
    } catch {
      setInsertError('Failed to save. Please try again.')
    } finally {
      setInserting(false)
    }
  }

  const isStreaming = status === 'streaming'
  const isDone = status === 'done'
  const isError = status === 'error'

  return (
    <div
      className="border border-indigo-200 rounded-lg p-4 bg-indigo-50 space-y-3"
      data-testid="generate-panel"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-indigo-700">Generate with AI</span>
        <button
          onClick={onClose}
          className="text-xs text-zinc-400 hover:text-zinc-600"
          aria-label="Close generate panel"
        >
          Close
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Task type</Label>
          <Select value={taskType} onValueChange={(v) => v && setTaskType(v as ContentBlockType)} disabled={isStreaming}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Style</Label>
          <Input
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            disabled={isStreaming}
            className="h-8 text-xs"
            placeholder="e.g. Conversational"
          />
        </div>
      </div>

      {direction && (
        <div className="flex items-center gap-1.5" data-testid="direction-badge">
          <span className="text-xs text-zinc-500">Direction:</span>
          <Badge variant="outline" className="text-xs border-indigo-200 bg-indigo-50 text-indigo-700">
            {direction}
            <button
              onClick={() => setDirection(undefined)}
              className="ml-1 text-indigo-400 hover:text-indigo-700"
              aria-label="Clear direction"
            >
              &times;
            </button>
          </Badge>
        </div>
      )}

      {isStreaming && (
        <div className="flex items-center gap-3 rounded-md bg-white border border-indigo-100 px-4 py-5" role="status" aria-live="polite" data-testid="generate-output">
          <svg className="h-4 w-4 animate-spin text-indigo-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm text-zinc-500">Generating {taskType} content...</span>
        </div>
      )}

      {isDone && output && (() => {
        let parsedContent: unknown = null
        try {
          const raw = output.replace(/^```json\s*/, '').replace(/```\s*$/, '')
          parsedContent = JSON.parse(raw)
        } catch { /* fall through to raw display */ }

        const renderer = getRenderer(taskType)
        return (
          <div className="rounded-md bg-white border border-green-200 overflow-hidden" data-testid="generate-output">
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border-b border-green-200">
              <svg className="h-4 w-4 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-xs font-medium text-green-700">Generated preview</span>
            </div>
            <div className="p-4">
              <ContentErrorBoundary blockType={taskType}>
                <renderer.Preview rawContent={output} parsedContent={parsedContent} />
              </ContentErrorBoundary>
            </div>
          </div>
        )
      })()}

      {isError && output && (
        <Textarea
          value={output}
          readOnly
          rows={6}
          className="resize-none text-xs bg-white"
          placeholder="Generated content will appear here..."
        />
      )}

      {isError && (
        <p className="text-xs text-red-600">{error ?? 'Generation failed.'}</p>
      )}

      <div className="flex items-center gap-2">
        {!isStreaming && !isDone && (
          <Button
            size="sm"
            onClick={handleGenerate}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
            data-testid="generate-btn"
          >
            {isError ? 'Retry' : 'Generate'}
          </Button>
        )}

        {isStreaming && (
          <button
            onClick={abort}
            className="text-xs text-zinc-500 underline hover:text-zinc-700"
          >
            Cancel
          </button>
        )}

        {isDone && (
          <>
            <Button
              size="sm"
              onClick={handleInsert}
              disabled={inserting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
              data-testid="insert-btn"
            >
              {inserting ? 'Inserting...' : 'Insert into section'}
            </Button>
            <button
              onClick={onClose}
              className="text-xs text-zinc-500 underline hover:text-zinc-700"
            >
              Discard
            </button>
          </>
        )}
      </div>

      {insertError && (
        <p className="text-xs text-red-600">{insertError}</p>
      )}
    </div>
  )
}
