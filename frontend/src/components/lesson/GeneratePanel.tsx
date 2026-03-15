import { useState } from 'react'
import type { SectionType } from '../../api/lessons'
import {
  saveContentBlock,
  type ContentBlockDto,
  type GenerateRequest,
} from '../../api/generate'
import { useGenerate } from '../../hooks/useGenerate'
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
import { Input } from '@/components/ui/input'

const SECTION_DEFAULT_TASK: Record<SectionType, string> = {
  WarmUp: 'conversation',
  Presentation: 'vocabulary',
  Practice: 'exercises',
  Production: 'grammar',
  WrapUp: 'conversation',
}

const TASK_TYPES = [
  { value: 'vocabulary', label: 'Vocabulary' },
  { value: 'grammar', label: 'Grammar' },
  { value: 'exercises', label: 'Exercises' },
  { value: 'conversation', label: 'Conversation' },
  { value: 'reading', label: 'Reading' },
]

interface GeneratePanelProps {
  lessonId: string
  sectionId: string
  sectionType: SectionType
  initialTaskType?: string
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
  lessonContext,
  onInsert,
  onClose,
}: GeneratePanelProps) {
  const [taskType, setTaskType] = useState(initialTaskType ?? SECTION_DEFAULT_TASK[sectionType])
  const [style, setStyle] = useState('Conversational')
  const [inserting, setInserting] = useState(false)
  const [insertError, setInsertError] = useState<string | null>(null)

  const { status, output, error, generate, abort } = useGenerate()

  const handleGenerate = () => {
    const request: GenerateRequest = {
      lessonId,
      language: lessonContext.language,
      cefrLevel: lessonContext.cefrLevel,
      topic: lessonContext.topic,
      style,
      studentId: lessonContext.studentId ?? undefined,
      existingNotes: lessonContext.existingNotes ?? undefined,
    }
    generate(taskType, request)
  }

  const handleInsert = async () => {
    if (!output) return
    setInserting(true)
    setInsertError(null)
    try {
      const request: GenerateRequest = {
        lessonId,
        language: lessonContext.language,
        cefrLevel: lessonContext.cefrLevel,
        topic: lessonContext.topic,
        style,
        studentId: lessonContext.studentId ?? undefined,
        existingNotes: lessonContext.existingNotes ?? undefined,
      }
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
          <Select value={taskType} onValueChange={(v) => v && setTaskType(v)} disabled={isStreaming}>
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

      {(isStreaming || isDone || isError || output) && (
        <Textarea
          value={output}
          readOnly
          rows={6}
          className="resize-none text-xs bg-white"
          placeholder="Generated content will appear here..."
          data-testid="generate-output"
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
