export const CEFR_ORDER: Record<string, number> = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 }

// Strips sub-level suffixes (e.g. "B1.2" → "B1", "B2+" → "B2") so CEFR_ORDER lookups
// work for skill level overrides that may use teacher-assigned sub-levels.
export function toBaseCefrLevel(level: string | undefined): string {
  if (!level) return ''
  const upper = level.toUpperCase().trim()
  if (upper.length >= 2) {
    const base = upper.slice(0, 2)
    if (CEFR_ORDER[base] !== undefined) return base
  }
  return upper
}
