import { useState, useRef, useCallback, useEffect } from 'react'

export type MicRecorderError = 'permission-denied' | 'no-hardware'

function getMicMimeType(): string {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return ''
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus'
  if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4'
  return ''
}

export function useMicRecorder({
  maxDurationSeconds,
  minDurationSeconds = 0,
  warnAtSecondsRemaining = 0,
  onBlob,
  onTooShort,
}: {
  maxDurationSeconds: number
  minDurationSeconds?: number
  warnAtSecondsRemaining?: number
  onBlob: (file: File) => void
  onTooShort?: () => void
}): {
  recording: boolean
  elapsed: number
  durationWarning: boolean
  error: MicRecorderError | null
  startInFlight: boolean
  start: () => Promise<void>
  stop: (discard?: boolean) => void
  clearError: () => void
} {
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [durationWarning, setDurationWarning] = useState(false)
  const [error, setError] = useState<MicRecorderError | null>(null)
  const [startInFlight, setStartInFlight] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const discardRef = useRef(false)
  const elapsedRef = useRef(0)
  const startInFlightRef = useRef(false)

  // Keep callback refs stable so callers need not wrap onBlob/onTooShort in useCallback
  const onBlobRef = useRef(onBlob)
  useEffect(() => { onBlobRef.current = onBlob }, [onBlob])
  const onTooShortRef = useRef(onTooShort)
  useEffect(() => { onTooShortRef.current = onTooShort }, [onTooShort])

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const stop = useCallback((discard = false) => {
    stopInterval()
    if (discard) discardRef.current = true
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    } else {
      discardRef.current = false
      chunksRef.current = []
      setRecording(false)
      setElapsed(0)
      elapsedRef.current = 0
      setDurationWarning(false)
    }
  }, [stopInterval])

  const start = useCallback(async () => {
    if (startInFlightRef.current) return
    startInFlightRef.current = true
    setStartInFlight(true)
    setError(null)

    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('no-hardware')
      startInFlightRef.current = false
      setStartInFlight(false)
      return
    }

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      const name = (err as Error).name
      if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setError('no-hardware')
      } else {
        setError('permission-denied')
      }
      startInFlightRef.current = false
      setStartInFlight(false)
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

      const finalElapsed = elapsedRef.current
      setRecording(false)
      setElapsed(0)
      elapsedRef.current = 0
      setDurationWarning(false)

      if (discardRef.current) {
        discardRef.current = false
        chunksRef.current = []
        return
      }

      if (minDurationSeconds > 0 && finalElapsed < minDurationSeconds) {
        chunksRef.current = []
        onTooShortRef.current?.()
        return
      }

      const finalMimeType = recorder.mimeType || mimeType || 'audio/webm'
      const ext = finalMimeType.includes('mp4') ? 'mp4' : 'webm'
      const blob = new Blob(chunksRef.current, { type: finalMimeType })
      const file = new File([blob], `recording.${ext}`, { type: finalMimeType })
      chunksRef.current = []
      onBlobRef.current(file)
    }

    recorder.start(500)
    startInFlightRef.current = false
    setStartInFlight(false)
    setRecording(true)

    intervalRef.current = setInterval(() => {
      elapsedRef.current += 1
      setElapsed(elapsedRef.current)
      if (warnAtSecondsRemaining > 0 && elapsedRef.current >= maxDurationSeconds - warnAtSecondsRemaining) {
        setDurationWarning(true)
      }
      if (elapsedRef.current >= maxDurationSeconds) {
        stopInterval()
        const rec = mediaRecorderRef.current
        if (rec && rec.state !== 'inactive') {
          rec.stop()
        }
      }
    }, 1000)
  }, [stopInterval, maxDurationSeconds, minDurationSeconds, warnAtSecondsRemaining])

  useEffect(() => () => {
    stopInterval()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.ondataavailable = null
      recorder.onstop = null
      recorder.stop()
    }
  }, [stopInterval])

  const clearError = useCallback(() => setError(null), [])

  return { recording, elapsed, durationWarning, error, startInFlight, start, stop, clearError }
}
