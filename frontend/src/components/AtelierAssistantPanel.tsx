import { useState, useRef, useEffect, useCallback } from 'react'
import { Sparkles, X, Send, Mic, Square, Loader2, AlertCircle } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { uploadVoiceNote } from '@/api/voiceNotes'
import type { ProposalWithStatus } from '@/hooks/useAtelierAssistant'
import ProposalCard from '@/components/assistant/ProposalCard'

const MIN_DURATION_S = 1
const WARN_DURATION_S = 50
const MAX_DURATION_S = 60

type MicState = 'idle' | 'recording' | 'uploading' | 'error'
type MicError = 'permission-denied' | 'no-hardware' | 'upload-failed' | 'empty-transcription' | null

function getMicMimeType(): string {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return ''
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus'
  if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4'
  return ''
}

function formatTimer(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function WaveformBars() {
  return (
    <span className="flex items-end gap-[2px] h-4" aria-hidden="true" data-testid="waveform">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-indigo-500 animate-bounce"
          style={{ animationDelay: `${i * 0.12}s`, height: '100%', minHeight: '4px' }}
        />
      ))}
    </span>
  )
}

interface Props {
  open: boolean
  onClose: () => void
  onCloseDiscarding: () => void
  studentName?: string
  transcription: string | null
  processing: boolean
  proposals: ProposalWithStatus[]
  onSubmit: (text: string) => void
  onApply: (id: string) => void
  onDismiss: (id: string) => void
  onUndo: (id: string) => void
  onRetry: (id: string) => void
  onModify: (id: string, newValue: string) => void
  onApplyAll: () => void
  onDismissAll: () => void
  onEditPayload?: (id: string, payload: import('@/api/assistant').NewStudentData) => void
}

export default function AtelierAssistantPanel({
  open,
  onClose,
  onCloseDiscarding,
  studentName,
  transcription,
  processing,
  proposals,
  onSubmit,
  onApply,
  onDismiss,
  onUndo,
  onRetry,
  onModify,
  onApplyAll,
  onDismissAll,
  onEditPayload,
}: Props) {
  const [inputValue, setInputValue] = useState('')
  const [pendingClose, setPendingClose] = useState(false)
  const chatInputRef = useRef<HTMLInputElement>(null)

  const [micState, setMicState] = useState<MicState>('idle')
  const [micError, setMicError] = useState<MicError>(null)
  const [micElapsed, setMicElapsed] = useState(0)
  const [tooShortHint, setTooShortHint] = useState(false)
  const [durationWarning, setDurationWarning] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const discardRef = useRef(false)
  const elapsedRef = useRef(0)
  const uploadCancelledRef = useRef(false)
  const slowSttTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tooShortTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startInFlightRef = useRef(false)
  const [showSlowSttCancel, setShowSlowSttCancel] = useState(false)

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      stopInterval()
      if (slowSttTimerRef.current) clearTimeout(slowSttTimerRef.current)
      if (tooShortTimerRef.current) clearTimeout(tooShortTimerRef.current)
      uploadCancelledRef.current = true
      discardRef.current = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      const recorder = mediaRecorderRef.current
      if (recorder && recorder.state !== 'inactive') {
        recorder.ondataavailable = null
        recorder.onstop = null
        recorder.stop()
      }
    }
  }, [stopInterval])

  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden && micState === 'recording') {
        stopMicRecording(true)
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micState])

  function resetMicState() {
    stopInterval()
    if (slowSttTimerRef.current) {
      clearTimeout(slowSttTimerRef.current)
      slowSttTimerRef.current = null
    }
    if (tooShortTimerRef.current) {
      clearTimeout(tooShortTimerRef.current)
      tooShortTimerRef.current = null
    }
    setMicState('idle')
    setMicElapsed(0)
    elapsedRef.current = 0
    setDurationWarning(false)
    setMicError(null)
    setShowSlowSttCancel(false)
    chunksRef.current = []
  }

  async function startMicRecording() {
    if (micState !== 'idle' || startInFlightRef.current || processing) return
    startInFlightRef.current = true

    setMicError(null)
    setTooShortHint(false)

    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setMicError('no-hardware')
      startInFlightRef.current = false
      return
    }

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      const name = (err as Error).name
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setMicError('permission-denied')
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setMicError('no-hardware')
      } else {
        setMicError('permission-denied')
      }
      startInFlightRef.current = false
      return
    }

    streamRef.current = stream
    chunksRef.current = []
    elapsedRef.current = 0

    const mimeType = getMicMimeType()
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    mediaRecorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null

      if (discardRef.current) {
        discardRef.current = false
        resetMicState()
        return
      }

      if (elapsedRef.current < MIN_DURATION_S) {
        setTooShortHint(true)
        tooShortTimerRef.current = setTimeout(() => setTooShortHint(false), 3000)
        resetMicState()
        return
      }

      const finalMimeType = recorder.mimeType || mimeType || 'audio/webm'
      const ext = finalMimeType.includes('mp4') ? 'mp4' : 'webm'
      const blob = new Blob(chunksRef.current, { type: finalMimeType })
      const file = new File([blob], `recording.${ext}`, { type: finalMimeType })
      chunksRef.current = []

      uploadCancelledRef.current = false
      setMicState('uploading')
      slowSttTimerRef.current = setTimeout(() => {
        setShowSlowSttCancel(true)
      }, 15000)

      uploadVoiceNote(file)
        .then((note) => {
          if (uploadCancelledRef.current) return
          const text = note.transcription?.trim() ?? ''
          if (!text) {
            setMicState('error')
            setMicError('empty-transcription')
          } else {
            resetMicState()
            onSubmit(text)
          }
        })
        .catch(() => {
          if (uploadCancelledRef.current) return
          setMicState('error')
          setMicError('upload-failed')
        })
        .finally(() => {
          if (slowSttTimerRef.current) {
            clearTimeout(slowSttTimerRef.current)
            slowSttTimerRef.current = null
          }
          if (!uploadCancelledRef.current) setShowSlowSttCancel(false)
        })
    }

    recorder.start(500)
    startInFlightRef.current = false
    setMicState('recording')
    setMicElapsed(0)
    setDurationWarning(false)

    intervalRef.current = setInterval(() => {
      elapsedRef.current += 1
      setMicElapsed(elapsedRef.current)
      if (elapsedRef.current === WARN_DURATION_S) setDurationWarning(true)
      if (elapsedRef.current >= MAX_DURATION_S) stopMicRecording(false)
    }, 1000)
  }

  function stopMicRecording(discard: boolean) {
    stopInterval()
    if (discard) discardRef.current = true
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    } else {
      discardRef.current = false
      resetMicState()
    }
  }

  function handleCloseAttempt() {
    if (micState === 'uploading') return
    if (micState === 'recording') {
      stopMicRecording(true)
      onClose()
      return
    }
    if (processing || pendingProposals.length > 0) {
      setPendingClose(true)
    } else {
      onClose()
    }
  }

  function handleSheetOpenChange(newOpen: boolean) {
    if (newOpen) {
      setPendingClose(false)
    } else {
      handleCloseAttempt()
    }
  }

  function handleSubmit() {
    const text = inputValue.trim()
    if (!text || processing) return
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

  function handleRedirectToChat(prefill: string) {
    setInputValue(prefill)
    setTimeout(() => chatInputRef.current?.focus(), 0)
  }

  const emptyPrompt = studentName
    ? `What did you cover with ${studentName} today?`
    : 'What would you like to cover today?'

  const noHardware = micError === 'no-hardware'
  const permissionDenied = micError === 'permission-denied'
  const pendingProposals = proposals.filter(p => p.status === 'proposed')

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
          <div
            className="flex items-center gap-1.5 mr-3"
            role="status"
            aria-label={processing ? 'Status: Processing' : 'Status: Ready'}
          >
            <span
              className={processing ? 'h-2 w-2 rounded-full bg-amber-400 shrink-0 animate-pulse' : 'h-2 w-2 rounded-full bg-emerald-500 shrink-0'}
              aria-hidden="true"
            />
            <span className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400 font-inter">
              {processing ? 'Processing Insight' : 'Ready'}
            </span>
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
          {permissionDenied ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3" data-testid="mic-permission-error">
              <AlertCircle className="h-8 w-8 text-zinc-300" aria-hidden="true" />
              <p className="text-sm font-inter text-zinc-500">
                LangTeach needs microphone access to listen.
              </p>
              <p className="text-xs font-inter text-zinc-400">
                Open your browser settings to allow microphone access, then try again.
              </p>
              <button
                onClick={() => setMicError(null)}
                className="text-sm font-inter font-medium text-indigo-600 hover:text-indigo-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-indigo-50"
                data-testid="mic-retry-btn"
              >
                Retry
              </button>
            </div>
          ) : transcription === null ? (
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
                {processing ? (
                  <p className="text-sm font-inter text-zinc-400" data-testid="proposals-loading">
                    Analysing…
                  </p>
                ) : proposals.length === 0 ? (
                  <p className="text-sm font-inter text-zinc-400" data-testid="proposals-empty">
                    No updates suggested.
                  </p>
                ) : (
                  <div className="space-y-2" data-testid="proposals-list">
                    {proposals.map(proposal => (
                      <ProposalCard
                        key={proposal.id}
                        proposal={proposal}
                        onApply={onApply}
                        onDismiss={onDismiss}
                        onUndo={onUndo}
                        onRetry={onRetry}
                        onModify={onModify}
                        onRedirectToChat={handleRedirectToChat}
                        onEditPayload={onEditPayload}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Batch actions footer */}
        {pendingProposals.length > 0 && (
          <div className="px-4 pb-3 pt-1 shrink-0 space-y-1.5" data-testid="batch-actions">
            <button
              onClick={onApplyAll}
              className="w-full py-2.5 rounded-xl font-inter font-semibold text-sm text-white bg-[linear-gradient(135deg,var(--color-primary),#4F46E5)] hover:brightness-105 transition-all"
              data-testid="apply-all-btn"
            >
              Apply All Remaining
            </button>
            <button
              onClick={onDismissAll}
              className="w-full py-2 rounded-xl font-inter font-semibold text-sm text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              data-testid="dismiss-all-btn"
            >
              Dismiss All Remaining
            </button>
          </div>
        )}

        {/* Footer: input bar */}
        <div className="px-4 pb-4 pt-2 shrink-0 space-y-1.5">
          {/* Too-short hint */}
          {tooShortHint && (
            <p className="text-xs font-inter text-zinc-400 text-center" data-testid="too-short-hint">
              Tap and speak — that recording was too short.
            </p>
          )}

          {/* Empty transcription error */}
          {micError === 'empty-transcription' && (
            <div className="flex items-center gap-2 text-sm font-inter text-zinc-500" data-testid="empty-transcription-hint">
              <span>I didn't catch that — try again.</span>
              <button
                onClick={() => { setMicState('idle'); setMicError(null) }}
                className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                data-testid="empty-transcription-retry-btn"
              >
                Retry
              </button>
            </div>
          )}

          {/* Upload error */}
          {micError === 'upload-failed' && (
            <div className="flex items-center gap-2 text-sm font-inter text-red-600" data-testid="upload-error">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Transcription failed.</span>
              <button
                onClick={() => { setMicState('idle'); setMicError(null) }}
                className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                data-testid="upload-retry-btn"
              >
                Retry
              </button>
            </div>
          )}

          {/* Duration warning */}
          {durationWarning && micState === 'recording' && (
            <p className="text-xs font-inter text-amber-600 text-center" data-testid="duration-warning">
              10 seconds left
            </p>
          )}

          {/* Input row */}
          <div className="flex items-center gap-2">
            {micState === 'idle' && (
              <>
                <button
                  onClick={startMicRecording}
                  disabled={noHardware || processing}
                  aria-label={noHardware ? 'No microphone detected' : 'Start voice recording'}
                  title={noHardware ? 'No microphone detected' : undefined}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  data-testid="mic-btn"
                >
                  <Mic className="h-4 w-4" />
                </button>
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="What did you cover today?"
                  disabled={processing}
                  className="flex-1 bg-[#F4F2FD] border-0 focus-visible:ring-0 rounded-xl h-10 px-4 text-sm font-inter disabled:opacity-50"
                  data-testid="assistant-input"
                />
                <button
                  onClick={handleSubmit}
                  disabled={!inputValue.trim() || processing}
                  aria-label="Send message"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--color-primary),#4F46E5)] text-white disabled:opacity-40 transition-opacity shrink-0"
                  data-testid="assistant-send-btn"
                >
                  <Send className="h-4 w-4" />
                </button>
              </>
            )}

            {micState === 'recording' && (
              <div className="flex items-center gap-3 flex-1 px-1" data-testid="recording-bar">
                <WaveformBars />
                <span className="text-sm font-inter text-zinc-500 tabular-nums" data-testid="recording-timer">
                  {formatTimer(micElapsed)}
                </span>
                <div className="flex-1" />
                <button
                  onClick={() => stopMicRecording(false)}
                  aria-label="Stop recording"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--color-primary),#4F46E5)] text-white shrink-0"
                  data-testid="stop-recording-btn"
                >
                  <Square className="h-4 w-4 fill-white" />
                </button>
                <button
                  onClick={() => stopMicRecording(true)}
                  aria-label="Cancel recording"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors shrink-0"
                  data-testid="cancel-recording-btn"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {micState === 'uploading' && (
              <div className="flex items-center gap-2 text-sm font-inter text-zinc-500 px-1 flex-1" data-testid="transcribing-state">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-500 shrink-0" />
                <span>Transcribing...</span>
                {showSlowSttCancel && (
                  <button
                    onClick={() => {
                      uploadCancelledRef.current = true
                      resetMicState()
                    }}
                    className="ml-auto text-sm font-inter font-medium text-zinc-400 hover:text-zinc-600 transition-colors"
                    data-testid="cancel-transcription-btn"
                  >
                    Cancel
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
