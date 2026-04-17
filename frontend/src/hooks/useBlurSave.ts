import { useState, useRef, useEffect } from 'react'
import { SAVED_VISIBLE_DURATION_MS, ERROR_VISIBLE_DURATION_MS } from '../lib/autosaveConstants'

export function useBlurSave() {
  const [savedVisible, setSavedVisible] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    }
  }, [])

  function onSaveSuccess() {
    setSavedVisible(true)
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    savedTimerRef.current = setTimeout(() => setSavedVisible(false), SAVED_VISIBLE_DURATION_MS)
    setFieldError(null)
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
  }

  function onSaveError(message: string) {
    setFieldError(message)
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    errorTimerRef.current = setTimeout(() => setFieldError(null), ERROR_VISIBLE_DURATION_MS)
  }

  function clearError() {
    setFieldError(null)
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
  }

  return { savedVisible, fieldError, onSaveSuccess, onSaveError, clearError }
}
