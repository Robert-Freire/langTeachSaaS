import type { TopicTag } from '@/api/sessionLogs'

// Spanish EFL keyword vocabulary for auto-suggestion.
// Each entry is [keyword, display label]. Keyword is matched case-insensitively in the narrative.
const KEYWORDS: [string, string][] = [
  ['subjuntivo', 'subjuntivo'],
  ['subjunctive', 'subjunctive'],
  ['pretérito', 'pretérito'],
  ['preterite', 'preterite'],
  ['imperfecto', 'imperfecto'],
  ['imperfect', 'imperfect'],
  ['indefinido', 'indefinido'],
  ['condicional', 'condicional'],
  ['conditional', 'conditional'],
  ['futuro', 'futuro'],
  ['pluscuamperfecto', 'pluscuamperfecto'],
  ['gerundio', 'gerundio'],
  ['imperativo', 'imperativo'],
  ['infinitivo', 'infinitivo'],
  ['ser/estar', 'ser/estar'],
  ['ser vs estar', 'ser/estar'],
  ['por/para', 'por/para'],
  ['por vs para', 'por/para'],
  ['preposiciones', 'preposiciones'],
  ['conjunciones', 'conjunciones'],
  ['artículos', 'artículos'],
  ['pronunciación', 'pronunciación'],
  ['pronunciation', 'pronunciation'],
  ['vocabulario', 'vocabulario'],
  ['vocabulary', 'vocabulary'],
  ['gramática', 'gramática'],
  ['grammar', 'grammar'],
  ['comprensión', 'comprensión'],
  ['lectura', 'lectura'],
  ['escritura', 'escritura'],
  ['conversación', 'conversación'],
  ['fonética', 'fonética'],
  ['listening', 'listening'],
  ['speaking', 'speaking'],
  ['reading', 'reading'],
  ['writing', 'writing'],
]

const MAX_SUGGESTIONS = 5

/**
 * Suggests topic tags from a session narrative via keyword matching.
 * Already-added tags (by label, case-insensitive) are excluded.
 */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function suggestTopicTags(narrative: string, existing: TopicTag[]): string[] {
  if (!narrative.trim()) return []

  const existingLabels = new Set(existing.map(t => t.tag.toLowerCase()))
  const seen = new Set<string>()
  const suggestions: string[] = []

  for (const [keyword, label] of KEYWORDS) {
    if (suggestions.length >= MAX_SUGGESTIONS) break
    const pattern = new RegExp('\\b' + escapeRegex(keyword) + '\\b', 'i')
    if (pattern.test(narrative) && !existingLabels.has(label.toLowerCase()) && !seen.has(label)) {
      seen.add(label)
      suggestions.push(label)
    }
  }

  return suggestions
}
