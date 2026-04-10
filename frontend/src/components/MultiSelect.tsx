import { useState } from 'react'
import { X, ChevronsUpDown, Check, Plus } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder,
  triggerId,
  chipTestId,
  maxLength,
  maxItems,
  allowCustom = true,
}: {
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (values: string[]) => void
  placeholder: string
  triggerId: string
  chipTestId: string
  maxLength?: number
  maxItems?: number
  allowCustom?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')

  const atLimit = maxItems !== undefined && selected.length >= maxItems

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value))
    } else if (!atLimit) {
      onChange([...selected, value])
    }
  }

  function remove(value: string, e: React.MouseEvent) {
    e.stopPropagation()
    onChange(selected.filter((v) => v !== value))
  }

  function addCustom() {
    if (!allowCustom || atLimit) return
    const trimmed = inputValue.trim()
    if (!trimmed) return
    const limited = maxLength ? trimmed.slice(0, maxLength) : trimmed
    if (!selected.includes(limited)) {
      onChange([...selected, limited])
    }
    setInputValue('')
  }

  const trimmedInput = inputValue.trim()
  const customValue = maxLength ? trimmedInput.slice(0, maxLength) : trimmedInput
  const matchesPredefined = trimmedInput.length > 0 && options.some(
    (o) => o.label.toLowerCase() === trimmedInput.toLowerCase()
  )
  const alreadySelected = selected.includes(customValue)
  const showAddCustom = allowCustom && trimmedInput.length > 0 && !matchesPredefined && !alreadySelected && !atLimit
  const filteredOptions = options.filter((o) =>
    !trimmedInput || o.label.toLowerCase().includes(trimmedInput.toLowerCase())
  )

  return (
    <div className="relative z-[1] space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          type="button"
          data-testid={triggerId}
          className="flex w-full max-w-sm items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-50"
        >
          {selected.length === 0 ? placeholder : `${selected.length} selected`}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-64 max-w-[calc(100vw-2rem)] p-0 z-[60]" align="start" side="bottom">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={allowCustom ? 'Search or type custom...' : 'Search...'}
              value={inputValue}
              onValueChange={setInputValue}
            />
            <CommandList>
              {!showAddCustom && filteredOptions.length === 0 && (
                <CommandEmpty>No options found.</CommandEmpty>
              )}
              <CommandGroup>
                {filteredOptions.map((opt) => (
                    <CommandItem
                      key={opt.value}
                      value={opt.value}
                      onSelect={() => toggle(opt.value)}
                      disabled={atLimit && !selected.includes(opt.value)}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          selected.includes(opt.value) ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {opt.label}
                    </CommandItem>
                  ))}
              </CommandGroup>
              {showAddCustom && (
                <CommandGroup>
                  <CommandItem
                    value={`custom:${trimmedInput}`}
                    onSelect={addCustom}
                    data-testid="add-custom-entry"
                  >
                    <Plus className="mr-2 h-4 w-4 text-indigo-500" />
                    Add &ldquo;{trimmedInput}&rdquo;
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
          {selected.map((value) => {
            const label = options.find((o) => o.value === value)?.label ?? value
            return (
              <span
                key={value}
                className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded px-2 py-0.5"
                data-testid={chipTestId}
              >
                {label}
                <button
                  type="button"
                  onClick={(e) => remove(value, e)}
                  className="text-indigo-400 hover:text-indigo-700 p-0.5 -mr-0.5"
                  aria-label={`Remove ${label}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
