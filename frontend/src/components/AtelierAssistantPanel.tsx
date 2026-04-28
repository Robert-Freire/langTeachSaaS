import { useState } from 'react'
import { Sparkles, X, Send } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'

interface Props {
  open: boolean
  onClose: () => void
  onCloseDiscarding: () => void
  studentName?: string
  transcription: string | null
  onSubmit: (text: string) => void
}

export default function AtelierAssistantPanel({
  open,
  onClose,
  onCloseDiscarding,
  studentName,
  transcription,
  onSubmit,
}: Props) {
  const [inputValue, setInputValue] = useState('')
  const [pendingClose, setPendingClose] = useState(false)

  function handleCloseAttempt() {
    if (transcription !== null) {
      setPendingClose(true)
    } else {
      onClose()
    }
  }

  function handleSheetOpenChange(newOpen: boolean) {
    if (!newOpen) handleCloseAttempt()
  }

  function handleSubmit() {
    const text = inputValue.trim()
    if (!text) return
    onSubmit(text)
    setInputValue('')
    setPendingClose(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  const emptyPrompt = studentName
    ? `What did you cover with ${studentName} today?`
    : 'What would you like to cover today?'

  return (
    <Sheet open={open} onOpenChange={handleSheetOpenChange}>
      <SheetContent
        data-testid="assistant-panel"
        className="right-0 left-auto w-[380px] max-w-full flex flex-col p-0 backdrop-blur-[12px] bg-white/80 shadow-[0_8px_40px_0_rgb(26_27_34_/_0.12)] data-open:slide-in-from-right data-closed:slide-out-to-right"
      >
        {/* Header */}
        <div className="flex items-center px-5 py-4 gap-2 shrink-0">
          <div className="h-7 w-7 rounded-full bg-[linear-gradient(135deg,var(--color-primary),#4F46E5)] flex items-center justify-center shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-white" aria-hidden="true" />
          </div>
          <span className="font-semibold font-inter text-sm text-[#1A1B22] flex-1">Atelier Assistant</span>
          <div className="flex items-center gap-1.5 mr-3" role="status" aria-label="Status: Ready">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
            <span className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400 font-inter">Ready</span>
          </div>
          <button
            onClick={handleCloseAttempt}
            aria-label="Close Assistant"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Discard confirm (inline, no browser dialog) */}
        {pendingClose && (
          <div
            className="mx-4 mb-3 px-4 py-3 rounded-xl bg-amber-50 flex items-center justify-between gap-3 shrink-0"
            data-testid="discard-confirm"
          >
            <span className="text-sm font-inter text-zinc-700 flex-1">Close and discard?</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setPendingClose(false); onCloseDiscarding() }}
                data-testid="discard-confirm-yes"
                className="text-sm font-inter font-medium text-red-600 hover:text-red-700 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
              >
                Discard
              </button>
              <button
                onClick={() => setPendingClose(false)}
                data-testid="discard-confirm-cancel"
                className="text-sm font-inter font-medium text-indigo-600 hover:text-indigo-700 transition-colors px-2 py-1 rounded-lg hover:bg-indigo-50"
              >
                Keep editing
              </button>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {transcription === null ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3" data-testid="assistant-empty-state">
              <Sparkles className="h-8 w-8 text-zinc-200" aria-hidden="true" />
              <p className="text-sm font-inter text-zinc-400">{emptyPrompt}</p>
            </div>
          ) : (
            <div className="space-y-5" data-testid="assistant-transcription-view">
              <div>
                <p className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400 font-inter mb-2">
                  Transcription
                </p>
                <blockquote
                  className="border-l-2 border-indigo-300 pl-3 italic text-sm font-inter text-zinc-700"
                  data-testid="transcription-block"
                >
                  {transcription}
                </blockquote>
              </div>
              <div>
                <p className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400 font-inter mb-2">
                  Proposed Updates
                </p>
                <p className="text-sm font-inter text-zinc-400">(coming soon)</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer: text input */}
        <div className="px-4 pb-4 pt-2 shrink-0">
          <div className="flex items-center gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What did you cover today?"
              className="flex-1 bg-[#F4F2FD] border-0 focus-visible:ring-0 rounded-xl h-10 px-4 text-sm font-inter"
              data-testid="assistant-input"
            />
            <button
              onClick={handleSubmit}
              disabled={!inputValue.trim()}
              aria-label="Send message"
              className="h-10 w-10 flex items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--color-primary),#4F46E5)] text-white disabled:opacity-40 transition-opacity shrink-0"
              data-testid="assistant-send-btn"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
