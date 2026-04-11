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

