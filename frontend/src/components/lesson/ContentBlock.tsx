import { useState, useEffect, useRef, type FocusEvent, type KeyboardEvent } from 'react'
import {
  updateEditedContent,
  deleteContentBlock,
  resetEditedContent,
  type ContentBlockDto,
} from '../../api/generate'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ContentBlockProps {
  block: ContentBlockDto
  lessonId: string
  onUpdate: (updated: ContentBlockDto) => void
  onDelete: (id: string) => void
  onRegenerate: (blockType: string, generationParams: string | null) => void
}

export function ContentBlock({
  block,
  lessonId,
  onUpdate,
  onDelete,
  onRegenerate,
}: ContentBlockProps) {
  const [value, setValue] = useState(block.editedContent ?? block.generatedContent)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  // Prevents blur-save from firing when an action button is being activated
  const actionInProgress = useRef(false)

  const storedValue = block.editedContent ?? block.generatedContent

  // Sync local value when block prop changes externally (e.g. after reset)
  useEffect(() => {
    setValue(block.editedContent ?? block.generatedContent)
  }, [block.editedContent, block.generatedContent])

  // Set intent flag for keyboard activation (Enter/Space on action buttons)
  const markActionIntentFromKeyboard = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      actionInProgress.current = true
    }
  }

  const handleBlur = async (e: FocusEvent<HTMLTextAreaElement>) => {
    // Cover keyboard/touch: if focus moved to an action button, suppress save
    const nextFocused = e.relatedTarget as HTMLElement | null
    if (nextFocused?.dataset.contentAction === 'true') return
    if (actionInProgress.current) return
    if (value === storedValue) return
    setSaving(true)
    try {
      const updated = await updateEditedContent(lessonId, block.id, value)
      onUpdate(updated)
      setActionError(null)
    } catch {
      setActionError('Save failed. Your changes are local only — click away to retry.')
    } finally {
      setSaving(false)
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
    setDeleting(true)
    setActionError(null)
    try {
      await deleteContentBlock(lessonId, block.id)
      onDelete(block.id)
      // component unmounts here — no further state updates
    } catch {
      setDeleting(false)
      setActionError('Remove failed. Please try again.')
    }
  }

  const handleRegenerate = () => {
    actionInProgress.current = false
    onRegenerate(block.blockType, block.generationParams)
  }

  return (
    <div
      className="border border-zinc-200 rounded-lg p-3 bg-white space-y-2"
      data-testid="content-block"
    >
      <div className="flex items-center gap-2 flex-wrap">
        <Badge
          variant="outline"
          className="text-xs text-zinc-500 border-zinc-200"
          data-testid="ai-block-badge"
        >
          AI-generated
        </Badge>
        <span className="text-xs text-zinc-400 capitalize">{block.blockType}</span>
        {block.isEdited && (
          <span className="text-xs text-amber-600 font-medium">Modified</span>
        )}
        {saving && <span className="text-xs text-zinc-400">Saving...</span>}
      </div>

      <Textarea
        value={value}
        onChange={(e) => { setValue(e.target.value); if (actionError) setActionError(null) }}
        onBlur={handleBlur}
        rows={6}
        className="resize-none text-sm"
        data-testid="content-block-textarea"
      />

      <div className="flex items-center gap-2 flex-wrap">
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
        {block.isEdited && (
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
