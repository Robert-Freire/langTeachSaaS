import { useState } from 'react'
import { CalendarIcon } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface DateTimePickerProps {
  value: string
  onChange: (value: string) => void
  className?: string
  'data-testid'?: string
  autoFocus?: boolean
}

function formatDisplay(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

function nearestMinute(min: number): string {
  return String(Math.round(min / 5) * 5 % 60).padStart(2, '0')
}

export function DateTimePicker({ value, onChange, className, autoFocus, ...props }: DateTimePickerProps) {
  const [open, setOpen] = useState(autoFocus ?? false)

  const parsedDate = value ? new Date(value) : undefined
  const isValid = parsedDate && !isNaN(parsedDate.getTime())

  const selectedDate = isValid ? parsedDate : undefined
  const hour = isValid ? String(parsedDate.getHours()).padStart(2, '0') : '10'
  const minute = isValid ? nearestMinute(parsedDate?.getMinutes() ?? 0) : '00'

  function buildValue(date: Date | undefined, h: string, m: string): string {
    if (!date) return ''
    const y = date.getFullYear()
    const mo = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${mo}-${d}T${h}:${m}`
  }

  function handleDateSelect(date: Date | undefined) {
    if (!date) return
    onChange(buildValue(date, hour, minute))
  }

  function handleHourChange(h: string | null) {
    if (!h || !selectedDate) return
    onChange(buildValue(selectedDate, h, minute))
  }

  function handleMinuteChange(m: string | null) {
    if (!m || !selectedDate) return
    onChange(buildValue(selectedDate, hour, m))
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !value && 'text-muted-foreground',
              className,
            )}
            data-testid={props['data-testid']}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? formatDisplay(value) : 'Pick a date & time'}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
        />
        <div className="border-t border-border px-3 py-2 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Time:</span>
          <Select value={hour} onValueChange={handleHourChange}>
            <SelectTrigger className="w-16 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HOURS.map(h => (
                <SelectItem key={h} value={h}>{h}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">:</span>
          <Select value={minute} onValueChange={handleMinuteChange}>
            <SelectTrigger className="w-16 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MINUTES.map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface TimePickerProps {
  value: string
  onChange: (value: string) => void
  className?: string
  'data-testid'?: string
}

export function TimePicker({ value, onChange, className, ...props }: TimePickerProps) {
  const [h, m] = (value || '10:00').split(':')
  const hour = h?.padStart(2, '0') ?? '10'
  const minute = nearestMinute(parseInt(m ?? '0'))

  return (
    <div className={cn('flex items-center gap-1', className)} data-testid={props['data-testid']}>
      <Select value={hour} onValueChange={(v) => v && onChange(`${v}:${minute}`)}>
        <SelectTrigger className="w-16 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {HOURS.map(h => (
            <SelectItem key={h} value={h}>{h}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-xs text-muted-foreground">:</span>
      <Select value={minute} onValueChange={(v) => v && onChange(`${hour}:${v}`)}>
        <SelectTrigger className="w-16 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MINUTES.map(m => (
            <SelectItem key={m} value={m}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
