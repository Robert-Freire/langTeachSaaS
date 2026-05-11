import { CHIP_CATEGORIES, getCategoryStyle } from '@/lib/correction-colors'

export function ChipLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {CHIP_CATEGORIES.map((cat) => {
        const s = getCategoryStyle(cat)
        return (
          <span key={cat} className="inline-flex items-center gap-1.5">
            <span
              className={`inline-flex h-5 w-5 items-center justify-center rounded text-[0.6rem] font-bold ${s.chipBg} ${s.chipText}`}
            >
              {s.letter}
            </span>
            <span className="text-xs text-zinc-500">{s.label}</span>
          </span>
        )
      })}
    </div>
  )
}
