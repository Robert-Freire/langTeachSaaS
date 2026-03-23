export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const

/**
 * Returns the absolute gap between two CEFR levels (e.g. A1 vs C1 = 4).
 * Returns 0 if either level is unknown or undefined.
 */
export function getCefrGap(level1: string | undefined, level2: string | undefined): number {
  const i1 = CEFR_LEVELS.indexOf(level1 as (typeof CEFR_LEVELS)[number])
  const i2 = CEFR_LEVELS.indexOf(level2 as (typeof CEFR_LEVELS)[number])
  if (i1 === -1 || i2 === -1) return 0
  return Math.abs(i1 - i2)
}

/**
 * Returns Tailwind classes for CEFR level badges, color-coded by proficiency group.
 */
export function getCefrBadgeClasses(level: string): string {
  switch (level) {
    case 'A1':
    case 'A2':
      return 'text-emerald-700 border-emerald-200 bg-emerald-50'
    case 'B1':
    case 'B2':
      return 'text-indigo-700 border-indigo-200 bg-indigo-50'
    case 'C1':
    case 'C2':
      return 'text-purple-700 border-purple-200 bg-purple-50'
    default:
      return 'text-indigo-700 border-indigo-200 bg-indigo-50'
  }
}
