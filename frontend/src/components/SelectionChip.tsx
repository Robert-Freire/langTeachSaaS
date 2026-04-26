import { cn } from '@/lib/utils'

interface SelectionChipProps {
  label: string
  selected: boolean
  onToggle: () => void
}

export function SelectionChip({ label, selected, onToggle }: SelectionChipProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={cn(
        'rounded-full text-sm px-3 select-none transition-colors min-h-[36px] border-0 outline-none',
        selected
          ? 'bg-indigo-600 text-white'
          : 'bg-[#F4F2FD] text-zinc-600 hover:bg-[#E8E7F1]'
      )}
    >
      {label}
    </button>
  )
}
