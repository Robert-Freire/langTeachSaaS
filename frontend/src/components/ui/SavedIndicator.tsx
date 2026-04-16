import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'

interface SavedIndicatorProps {
  visible: boolean
}

export function SavedIndicator({ visible }: SavedIndicatorProps) {
  const [shown, setShown] = useState(false)
  const [fading, setFading] = useState(false)
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (showTimer.current) clearTimeout(showTimer.current)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    if (fadeTimer.current) clearTimeout(fadeTimer.current)

    if (visible) {
      // Defer setState to avoid synchronous setState in effect body
      showTimer.current = setTimeout(() => {
        setShown(true)
        setFading(false)
        hideTimer.current = setTimeout(() => {
          setFading(true)
          fadeTimer.current = setTimeout(() => setShown(false), 300)
        }, 1000)
      }, 0)
    } else {
      showTimer.current = setTimeout(() => {
        setShown(false)
        setFading(false)
      }, 0)
    }

    return () => {
      if (showTimer.current) clearTimeout(showTimer.current)
      if (hideTimer.current) clearTimeout(hideTimer.current)
      if (fadeTimer.current) clearTimeout(fadeTimer.current)
    }
  }, [visible])

  if (!shown) return null

  return (
    <span
      className="flex items-center gap-1 text-xs text-zinc-400"
      style={{
        opacity: fading ? 0 : 1,
        transition: fading ? 'opacity 300ms ease-out' : 'opacity 200ms ease-out',
      }}
      data-testid="saved-indicator"
    >
      <Check className="h-3 w-3" />
      Saved
    </span>
  )
}
