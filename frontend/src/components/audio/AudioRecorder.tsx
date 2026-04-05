import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, Square, Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { uploadVoiceNote, type VoiceNote } from '../../api/voiceNotes'

const MAX_DURATION_SECONDS = 5 * 60 // 5 minutes
const ALLOWED_UPLOAD_TYPES = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/x-m4a']

type RecorderState = 'idle' | 'recording' | 'uploading' | 'done' | 'error'

export interface AudioRecorderProps {
  onVoiceNote: (note: VoiceNote) => void
  disabled?: boolean
}

export function AudioRecorder({ onVoiceNote, disabled }: AudioRecorderProps) {
  const [state, setState] = useState<RecorderState>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [durationWarning, setDurationWarning] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => () => stopInterval(), [stopInterval])

  async function uploadFile(file: File) {
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
  }

  async function startRecording() {
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
  }

  function stopRecording() {
    stopInterval()
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setState('uploading')
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
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
      {state === 'idle' && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={startRecording}
            disabled={isDisabled}
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
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleFileChange}
            data-testid="audio-file-input"
          />
        </div>
      )}

      {state === 'recording' && (
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
