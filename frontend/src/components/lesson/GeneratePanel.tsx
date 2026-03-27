import { useState, useMemo, useEffect } from 'react'
import { usePartialJsonParse } from '../../hooks/usePartialJsonParse'
import type { SectionType } from '../../api/lessons'
import { getAllowedContentTypes } from '../../utils/sectionContentTypes'
import {
  saveContentBlock,
  deleteContentBlock,
  type ContentBlockDto,
  type GenerateRequest,
} from '../../api/generate'
import { useGenerate } from '../../hooks/useGenerate'
import { useProfile } from '../../hooks/useProfile'
import { useQueryClient } from '@tanstack/react-query'
import { getRenderer } from './contentRegistry'
import { ContentErrorBoundary } from './ContentErrorBoundary'
import type { ContentBlockType } from '../../types/contentTypes'
import type { TargetedDifficulty } from '../../api/generate'
import { TargetedDifficulties } from './TargetedDifficulties'
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

const SECTION_DEFAULT_TASK: Record<SectionType, ContentBlockType> = {
  WarmUp: 'free-text',
  Presentation: 'vocabulary',
  Practice: 'exercises',
  Production: 'free-text',
  WrapUp: 'free-text',
}

const TASK_TYPES: { value: ContentBlockType; label: string }[] = [
  { value: 'vocabulary', label: 'Vocabulary' },
  { value: 'grammar', label: 'Grammar' },
  { value: 'exercises', label: 'Exercises' },
  { value: 'conversation', label: 'Conversation' },
  { value: 'reading', label: 'Reading' },
  { value: 'homework', label: 'Homework' },
  { value: 'free-text', label: 'Free activity' },
]

const DIRECTION_OPTIONS = [
  'Make it easier',
  'Make it harder',
  'Make it shorter',
  'Make it longer',
  'More formal',
  'More conversational',
] as const

interface GeneratePanelProps {
  lessonId: string
  sectionId: string
  sectionType: SectionType
  existingBlocks: ContentBlockDto[]
  lessonContext: {
    language: string
    cefrLevel: string
    topic: string
    studentId?: string | null
    existingNotes?: string | null
    studentDifficulties?: TargetedDifficulty[]
  }
  onReplace: (newBlock: ContentBlockDto, replacedBlockIds: string[]) => void
  onClose: () => void
  onStreamingChange?: (isStreaming: boolean) => void
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1" aria-label="Generating...">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  )
}

export function GeneratePanel({
  lessonId,
  sectionId,
  sectionType,
  existingBlocks,
  lessonContext,
  onReplace,
  onClose,
  onStreamingChange,
}: GeneratePanelProps) {
  const inferredType = (existingBlocks[0]?.blockType ?? null) as ContentBlockType | null
  const [taskType, setTaskType] = useState<ContentBlockType>(
    inferredType ?? SECTION_DEFAULT_TASK[sectionType]
  )
  const [style, setStyle] = useState('Conversational')
  const [direction, setDirection] = useState<string | undefined>(undefined)
  const [grammarConstraints, setGrammarConstraints] = useState<string | undefined>(undefined)
  const [inserting, setInserting] = useState(false)
  const [insertError, setInsertError] = useState<string | null>(null)

  const { data: profile } = useProfile()
  const queryClient = useQueryClient()
  const { status, output, error, quotaExceeded, generate, abort } = useGenerate()

  const quotaLimit = profile?.generationsMonthlyLimit ?? -1
  const quotaUsed = profile?.generationsUsedThisMonth ?? 0
  const isQuotaExhausted = quotaLimit >= 0 && quotaUsed >= quotaLimit

  const request: GenerateRequest = useMemo(() => ({
    lessonId,
    language: lessonContext.language,
    cefrLevel: lessonContext.cefrLevel,
    topic: lessonContext.topic,
    style,
    studentId: lessonContext.studentId ?? undefined,
    existingNotes: lessonContext.existingNotes ?? undefined,
    direction,
    grammarConstraints,
    sectionType,
  }), [lessonId, lessonContext, style, direction, grammarConstraints, sectionType])

  const handleGenerate = () => {
    generate(taskType, request)
  }

  const handleInsertOrReplace = async () => {
    if (!output) return
    setInserting(true)
    setInsertError(null)
    try {
      // Save new block first to avoid data loss if delete fails
      const block = await saveContentBlock(lessonId, {
        lessonSectionId: sectionId,
        blockType: taskType,
        generatedContent: output,
        generationParams: JSON.stringify({
          ...request,
          targetedDifficulties: lessonContext.studentDifficulties,
        }),
      })
      // Then delete old blocks (if any fail, user has duplicates rather than data loss)
      const removedIds: string[] = []
      if (existingBlocks.length > 0) {
        const results = await Promise.allSettled(
          existingBlocks.map(b => deleteContentBlock(lessonId, b.id))
        )
        results.forEach((result, i) => {
          if (result.status === 'fulfilled') {
            removedIds.push(existingBlocks[i].id)
          }
        })
      }
      onReplace(block, removedIds)
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      onClose()
    } catch {
      setInsertError('Failed to save. Please try again.')
    } finally {
      setInserting(false)
    }
  }

  const allowedTypes = useMemo(
    () => getAllowedContentTypes(sectionType, lessonContext.cefrLevel),
    [sectionType, lessonContext.cefrLevel]
  )

  const filteredTaskTypes = useMemo(
    () => TASK_TYPES.filter(t => allowedTypes.includes(t.value)),
    [allowedTypes]
  )

  useEffect(() => {
    setTaskType(current => allowedTypes.includes(current) ? current : allowedTypes[0])
  }, [allowedTypes])

  const isStreaming = status === 'streaming'
  const isDone = status === 'done'
  const isError = status === 'error'

  const renderer = getRenderer(taskType)
  const partialContent = usePartialJsonParse(output ?? '', taskType)

  useEffect(() => {
    onStreamingChange?.(isStreaming)
  }, [isStreaming, onStreamingChange])

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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Task type</Label>
          {filteredTaskTypes.length === 1 ? (
            <div
              className="h-8 flex items-center px-3 text-xs rounded-md border border-input bg-muted text-muted-foreground"
              data-testid="task-type-readonly"
            >
              {filteredTaskTypes[0].label}
            </div>
          ) : (
            <Select value={taskType} onValueChange={(v) => v && setTaskType(v as ContentBlockType)} disabled={isStreaming}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filteredTaskTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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

      <div className="space-y-1">
        <Label className="text-xs">Grammar constraints (optional)</Label>
        <Textarea
          value={grammarConstraints ?? ''}
          onChange={(e) => setGrammarConstraints(e.target.value || undefined)}
          disabled={isStreaming}
          rows={2}
          maxLength={500}
          className="resize-none text-xs"
          placeholder="e.g. include subjunctive, only regular verbs, avoid passive voice"
          data-testid="grammar-constraints-textarea"
        />
      </div>

      {existingBlocks.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2" data-testid="replace-indicator">
            <svg className="h-4 w-4 text-amber-500 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
            </svg>
            <span className="text-xs text-amber-700">
              Generating will replace {existingBlocks.length} existing block{existingBlocks.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Direction (optional)</Label>
            <Textarea
              value={direction ?? ''}
              onChange={(e) => setDirection(e.target.value || undefined)}
              disabled={isStreaming}
              rows={2}
              maxLength={200}
              className="resize-none text-xs"
              placeholder="e.g. Make it easier, focus on pronunciation..."
              data-testid="direction-textarea"
            />
            <div className="flex flex-nowrap overflow-x-auto sm:flex-wrap gap-1.5" data-testid="direction-chips">
              {DIRECTION_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setDirection(opt)}
                  disabled={isStreaming}
                  className={`shrink-0 px-2 py-0.5 text-xs rounded-full border transition-colors disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 ${
                    direction === opt
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-700 font-medium'
                      : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50'
                  }`}
                  data-testid={`direction-chip-${opt.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isStreaming && (
        partialContent
          ? (
            <div className="rounded-md bg-white border border-indigo-100 overflow-hidden" data-testid="generate-output">
              <div className="p-4 space-y-2">
                <ContentErrorBoundary key={`${taskType}:${output?.length ?? 0}`} blockType={taskType}>
                  <renderer.Preview rawContent={output ?? ''} parsedContent={partialContent} />
                </ContentErrorBoundary>
                <TypingIndicator />
              </div>
            </div>
          )
          : (
            <div className="flex items-center gap-3 rounded-md bg-white border border-indigo-100 px-4 py-5" role="status" aria-live="polite" data-testid="generate-output">
              <svg className="h-4 w-4 animate-spin text-indigo-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm text-zinc-500">Generating {taskType} content...</span>
            </div>
          )
      )}

      {isDone && output && (() => {
        let parsedContent: unknown = null
        try {
          const raw = output.replace(/^```json\s*/, '').replace(/```\s*$/, '')
          parsedContent = JSON.parse(raw)
        } catch { /* fall through to raw display */ }

        return (
          <div className="rounded-md bg-white border border-green-200 overflow-hidden" data-testid="generate-output">
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border-b border-green-200">
              <svg className="h-4 w-4 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-xs font-medium text-green-700">Generated preview</span>
              <TargetedDifficulties difficulties={lessonContext.studentDifficulties} />
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

      {isError && !quotaExceeded && (
        <p className="text-xs text-red-600" data-testid="generate-error">{error ?? 'Generation failed.'}</p>
      )}

      {(isQuotaExhausted || quotaExceeded) && (
        <p className="text-xs text-red-600" data-testid="quota-exhausted-msg">
          {error ?? 'Monthly generation limit reached. Upgrade for more generations.'}
        </p>
      )}

      <div className="flex items-center gap-2">
        {!isStreaming && !isDone && (
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={isQuotaExhausted || quotaExceeded}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
            data-testid="generate-btn"
          >
            {isError && !quotaExceeded ? 'Retry' : 'Generate'}
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
              onClick={handleInsertOrReplace}
              disabled={inserting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
              data-testid="insert-btn"
            >
              {inserting
                ? (existingBlocks.length > 0 ? 'Replacing...' : 'Inserting...')
                : (existingBlocks.length > 0 ? 'Replace & insert' : 'Insert into section')}
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
