import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { TEACHING_CHANNEL_META, TEACHING_CHANNEL_OPTIONS } from '@/lib/teachingChannelMeta'
import { patchStudentChannel } from '@/api/students'

interface TeachingChannelPickerProps {
  value: string | null
  studentId: string
  onSaved?: (v: string | null) => void
}

export function TeachingChannelPicker({ value, studentId, onSaved }: TeachingChannelPickerProps) {
  const [optimisticValue, setOptimisticValue] = useState<string | null | undefined>(undefined)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (errorTimerRef.current) clearTimeout(errorTimerRef.current) }, [])

  // Clear optimistic state whenever the server value changes (query refetch confirms or external update)
  useEffect(() => { setOptimisticValue(undefined) }, [value])

  const current = optimisticValue !== undefined ? optimisticValue : value

  async function handleSelect(next: string | null) {
    if (isPending || next === current) return
    const prev = current
    setOptimisticValue(next)
    setIsPending(true)
    setError(null)
    try {
      await patchStudentChannel(studentId, next)
      onSaved?.(next)
    } catch {
      setOptimisticValue(prev)
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
      setError("Couldn't save channel")
      errorTimerRef.current = setTimeout(() => setError(null), 3000)
    } finally {
      setIsPending(false)
    }
  }

  const badgeClassName = [
    'group inline-flex items-center gap-1 rounded-md px-2 py-0.5',
    'text-[0.6875rem] font-bold uppercase tracking-[0.05em]',
    'bg-zinc-100 text-zinc-600',
    'hover:bg-zinc-200 transition-colors cursor-pointer select-none',
    isPending ? 'opacity-50 cursor-not-allowed' : '',
  ].join(' ')

  const ghostClassName = [
    'inline-flex items-center gap-1 rounded-md px-2 py-0.5',
    'text-[0.6875rem] font-medium text-zinc-400',
    'border border-dashed border-zinc-300',
    'hover:border-zinc-400 hover:text-zinc-500 transition-colors cursor-pointer select-none',
    isPending ? 'opacity-50 cursor-not-allowed' : '',
  ].join(' ')

  return (
    <div
      className="inline-flex flex-col items-start gap-0.5"
      onClick={(e) => e.stopPropagation()}
    >
      <Popover>
        <PopoverTrigger
          render={(props) => {
            if (current) {
              const meta = TEACHING_CHANNEL_META[current]
              const Icon = meta?.icon
              return (
                <button
                  {...props}
                  type="button"
                  disabled={isPending}
                  className={badgeClassName}
                  data-testid="teaching-channel-badge"
                >
                  {Icon && <Icon className="h-3 w-3" />}
                  {meta?.label}
                  <ChevronDown className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity -ml-0.5" />
                </button>
              )
            }
            return (
              <button
                {...props}
                type="button"
                disabled={isPending}
                className={ghostClassName}
                data-testid="teaching-channel-ghost"
              >
                <Plus className="h-3 w-3" />
                channel
              </button>
            )
          }}
        />
        <PopoverContent
          className="w-44 p-1 bg-white/80 backdrop-blur-[12px] shadow-lg"
          side="bottom"
          align="start"
          sideOffset={4}
        >
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleSelect(null)}
            className={[
              'w-full flex items-center gap-2 rounded px-2 py-1.5 text-xs text-zinc-500',
              'hover:bg-zinc-100 transition-colors text-left disabled:opacity-50',
              current === null ? 'font-semibold text-zinc-700 bg-zinc-50' : '',
            ].join(' ')}
            data-testid="channel-option-none"
          >
            None
          </button>
          {TEACHING_CHANNEL_OPTIONS.map((opt) => {
            const meta = TEACHING_CHANNEL_META[opt]
            const Icon = meta.icon
            return (
              <button
                key={opt}
                type="button"
                disabled={isPending}
                onClick={() => handleSelect(opt)}
                className={[
                  'w-full flex items-center gap-2 rounded px-2 py-1.5 text-xs',
                  'hover:bg-zinc-100 transition-colors text-left disabled:opacity-50',
                  current === opt ? 'font-semibold text-zinc-700 bg-zinc-50' : 'text-zinc-600',
                ].join(' ')}
                data-testid={`channel-option-${opt.toLowerCase()}`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {meta.label}
              </button>
            )
          })}
        </PopoverContent>
      </Popover>
      {error && (
        <span className="text-[0.625rem] text-red-500 leading-tight" data-testid="channel-error">
          {error}
        </span>
      )}
    </div>
  )
}
