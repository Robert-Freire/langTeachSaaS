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

interface ContentBlockProps {
  block: ContentBlockDto
  lessonId: string
  onUpdate: (updated: ContentBlockDto) => void
  onDelete: (id: string) => void
  onRegenerate: (blockType: string, generationParams: string | null) => void
}

type ViewMode = 'edit' | 'preview'

export function ContentBlock({
  block,
  lessonId,
  onUpdate,
  onDelete,
  onRegenerate,
}: ContentBlockProps) {
  const [value, setValue] = useState(block.editedContent ?? block.generatedContent)
  const [mode, setMode] = useState<ViewMode>('edit')
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const actionInProgress = useRef(false)

  const storedValue = block.editedContent ?? block.generatedContent
  const isDirty = value !== storedValue

  useEffect(() => {
    setValue(block.editedContent ?? block.generatedContent)
  }, [block.editedContent, block.generatedContent])

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
    onRegenerate(block.blockType, block.generationParams)
  }

  const renderer = getRenderer(block.blockType)
  const parsedContent = useMemo(() => {
    try {
      const trimmed = value.trim()
      // 1. Direct parse (clean JSON)
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        return JSON.parse(trimmed)
      }
      // 2. Full code fence with closing backticks
      const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/i)
      if (fenceMatch) return JSON.parse(fenceMatch[1].trim())
      // 3. Opening fence only (AI sometimes omits closing ```)
      const openMatch = trimmed.match(/^```(?:json)?\s*\n([\s\S]+)$/i)
      if (openMatch) return JSON.parse(openMatch[1].trim())
      return JSON.parse(trimmed)
    } catch { return null }
  }, [value])

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
        <Button
          variant="outline"
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
    </div>
  )
}
