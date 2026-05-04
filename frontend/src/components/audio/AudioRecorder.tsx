import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, Square, Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { uploadVoiceNote, type VoiceNote } from '../../api/voiceNotes'
import { useMicRecorder } from '@/hooks/useMicRecorder'

const MAX_DURATION_SECONDS = 5 * 60 // 5 minutes
const ALLOWED_UPLOAD_TYPES = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/x-m4a']

export type RecorderState = 'idle' | 'recording' | 'uploading' | 'done' | 'error'

export interface AudioRecorderProps {
  onVoiceNote: (note: VoiceNote) => void
  disabled?: boolean
  autoStart?: boolean
  /**
   * When true, while the recorder is actively recording it shows an inline
   * "or upload an audio file instead" link below the timer. Clicking it
   * discards the current recording and opens the file picker. Used by the
   * voice-create / voice-update entry panels where there is no longer a
   * chooser at the start.
   */
  showUploadFallbackLink?: boolean
}

export function AudioRecorder({
  onVoiceNote,
  disabled,
  autoStart,
  showUploadFallbackLink,
}: AudioRecorderProps) {
  // Upload lifecycle state (recording state is managed by useMicRecorder)
  const [state, setState] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [uploadError, setUploadError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const autoStartedRef = useRef(false)

  const uploadFile = useCallback(async (file: File) => {
    setState('uploading')
    setUploadError(null)
    try {
      const note = await uploadVoiceNote(file)
      setState('done')
      onVoiceNote(note)
    } catch (err) {
      console.error('Voice note upload failed', err)
      setState('error')
      setUploadError('Upload failed. Please try again.')
    }
  }, [onVoiceNote])

  const {
    recording,
    elapsed,
    durationWarning,
    error: micError,
    startInFlight,
    start,
    stop,
    clearError: clearMicError,
  } = useMicRecorder({
    maxDurationSeconds: MAX_DURATION_SECONDS,
    // warnAtSecondsRemaining=0 (default): warning fires only at the auto-stop second,
    // matching the original "Max duration reached" display at the exact cap.
    onBlob: uploadFile,
  })

  // Derive display error from mic error or upload error
  const error = micError === 'permission-denied'
    ? 'Microphone access denied. Please allow microphone access and try again.'
    : micError === 'no-hardware'
    ? 'No microphone found.'
    : uploadError

  // Hold start in a ref so the autoStart effect does not depend on its identity.
  // Without this, an unstable onVoiceNote prop from the parent cascades into a
  // new uploadFile → new useMicRecorder onBlob → new start identity, which would
  // retrigger the effect and cancel the pending recording start.
  const startRef = useRef(start)
  useEffect(() => { startRef.current = start }, [start])

  useEffect(() => {
    if (!autoStart || autoStartedRef.current || recording || startInFlight || state !== 'idle' || error) return
    let cancelled = false
    const handle = setTimeout(() => {
      if (cancelled) return
      autoStartedRef.current = true
      void startRef.current()
    }, 0)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [autoStart, recording, startInFlight, state, error])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || state !== 'idle') return
    e.target.value = ''

    if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) {
      setUploadError(`Unsupported file type: ${file.type}. Please upload an audio file (webm, mp4, mp3, wav, ogg).`)
      return
    }

    uploadFile(file)
  }

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  function reset() {
    setState('idle')
    setUploadError(null)
    clearMicError()
  }

  const isDisabled = disabled || state === 'uploading'

  return (
    <div className="flex flex-col gap-2" data-testid="audio-recorder">
      {!recording && !startInFlight && state === 'idle' && (!autoStart || error) && (
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => void start()}
            disabled={isDisabled}
            data-testid="record-button"
          >
            <Mic className="h-4 w-4 mr-1" />
            Record
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isDisabled}
            data-testid="upload-audio-button"
          >
            <Upload className="h-4 w-4 mr-1" />
            Upload audio
          </Button>
        </div>
      )}

      {/* Visible feedback during the autoStart pending window: between mount
          and getUserMedia resolving, neither the chooser nor the recording UI
          would otherwise render. Without this branch the panel looks frozen. */}
      {!recording && state === 'idle' && autoStart && !error && (
        <div className="flex items-center gap-2" data-testid="recorder-starting">
          <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
          <span className="text-sm text-zinc-500">
            Starting recording... please allow microphone access if prompted.
          </span>
        </div>
      )}

      {/* File input lives outside the chooser so the imperative
          switchToFileUpload() handle can trigger it even while the chooser
          is hidden (autoStart mode). It is hidden visually either way. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleFileChange}
        data-testid="audio-file-input"
      />


      {recording && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-sm text-red-600 font-medium">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              Recording {formatTime(elapsed)}
            </span>
            {durationWarning && (
              <span className="text-xs text-amber-600">Max duration reached</span>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                stop()
                setState('uploading')
              }}
              data-testid="stop-button"
            >
              <Square className="h-4 w-4 mr-1" />
              Stop
            </Button>
          </div>
          {showUploadFallbackLink && (
            <button
              type="button"
              onClick={() => {
                // Discard the in-flight recording (skip onstop's upload),
                // release the mic, reset visible state, then open the file
                // picker. autoStartedRef is set so the autoStart effect does
                // not retrigger after we land back in idle.
                stop(true)
                autoStartedRef.current = true
                fileInputRef.current?.click()
              }}
              className="self-start text-xs font-medium text-indigo-600 hover:underline"
              data-testid="switch-to-upload-link"
            >
              or upload an audio file instead
            </button>
          )}
        </div>
      )}

      {state === 'uploading' && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Transcribing...
        </div>
      )}

      {state === 'done' && (
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            Transcribed
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={reset}
            data-testid="record-again-button"
          >
            Record again
          </Button>
        </div>
      )}

      {state === 'error' && (
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={reset}
            data-testid="retry-button"
          >
            Try again
          </Button>
        </div>
      )}

      {error && state === 'idle' && (
        <p className="text-sm text-destructive" data-testid="error-message">{error}</p>
      )}
    </div>
  )
}
