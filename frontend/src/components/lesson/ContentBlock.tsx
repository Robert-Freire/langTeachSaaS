import { useState, useEffect, useRef, useMemo, type KeyboardEvent } from 'react'
import {
  updateEditedContent,
  deleteContentBlock,
  resetEditedContent,
  type ContentBlockDto,
} from '../../api/generate'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getRenderer } from './contentRegistry'
import { ContentErrorBoundary } from './ContentErrorBoundary'
import { TargetedDifficulties } from './TargetedDifficulties'
import { AlertTriangle } from 'lucide-react'

interface ContentBlockProps {
  block: ContentBlockDto
  lessonId: string
  onUpdate: (updated: ContentBlockDto) => void
  onDelete: (id: string) => void
  onRegenerate: () => void
  learningTargets?: string[] | null
  onUpdateLearningTargets?: (labels: string[]) => Promise<void>
}

type ViewMode = 'edit' | 'preview'

export function ContentBlock({
  block,
  lessonId,
  onUpdate,
  onDelete,
  onRegenerate,
  learningTargets,
  onUpdateLearningTargets,
}: ContentBlockProps) {
  const [value, setValue] = useState(block.editedContent ?? block.generatedContent)
  const [mode, setMode] = useState<ViewMode>('edit')
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const actionInProgress = useRef(false)
  const [editingTargets, setEditingTargets] = useState(false)
  const [savingTargets, setSavingTargets] = useState(false)
  const [targetsDraft, setTargetsDraft] = useState<string[]>([])
  const [newTagInput, setNewTagInput] = useState('')

  const storedValue = block.editedContent ?? block.generatedContent
  const isDirty = value !== storedValue

  useEffect(() => {
    setValue(block.editedContent ?? block.generatedContent)
  }, [block.editedContent, block.generatedContent])

  useEffect(() => {
    setEditingTargets(false)
    setTargetsDraft([])
    setNewTagInput('')
  }, [block.id, lessonId])

  const doSave = async (content: string) => {
    if (content === storedValue) return
    setSaving(true)
    try {
      const updated = await updateEditedContent(lessonId, block.id, content)
      onUpdate(updated)
      setActionError(null)
    } catch {
      setActionError('Save failed. Your changes are local only — click away to retry.')
    } finally {
      setSaving(false)
    }
  }

  const handleModeChange = async (newMode: ViewMode) => {
    if (newMode === mode) return
    if (mode !== 'preview' && !saving) {
      await doSave(value)
    }
    setMode(newMode)
  }

  const markActionIntentFromKeyboard = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      actionInProgress.current = true
    }
  }

  const handleReset = async () => {
    actionInProgress.current = false
    setResetting(true)
    setActionError(null)
    try {
      const updated = await resetEditedContent(lessonId, block.id)
      setValue(updated.generatedContent)
      onUpdate(updated)
    } catch {
      setActionError('Reset failed. Please try again.')
    } finally {
      setResetting(false)
    }
  }

  const handleDelete = async () => {
    actionInProgress.current = false
    if (isDirty && !window.confirm('You have unsaved changes. Discard them and remove this block?')) return
    setDeleting(true)
    setActionError(null)
    try {
      await deleteContentBlock(lessonId, block.id)
      onDelete(block.id)
    } catch {
      setDeleting(false)
      setActionError('Remove failed. Please try again.')
    }
  }

  const handleRegenerate = async () => {
    actionInProgress.current = false
    if (isDirty) {
      await doSave(value)
    }
    onRegenerate()
  }

  const renderer = getRenderer(block.blockType)
  const { parsedContent, isIncomplete } = useMemo(() => {
    const trimmed = value.trim()
    const candidates: string[] = [trimmed]
    for (const m of trimmed.matchAll(/```json\s*\n?([\s\S]*?)\n?```/gi)) {
      candidates.unshift(m[1].trim())
    }
    for (const m of trimmed.matchAll(/```\s*\n?([\s\S]*?)\n?```/g)) {
      candidates.push(m[1].trim())
    }
    const openMatch = trimmed.match(/```(?:json)?\s*\n([\s\S]+)$/i)
    if (openMatch) candidates.push(openMatch[1].trim())
    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(candidate)
        const coerced = renderer.coerce ? renderer.coerce(parsed) : parsed
        return { parsedContent: coerced ?? parsed, isIncomplete: false }
      } catch { /* try next */ }
    }
    // Detect truncated JSON: starts like JSON but never closed
    const looksLikeJson = /^\s*[{[]/.test(trimmed)
    const isTruncated = looksLikeJson && !trimmed.match(/[}\]]\s*$/)
    return { parsedContent: null, isIncomplete: isTruncated }
  }, [value, renderer])

  return (
    <div
      className="border border-zinc-200 rounded-lg p-3 bg-white space-y-2"
      data-testid="content-block"
    >
      {/* Header row */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge
          variant="outline"
          className="text-xs text-zinc-500 border-zinc-200"
          data-testid="ai-block-badge"
        >
          AI-generated
        </Badge>
        <span className="text-xs text-zinc-400 capitalize">{block.blockType}</span>
        <TargetedDifficulties generationParams={block.generationParams} />
        {isDirty && (
          <span className="text-xs text-amber-600 font-medium">Unsaved changes</span>
        )}
        {saving && <span className="text-xs text-zinc-400">Saving...</span>}

        {/* Mode toggle */}
        <div className="ml-auto flex items-center gap-0.5 rounded border border-zinc-200 overflow-hidden">
          {(['edit', 'preview'] as ViewMode[]).map((m) => (
            <button
              key={m}
              data-content-action="true"
              onClick={() => handleModeChange(m)}
              className={`px-2 py-0.5 text-xs transition-colors ${
                mode === m
                  ? 'bg-indigo-100 text-indigo-700 font-medium'
                  : 'text-zinc-500 hover:bg-zinc-50'
              }`}
            >
              {m === 'edit' ? 'Edit' : 'Preview'}
            </button>
          ))}
        </div>
      </div>

      {/* Learning targets row */}
      {((learningTargets && learningTargets.length > 0) || onUpdateLearningTargets) && (
        <div className="flex flex-wrap gap-1 items-center" data-testid="learning-targets">
          {!editingTargets && learningTargets?.map((label) => (
            <Badge
              key={label}
              variant="secondary"
              className="text-xs bg-teal-50 text-teal-700 border border-teal-200"
            >
              {label}
            </Badge>
          ))}
          {editingTargets && (
            <>
              {targetsDraft.map((label, i) => (
                <Badge
                  key={`${label}-${i}`}
                  variant="secondary"
                  className="text-xs bg-teal-50 text-teal-700 border border-teal-200 gap-1"
                >
                  {label}
                  <button
                    onClick={() => setTargetsDraft((prev) => prev.filter((_, j) => j !== i))}
                    className="hover:text-red-600 ml-0.5"
                    aria-label={`Remove ${label}`}
                  >
                    ×
                  </button>
                </Badge>
              ))}
              <input
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTagInput.trim()) {
                    setTargetsDraft((prev) => [...prev, newTagInput.trim()])
                    setNewTagInput('')
                  }
                }}
                placeholder="Add label…"
                className="text-xs border border-zinc-300 rounded px-1 py-0.5 w-28"
                data-testid="new-tag-input"
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-5 px-1.5 text-xs"
                data-testid="save-targets-btn"
                disabled={savingTargets}
                onClick={async () => {
                  setSavingTargets(true)
                  try {
                    await onUpdateLearningTargets!(targetsDraft)
                    setEditingTargets(false)
                  } catch {
                    setActionError('Failed to save learning targets. Please try again.')
                  } finally {
                    setSavingTargets(false)
                  }
                }}
              >
                {savingTargets ? 'Saving...' : 'Save'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-5 px-1.5 text-xs text-zinc-400"
                onClick={() => setEditingTargets(false)}
              >
                Cancel
              </Button>
            </>
          )}
          {!editingTargets && onUpdateLearningTargets && (
            <Button
              size="sm"
              variant="ghost"
              className="h-5 px-1.5 text-xs text-zinc-400"
              aria-label="Edit learning targets"
              data-testid="edit-targets-btn"
              onClick={() => {
                setTargetsDraft(learningTargets ?? [])
                setEditingTargets(true)
              }}
            >
              Edit targets
            </Button>
          )}
        </div>
      )}

      {/* Content area */}
      <ContentErrorBoundary blockType={block.blockType}>
        {mode === 'edit' && (
          <renderer.Editor
            rawContent={value}
            parsedContent={parsedContent}
            onChange={(newRaw) => {
              setValue(newRaw)
              if (actionError) setActionError(null)
            }}
            onRegenerate={handleRegenerate}
            isIncomplete={isIncomplete}
          />
        )}
        {mode === 'preview' && (
          <renderer.Preview rawContent={value} parsedContent={parsedContent} />
        )}
      </ContentErrorBoundary>

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {isDirty && (
          <Button
            variant="default"
            size="sm"
            data-content-action="true"
            onPointerDown={() => { actionInProgress.current = true }}
            onKeyDown={markActionIntentFromKeyboard}
            onClick={() => { actionInProgress.current = false; doSave(value) }}
            disabled={saving}
            className="text-xs h-7"
            data-testid="save-btn"
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        )}
        {parsedContent !== null && (
          <Button
            variant="ghost"
            size="sm"
            data-content-action="true"
            onPointerDown={() => { actionInProgress.current = true }}
            onKeyDown={markActionIntentFromKeyboard}
            onClick={handleRegenerate}
            className="text-xs h-7"
            data-testid="regenerate-btn"
          >
            Regenerate
          </Button>
        )}
        {(block.isEdited || isDirty) && (
          <Button
            variant="outline"
            size="sm"
            data-content-action="true"
            onPointerDown={() => { actionInProgress.current = true }}
            onKeyDown={markActionIntentFromKeyboard}
            onClick={handleReset}
            disabled={resetting}
            className="text-xs h-7"
            data-testid="reset-btn"
          >
            {resetting ? 'Resetting...' : 'Reset to original'}
          </Button>
        )}
        <Button
          variant="link"
          size="sm"
          data-content-action="true"
          onPointerDown={() => { actionInProgress.current = true }}
          onKeyDown={markActionIntentFromKeyboard}
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs text-zinc-400 hover:text-red-600 ml-auto h-auto p-0"
          data-testid="discard-btn"
        >
          {deleting ? 'Removing...' : 'Discard'}
        </Button>
      </div>

      {actionError && (
        <p className="text-xs text-red-600">{actionError}</p>
      )}

      {block.grammarWarnings && block.grammarWarnings.length > 0 && (
        <div
          data-testid="grammar-warnings"
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 space-y-1.5"
        >
          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Grammar quality issues detected — please review before sharing with students
          </div>
          {block.grammarWarnings.map((w) => (
            <div key={w.ruleId} className="flex items-start gap-2 text-xs text-amber-700">
              <Badge
                variant="outline"
                className={`shrink-0 text-xs border capitalize ${
                  w.severity === 'high'
                    ? 'border-red-300 bg-red-50 text-red-700'
                    : 'border-amber-300 bg-amber-100 text-amber-700'
                }`}
                data-testid="grammar-warning-severity"
              >
                {w.severity}
              </Badge>
              <span>
                Found: <code className="font-mono font-medium">{w.matchedText}</code> — {w.correction}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
