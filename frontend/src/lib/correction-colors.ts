import type { CorrectionTagCategory } from '../types/correction'

export interface CategoryStyle {
  label: string
  underline: string
  chipBg: string
  chipText: string
  letter: string
}

const STYLES: Record<Exclude<CorrectionTagCategory, 'MuyBien'>, CategoryStyle> = {
  C: {
    label: 'Cohesión',
    underline: 'decoration-indigo-500',
    chipBg: 'bg-indigo-100',
    chipText: 'text-indigo-700',
    letter: 'C',
  },
  G: {
    label: 'Gramática',
    underline: 'decoration-orange-500',
    chipBg: 'bg-orange-100',
    chipText: 'text-orange-700',
    letter: 'G',
  },
  L: {
    label: 'Léxico',
    underline: 'decoration-amber-500',
    chipBg: 'bg-amber-100',
    chipText: 'text-amber-700',
    letter: 'L',
  },
  O: {
    label: 'Ortografía',
    underline: 'decoration-emerald-500',
    chipBg: 'bg-emerald-100',
    chipText: 'text-emerald-700',
    letter: 'O',
  },
}

export function getCategoryStyle(
  category: Exclude<CorrectionTagCategory, 'MuyBien'>,
): CategoryStyle {
  return STYLES[category]
}
