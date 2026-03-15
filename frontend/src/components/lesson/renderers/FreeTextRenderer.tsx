import { Textarea } from '@/components/ui/textarea'
import type { EditorProps, PreviewProps, StudentProps } from '../contentRegistry'

function Editor({ rawContent, onChange }: EditorProps) {
  return (
    <Textarea
      value={rawContent}
      onChange={(e) => onChange(e.target.value)}
      rows={6}
      className="resize-none text-sm"
      data-testid="freetext-editor"
    />
  )
}

function Preview({ rawContent }: PreviewProps) {
  return (
    <pre className="text-sm text-zinc-700 whitespace-pre-wrap font-sans bg-zinc-50 p-3 rounded border border-zinc-100">
      {rawContent}
    </pre>
  )
}

function Student({ rawContent }: StudentProps) {
  return (
    <pre className="text-sm text-zinc-700 whitespace-pre-wrap font-sans">
      {rawContent}
    </pre>
  )
}

export const FreeTextRenderer = { Editor, Preview, Student }
