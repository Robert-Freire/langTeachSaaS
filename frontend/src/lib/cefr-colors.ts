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
