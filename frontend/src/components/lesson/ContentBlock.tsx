import { useState, useEffect } from 'react'
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

  const storedValue = block.editedContent ?? block.generatedContent

  // Sync local value when block prop changes externally (e.g. after reset)
  useEffect(() => {
    setValue(block.editedContent ?? block.generatedContent)
  }, [block.editedContent, block.generatedContent])

  const handleBlur = async () => {
    if (value === storedValue) return
    setSaving(true)
    try {
      const updated = await updateEditedContent(lessonId, block.id, value)
      onUpdate(updated)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    setResetting(true)
    try {
      const updated = await resetEditedContent(lessonId, block.id)
      setValue(updated.generatedContent)
      onUpdate(updated)
    } finally {
      setResetting(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteContentBlock(lessonId, block.id)
      onDelete(block.id)
    } finally {
      setDeleting(false)
    }
  }

  const handleRegenerate = () => {
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
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        rows={6}
        className="resize-none text-sm"
        data-testid="content-block-textarea"
      />

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
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
            onClick={handleReset}
            disabled={resetting}
            className="text-xs h-7"
            data-testid="reset-btn"
          >
            {resetting ? 'Resetting...' : 'Reset to original'}
          </Button>
        )}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs text-zinc-400 underline hover:text-red-600 ml-auto"
          data-testid="discard-btn"
        >
          {deleting ? 'Removing...' : 'Discard'}
        </button>
      </div>
    </div>
  )
}
