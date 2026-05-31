import { useState, useRef, useEffect } from 'react'
import { Sparkles, X, Send, Mic, Square, Loader2, AlertCircle, ThumbsUp, ThumbsDown, Plus, CalendarDays, Check } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { uploadVoiceNote } from '@/api/voiceNotes'
import type { ProposalWithStatus } from '@/hooks/useAtelierAssistant'
import ProposalCard from '@/components/assistant/ProposalCard'
import { useMicRecorder } from '@/hooks/useMicRecorder'
import { submitVoiceFeedback } from '@/api/assistant'
import { MAX_RECORDING_SECONDS, WARN_REMAINING_SECONDS } from '@/lib/recordingLimits'
import { formatDuration } from '@/lib/formatDuration'
import { BRAND_NAME } from '@/lib/brand'
import { useQuery } from '@tanstack/react-query'
import { listSessions } from '@/api/sessionLogs'
import { listGroupSessions } from '@/api/groups'
import { formatMonthDay } from '@/utils/formatDate'

const MIN_DURATION_S = 1

type UploadError = 'upload-failed' | 'empty-transcription' | null
type FeedbackState = 'idle' | 'chip-open' | 'done-up' | 'done-down'

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
  onEditPayload?: (id: string, payload: import('@/api/assistant').NewStudentData | import('@/api/assistant').NewSessionData | Record<string, unknown>) => void
  studentId?: string | null
  sessionId?: string | null
  groupId?: string | null
  onSelectSession?: (sessionId: string) => void
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
  studentId,
  sessionId,
  groupId,
  onSelectSession,
}: Props) {
  const sessionContextMissing = !sessionId
  const newSessionSelected = sessionId === 'new'
  const hasSessionProposals = proposals.some(p => p.type === 'session' && (p.status === 'proposed' || p.status === 'error'))
  const hasSessionProposalsWithoutContext = sessionContextMissing && hasSessionProposals
  // Show the session picker whenever there are session proposals and no real session is selected yet
  // (includes the 'new' selection state so the teacher can see / change their choice)
  const showSessionPicker = (sessionContextMissing || newSessionSelected) && hasSessionProposals

  const { data: recentSessions } = useQuery({
    queryKey: ['sessions', studentId],
    queryFn: () => listSessions(studentId!),
    enabled: !!studentId && showSessionPicker,
    select: (sessions) =>
      [...sessions]
        .filter(s => !s.isCancelled)
        .sort((a, b) => {
          const da = new Date(a.sessionDate ?? a.createdAt).getTime()
          const db = new Date(b.sessionDate ?? b.createdAt).getTime()
          return db - da
        })
        .slice(0, 3),
  })

  const { data: groupSessions } = useQuery({
    queryKey: ['group-sessions-picker', groupId],
    queryFn: () => listGroupSessions(groupId!),
    enabled: !!groupId && showSessionPicker,
    select: (sessions) =>
      [...sessions]
        .filter(s => !s.isCancelled)
        .sort((a, b) => {
          const da = new Date(a.sessionDate ?? a.createdAt).getTime()
          const db = new Date(b.sessionDate ?? b.createdAt).getTime()
          return db - da
        })
        .slice(0, 3),
  })

  const [inputValue, setInputValue] = useState('')
  const [pendingClose, setPendingClose] = useState(false)
  const [currentVoiceNoteId, setCurrentVoiceNoteId] = useState<string | null>(null)
  const [feedbackState, setFeedbackState] = useState<FeedbackState>('idle')
  const [feedbackReason, setFeedbackReason] = useState('')

  const [uploadState, setUploadState] = useState<'idle' | 'uploading'>('idle')
  const [uploadError, setUploadError] = useState<UploadError>(null)
  const [tooShortHint, setTooShortHint] = useState(false)
  const [showSlowSttCancel, setShowSlowSttCancel] = useState(false)

  const uploadCancelledRef = useRef(false)
  const slowSttTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tooShortTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const feedbackInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (feedbackState === 'chip-open') {
      feedbackInputRef.current?.focus()
    }
  }, [feedbackState])

  function handleBlob(file: File) {
    uploadCancelledRef.current = false
    setUploadError(null)
    setUploadState('uploading')
    setCurrentVoiceNoteId(null)
    setFeedbackState('idle')
    setFeedbackReason('')
    slowSttTimerRef.current = setTimeout(() => {
      setShowSlowSttCancel(true)
    }, 15000)

    uploadVoiceNote(file)
      .then((note) => {
        if (uploadCancelledRef.current) return
        const text = note.transcription?.trim() ?? ''
        if (!text) {
          setUploadState('idle')
          setUploadError('empty-transcription')
        } else {
          setUploadState('idle')
          setCurrentVoiceNoteId(note.id)
          setFeedbackState('idle')
          setFeedbackReason('')
          onSubmit(text)
        }
      })
      .catch(() => {
        if (uploadCancelledRef.current) return
        setUploadState('idle')
        setUploadError('upload-failed')
      })
      .finally(() => {
        if (slowSttTimerRef.current) {
          clearTimeout(slowSttTimerRef.current)
          slowSttTimerRef.current = null
        }
        if (!uploadCancelledRef.current) setShowSlowSttCancel(false)
      })
  }

  const {
    recording,
    elapsed: micElapsed,
    durationWarning,
    error: hookError,
    start: startMicRecording,
    stop: stopMicRecording,
    clearError: clearMicError,
  } = useMicRecorder({
    maxDurationSeconds: MAX_RECORDING_SECONDS,
    minDurationSeconds: MIN_DURATION_S,
    warnAtSecondsRemaining: WARN_REMAINING_SECONDS,
    onBlob: handleBlob,
    onTooShort: () => {
      setTooShortHint(true)
      tooShortTimerRef.current = setTimeout(() => setTooShortHint(false), 3000)
    },
  })

  useEffect(() => {
    return () => {
      if (slowSttTimerRef.current) clearTimeout(slowSttTimerRef.current)
      if (tooShortTimerRef.current) clearTimeout(tooShortTimerRef.current)
      uploadCancelledRef.current = true
    }
  }, [])

  useEffect(() => {
    if (!open) {
      uploadCancelledRef.current = true
      if (slowSttTimerRef.current) {
        clearTimeout(slowSttTimerRef.current)
        slowSttTimerRef.current = null
      }
      setInputValue('')
      setPendingClose(false)
      if (recording) stopMicRecording(true)
      setUploadState('idle')
      setUploadError(null)
      clearMicError()
      setTooShortHint(false)
      setShowSlowSttCancel(false)
      setCurrentVoiceNoteId(null)
      setFeedbackState('idle')
      setFeedbackReason('')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden && recording) {
        stopMicRecording(true)
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording])

  function handleCloseAttempt() {
    if (uploadState === 'uploading') return
    const hasBlockingWork = processing || pendingProposals.length > 0
    if (recording) {
      stopMicRecording(true)
      if (hasBlockingWork) {
        setPendingClose(true)
      } else {
        onClose()
      }
      return
    }
    if (hasBlockingWork) {
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

  function buildProposalsJson() {
    return JSON.stringify(proposals.map(p => ({
      id: p.id, type: p.type, field: p.field, label: p.label,
      oldValue: p.oldValue, newValue: p.newValue,
      payload: p.payload ?? null, action: p.action,
    })))
  }

  function handleThumbsUp() {
    if (!currentVoiceNoteId) return
    setFeedbackState('done-up')
    submitVoiceFeedback(currentVoiceNoteId, 'up', undefined, studentId, sessionId, buildProposalsJson())
      .catch(() => { /* best-effort signal — swallow silently */ })
  }

  function handleThumbsDown() {
    setFeedbackState('chip-open')
  }

  function handleFeedbackSend() {
    if (!currentVoiceNoteId) return
    setFeedbackState('done-down')
    submitVoiceFeedback(currentVoiceNoteId, 'down', feedbackReason.trim() || undefined, studentId, sessionId, buildProposalsJson())
      .catch(() => { /* best-effort signal — swallow silently */ })
    setFeedbackReason('')
  }

  function handleFeedbackCancel() {
    setFeedbackState('idle')
    setFeedbackReason('')
  }

  const emptyPrompt = studentName
    ? `What did you cover with ${studentName} today?`
    : 'What would you like to cover today?'

  const noHardware = hookError === 'no-hardware'
  const permissionDenied = hookError === 'permission-denied'
  const pendingProposals = proposals.filter(p => p.status === 'proposed')
  const applyAllBlocked = (
    (!studentId && pendingProposals.some(p => p.type === 'newSession' && !(p.payload as import('@/api/assistant').NewSessionData | null)?.groupId)) ||
    hasSessionProposalsWithoutContext ||
    pendingProposals.some(p => p.type === 'newSession' && (p.payload as import('@/api/assistant').NewSessionData | null)?.requiresConfirmation)
  )

  return (
    <Sheet open={open} onOpenChange={handleSheetOpenChange}>
      <SheetContent
        data-testid="assistant-panel"
        className="right-0 left-auto w-[380px] max-w-full flex flex-col p-0 bg-white shadow-[0_8px_40px_0_rgb(26_27_34_/_0.12)] data-open:slide-in-from-right data-closed:slide-out-to-right"
        overlayClassName="bg-transparent supports-backdrop-filter:backdrop-blur-none"
      >
        {/* Header */}
        <div className="flex items-center px-5 py-4 gap-2 shrink-0">
          <div className="h-7 w-7 rounded-full lt-gradient-primary flex items-center justify-center shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-white" aria-hidden="true" />
          </div>
          <span className="font-semibold font-inter text-sm text-[#1A1B22] flex-1">{BRAND_NAME} Assistant</span>
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
                className="text-sm font-inter font-medium text-zinc-500 hover:text-zinc-700 px-2 py-1 rounded-lg hover:bg-zinc-100"
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
                {BRAND_NAME} needs microphone access to listen.
              </p>
              <p className="text-xs font-inter text-zinc-400">
                Open your browser settings to allow microphone access, then try again.
              </p>
              <button
                onClick={() => clearMicError()}
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
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400 font-inter">
                    Proposed Updates
                  </p>
                  {currentVoiceNoteId && !processing && proposals.length > 0 && (
                    feedbackState === 'idle' || feedbackState === 'chip-open' ? (
                      <div className="flex items-center gap-1" data-testid="thumbs-pair">
                        <button
                          onClick={handleThumbsUp}
                          aria-label="Suggestions look right"
                          className="p-1 text-zinc-400 hover:text-indigo-600 transition-colors"
                          data-testid="thumbs-up-btn"
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={handleThumbsDown}
                          aria-label="Suggestions are off"
                          className="p-1 text-zinc-400 hover:text-indigo-600 transition-colors"
                          data-testid="thumbs-down-btn"
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </button>
                      </div>
                    ) : feedbackState === 'done-up' ? (
                      <span className="text-xs font-inter text-zinc-400" data-testid="feedback-thanks">Thanks</span>
                    ) : (
                      <span className="text-xs font-inter text-zinc-400" data-testid="feedback-reported">Reported</span>
                    )
                  )}
                </div>
                {processing ? (
                  <p className="text-sm font-inter text-zinc-400" data-testid="proposals-loading">
                    Analysing…
                  </p>
                ) : proposals.length === 0 ? (
                  <p className="text-sm font-inter text-zinc-400" data-testid="proposals-empty">
                    No updates suggested.
                  </p>
                ) : (
                  <div className="space-y-3" data-testid="proposals-list">
                    {showSessionPicker && (
                      <div
                        className="flex flex-col gap-1.5 px-3 py-2.5 rounded-xl bg-violet-50"
                        data-testid="session-picker-banner"
                      >
                        <p className="text-xs font-inter text-gray-700 leading-snug mb-1">
                          Choose a session to apply these notes to:
                        </p>
                        <button
                          onClick={() => onSelectSession?.('new')}
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-inter font-semibold transition-colors text-left ${newSessionSelected ? 'text-indigo-700 bg-indigo-100' : 'text-indigo-600 hover:bg-indigo-50'}`}
                          data-testid="session-picker-new"
                        >
                          {newSessionSelected
                            ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            : <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          }
                          New session
                        </button>
                        {groupId && groupSessions !== undefined && groupSessions.length === 0 && (
                          <p className="text-xs font-inter text-zinc-500 italic px-2" data-testid="group-sessions-empty">
                            No sessions have been logged for this group yet.
                          </p>
                        )}
                        {(groupId ? (groupSessions ?? []) : (recentSessions ?? [])).map(session => {
                          const dateLabel = session.sessionDate
                            ? formatMonthDay(session.sessionDate)
                            : session.createdAt
                              ? formatMonthDay(session.createdAt)
                              : null
                          const title = session.title ?? 'Session'
                          return (
                            <button
                              key={session.id}
                              onClick={() => onSelectSession?.(session.id)}
                              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-inter text-zinc-600 hover:bg-violet-100 transition-colors text-left"
                              data-testid={`session-picker-row-${session.id}`}
                            >
                              <CalendarDays className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden="true" />
                              <span className="truncate">{dateLabel ? `${dateLabel} — ` : ''}{title}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                    <div className="space-y-2">
                      {proposals.map(proposal => (
                        <ProposalCard
                          key={proposal.id}
                          proposal={proposal}
                          onApply={onApply}
                          onDismiss={onDismiss}
                          onUndo={onUndo}
                          onRetry={onRetry}
                          onModify={onModify}
                          onEditPayload={onEditPayload}
                          studentId={studentId}
                          sessionContextMissing={sessionContextMissing}
                        />
                      ))}
                    </div>
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
              disabled={applyAllBlocked}
              className={`w-full py-2.5 rounded-xl font-inter font-semibold text-sm transition-all ${applyAllBlocked ? 'text-zinc-400 bg-zinc-100 cursor-not-allowed' : 'text-white lt-gradient-primary hover:brightness-105'}`}
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
          {/* Thumbs-down feedback chip */}
          {feedbackState === 'chip-open' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F4F2FD]" data-testid="feedback-chip">
              <span className="flex-1 text-xs font-inter text-indigo-600">Telling the assistant what's off</span>
              <button onClick={handleFeedbackCancel} aria-label="Cancel feedback" data-testid="feedback-chip-cancel">
                <X className="h-3.5 w-3.5 text-zinc-400 hover:text-zinc-600" />
              </button>
            </div>
          )}

          {/* Too-short hint */}
          {tooShortHint && (
            <p className="text-xs font-inter text-zinc-400 text-center" data-testid="too-short-hint">
              Tap and speak — that recording was too short.
            </p>
          )}

          {/* Empty transcription error */}
          {uploadError === 'empty-transcription' && (
            <div className="flex items-center gap-2 text-sm font-inter text-zinc-500" data-testid="empty-transcription-hint">
              <span>I didn't catch that — try again.</span>
              <button
                onClick={() => { setUploadState('idle'); setUploadError(null) }}
                className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                data-testid="empty-transcription-retry-btn"
              >
                Retry
              </button>
            </div>
          )}

          {/* Upload error */}
          {uploadError === 'upload-failed' && (
            <div className="flex items-center gap-2 text-sm font-inter text-red-600" data-testid="upload-error">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Transcription failed.</span>
              <button
                onClick={() => { setUploadState('idle'); setUploadError(null) }}
                className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                data-testid="upload-retry-btn"
              >
                Retry
              </button>
            </div>
          )}

          {/* Duration warning */}
          {durationWarning && recording && (
            <p className="text-xs font-inter text-amber-600 text-center" data-testid="duration-warning">
              {Math.max(0, MAX_RECORDING_SECONDS - micElapsed)} seconds left
            </p>
          )}

          {/* Input row */}
          <div className="flex items-center gap-2">
            {!recording && uploadState === 'idle' && (
              <>
                {feedbackState !== 'chip-open' && (
                  <button
                    onClick={() => void startMicRecording()}
                    disabled={noHardware || processing}
                    aria-label={noHardware ? 'No microphone detected' : 'Start voice recording'}
                    title={noHardware ? 'No microphone detected' : undefined}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    data-testid="mic-btn"
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                )}
                <Input
                  ref={feedbackInputRef}
                  value={feedbackState === 'chip-open' ? feedbackReason : inputValue}
                  onChange={(e) => {
                    if (feedbackState === 'chip-open') {
                      setFeedbackReason(e.target.value)
                    } else {
                      setInputValue(e.target.value)
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (feedbackState === 'chip-open') { handleFeedbackSend() } else { handleSubmit() }
                    }
                    if (e.key === 'Escape' && feedbackState === 'chip-open') {
                      handleFeedbackCancel()
                    }
                  }}
                  placeholder={feedbackState === 'chip-open' ? "What's wrong with these suggestions?" : 'What did you cover today?'}
                  disabled={feedbackState !== 'chip-open' && processing}
                  className="flex-1 bg-[#F4F2FD] border-0 focus-visible:ring-0 rounded-xl h-10 px-4 text-sm font-inter disabled:opacity-50"
                  data-testid="assistant-input"
                />
                <button
                  onClick={feedbackState === 'chip-open' ? handleFeedbackSend : handleSubmit}
                  disabled={feedbackState !== 'chip-open' && (!inputValue.trim() || processing)}
                  aria-label={feedbackState === 'chip-open' ? 'Send feedback' : 'Send message'}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl lt-gradient-primary text-white disabled:opacity-40 transition-opacity shrink-0"
                  data-testid="assistant-send-btn"
                >
                  <Send className="h-4 w-4" />
                </button>
              </>
            )}

            {recording && (
              <div className="flex items-center gap-3 flex-1 px-1" data-testid="recording-bar">
                <WaveformBars />
                <span className="text-sm font-inter text-zinc-500 tabular-nums" data-testid="recording-timer">
                  {formatDuration(micElapsed)}
                </span>
                <div className="flex-1" />
                <button
                  onClick={() => stopMicRecording(false)}
                  aria-label="Stop recording"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl lt-gradient-primary text-white shrink-0"
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

            {uploadState === 'uploading' && (
              <div className="flex items-center gap-2 text-sm font-inter text-zinc-500 px-1 flex-1" data-testid="transcribing-state">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-500 shrink-0" />
                <span>Transcribing...</span>
                {showSlowSttCancel && (
                  <button
                    onClick={() => {
                      uploadCancelledRef.current = true
                      setUploadState('idle')
                      setShowSlowSttCancel(false)
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
