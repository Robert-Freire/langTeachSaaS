import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, Square, Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { uploadVoiceNote, type VoiceNote } from '../../api/voiceNotes'

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
  const [state, setState] = useState<RecorderState>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [durationWarning, setDurationWarning] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const discardOnStopRef = useRef(false)
  const autoStartedRef = useRef(false)

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => () => stopInterval(), [stopInterval])

  useEffect(() => {
    return () => {
      const recorder = mediaRecorderRef.current
      if (recorder && recorder.state !== 'inactive') {
        recorder.stream?.getTracks().forEach((t) => t.stop())
        recorder.stop()
      }
    }
  }, [])

  const uploadFile = useCallback(async (file: File) => {
    setState('uploading')
    setError(null)
    try {
      const note = await uploadVoiceNote(file)
      setState('done')
      onVoiceNote(note)
    } catch (err) {
      console.error('Voice note upload failed', err)
      setState('error')
      setError('Upload failed. Please try again.')
    }
  }, [onVoiceNote])

  const stopRecording = useCallback(() => {
    stopInterval()
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setState('uploading')
  }, [stopInterval])

  const startRecording = useCallback(async () => {
    setError(null)
    setDurationWarning(false)
    setElapsed(0)
    chunksRef.current = []

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError('Microphone access denied. Please allow microphone access and try again.')
      return
    }

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : ''

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    mediaRecorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      if (discardOnStopRef.current) {
        // switchToFileUpload() requested a discard: release the mic and bail.
        // State was already reset to 'idle' synchronously by that handler.
        discardOnStopRef.current = false
        chunksRef.current = []
        return
      }
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
      const ext = recorder.mimeType?.includes('mp4') ? 'mp4' : 'webm'
      const file = new File([blob], `recording.${ext}`, { type: blob.type })
      uploadFile(file)
    }

    recorder.start(500)
    setState('recording')

    intervalRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1
        if (next >= MAX_DURATION_SECONDS) {
          setDurationWarning(true)
          stopRecording()
        }
        return next
      })
    }, 1000)
  }, [stopRecording, uploadFile])

  useEffect(() => {
    if (!autoStart || autoStartedRef.current || state !== 'idle' || error) return
    autoStartedRef.current = true
    // Defer to a microtask so the effect body does not trigger a synchronous
    // setState cascade. startRecording() awaits getUserMedia before its first
    // setState anyway, but the deferred call also satisfies the
    // react-hooks/set-state-in-effect lint rule.
    const handle = setTimeout(() => { void startRecording() }, 0)
    return () => clearTimeout(handle)
  }, [autoStart, state, error, startRecording])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || state !== 'idle') return
    e.target.value = ''

    if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) {
      setError(`Unsupported file type: ${file.type}. Please upload an audio file (webm, mp4, mp3, wav, ogg).`)
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
    setError(null)
    setElapsed(0)
    setDurationWarning(false)
  }

  const isDisabled = disabled || state === 'uploading'

  return (
    <div className="flex flex-col gap-2" data-testid="audio-recorder">
      {state === 'idle' && (!autoStart || error) && (
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            onClick={startRecording}
            disabled={isDisabled}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            data-testid="record-button"
          >
            <Mic className="h-4 w-4 mr-1" />
            Record
          </Button>
          <Button
            type="button"
            variant="outline"
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
      {state === 'idle' && autoStart && !error && (
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


      {state === 'recording' && (
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
              onClick={stopRecording}
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
                discardOnStopRef.current = true
                stopInterval()
                if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                  mediaRecorderRef.current.stop()
                }
                reset()
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
