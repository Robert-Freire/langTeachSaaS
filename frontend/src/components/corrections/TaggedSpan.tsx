import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { getCategoryStyle } from '@/lib/correction-colors'
import type { CorrectionTag, CorrectionTagCategory } from '@/api/corrections'

export type ChipCategory = Exclude<CorrectionTagCategory, 'MuyBien'>

interface TaggedSpanProps {
  tag: CorrectionTag
  text: string
}

export function TaggedSpan({ tag, text }: TaggedSpanProps) {
  if (tag.category === 'MuyBien') return null
  const style = getCategoryStyle(tag.category)
  return (
    <Popover>
      <PopoverTrigger
        render={(props) => (
          <button
            type="button"
            {...props}
            aria-label={`Marca de ${style.label}: ${tag.spannedText}`}
            className={`inline cursor-pointer underline decoration-2 underline-offset-4 ${style.underline} hover:decoration-[3px] focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-offset-1`}
          >
            <span>{text}</span>
            <sup
              aria-hidden="true"
              className={`ml-0.5 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-sm px-0.5 text-[0.6rem] font-semibold leading-none ${style.chipBg} ${style.chipText}`}
            >
              {style.letter}
            </sup>
          </button>
        )}
      />
      <PopoverContent className="w-72 p-3" align="center" side="bottom">
        <div className="space-y-2">
          <div className="text-[0.6875rem] font-semibold uppercase tracking-wide text-zinc-500">
            {style.label}
          </div>
          <blockquote className="border-l-2 border-zinc-200 pl-2 text-sm italic text-zinc-700">
            "{tag.spannedText}"
          </blockquote>
          {tag.explanation && (
            <p className="text-sm text-zinc-700">{tag.explanation}</p>
          )}
          {tag.correctedForm && (
            <p className="text-sm">
              <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-zinc-500">
                Forma corregida{' '}
              </span>
              <span className="font-medium text-zinc-900">{tag.correctedForm}</span>
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
