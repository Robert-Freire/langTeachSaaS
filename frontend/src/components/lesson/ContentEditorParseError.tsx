import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface ContentEditorParseErrorProps {
  rawContent: string
  onChange: (newRaw: string) => void
  onRegenerate?: () => void
  isIncomplete?: boolean
}

export function ContentEditorParseError({
  rawContent,
  onChange,
  onRegenerate,
  isIncomplete = false,
}: ContentEditorParseErrorProps) {
  const [showRaw, setShowRaw] = useState(false)

  const message = isIncomplete
    ? 'Content generation was incomplete. Regenerate to get a full response.'
    : 'This content was generated in an unexpected format.'

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-medium">{message}</p>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {onRegenerate && (
            <Button
              variant="default"
              size="sm"
              className="h-7 text-xs"
              onClick={onRegenerate}
              data-testid="parse-error-regenerate-btn"
            >
              Regenerate
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setShowRaw((s) => !s)}
            data-testid="parse-error-toggle-raw-btn"
          >
            {showRaw ? 'Hide raw content' : 'Edit manually'}
          </Button>
        </div>
      </div>

      {showRaw && (
        <textarea
          value={rawContent}
          onChange={(e) => onChange(e.target.value)}
          rows={6}
          className="w-full resize-none text-sm border rounded p-2 font-mono"
          data-testid="parse-error-raw-textarea"
        />
      )}
    </div>
  )
}
