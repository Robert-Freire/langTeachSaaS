import { ALL_LANGUAGES } from './languages'
import { COMPETENCY_OPTIONS } from './studentOptions'

/**
 * Normalizes language and difficulty-competency strings extracted by the
 * (monolingual) student-profile extraction service into the canonical English
 * forms accepted by the backend allowlists. The extractor returns values in
 * whatever language the teacher speaks; this module bridges that to the
 * server-side validation in `StudentService.AllowedNativeLanguages` and
 * `PedagogyConfigService.GetValidDifficultyCompetencies`.
 */

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/\p{Mn}/gu, '')
}

function key(s: string): string {
  return stripDiacritics(s).trim().toLowerCase()
}

const LANGUAGE_ALIASES: Record<string, string> = {
  // Spanish
  ingles: 'English',
  espanol: 'Spanish',
  castellano: 'Spanish',
  catalan: 'Catalan',
  frances: 'French',
  aleman: 'German',
  italiano: 'Italian',
  portugues: 'Portuguese',
  ruso: 'Russian',
  chino: 'Chinese (Mandarin)',
  mandarin: 'Chinese (Mandarin)',
  cantones: 'Chinese (Cantonese)',
  japones: 'Japanese',
  coreano: 'Korean',
  arabe: 'Arabic',
  hebreo: 'Hebrew',
  griego: 'Greek',
  turco: 'Turkish',
  holandes: 'Dutch',
  neerlandes: 'Dutch',
  polaco: 'Polish',
  sueco: 'Swedish',
  noruego: 'Norwegian',
  danes: 'Danish',
  finlandes: 'Finnish',
  // French
  anglais: 'English',
  espagnol: 'Spanish',
  francais: 'French',
  allemand: 'German',
  // German
  englisch: 'English',
  spanisch: 'Spanish',
  franzosisch: 'French',
  deutsch: 'German',
  // Italian
  inglese: 'English',
  spagnolo: 'Spanish',
  francese: 'French',
  tedesco: 'German',
  // Portuguese
  espanhol: 'Spanish',
  alemao: 'German',
}

const LANGUAGE_LOOKUP: Map<string, string> = (() => {
  const map = new Map<string, string>()
  for (const lang of ALL_LANGUAGES) map.set(key(lang), lang)
  for (const [alias, canonical] of Object.entries(LANGUAGE_ALIASES)) {
    if (!map.has(alias)) map.set(alias, canonical)
  }
  return map
})()

export function normalizeLanguage(input: string | null | undefined): string | null {
  if (input == null) return null
  const k = key(input)
  if (k.length === 0) return null
  return LANGUAGE_LOOKUP.get(k) ?? null
}

export function normalizeLanguages(inputs: readonly string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const item of inputs) {
    const canonical = normalizeLanguage(item)
    if (canonical && !seen.has(canonical)) {
      seen.add(canonical)
      out.push(canonical)
    }
  }
  return out
}

/**
 * Canonical competencies are sourced from COMPETENCY_OPTIONS, which mirrors
 * the backend taxonomy in data/pedagogy/difficulty-taxonomy.json
 * (Grammar, Vocabulary, Pronunciation, Interaction, Discourse, Mediation).
 * The extraction prompt also lists the four macro-skills (Listening, Speaking,
 * Reading, Writing) as examples; those are mapped to the closest backend
 * competency:
 *   Listening/Speaking → Interaction (oral exchange)
 *   Reading/Writing    → Discourse (extended text)
 * Unknown values fall back to "Grammar". The literal "general" mentioned in
 * issue #963 is not used because it is not in the backend allowlist.
 */
const CANONICAL_COMPETENCIES = COMPETENCY_OPTIONS.map((o) => o.value)
const COMPETENCY_FALLBACK = 'Grammar'

const COMPETENCY_ALIASES: Record<string, string> = {
  // English macro-skills from the prompt → mapped to closest taxonomy entry
  listening: 'Interaction',
  speaking: 'Interaction',
  reading: 'Discourse',
  writing: 'Discourse',
  // Spanish
  gramatica: 'Grammar',
  vocabulario: 'Vocabulary',
  lexico: 'Vocabulary',
  pronunciacion: 'Pronunciation',
  interaccion: 'Interaction',
  discurso: 'Discourse',
  mediacion: 'Mediation',
  escucha: 'Interaction',
  'comprension auditiva': 'Interaction',
  habla: 'Interaction',
  'expresion oral': 'Interaction',
  lectura: 'Discourse',
  'comprension lectora': 'Discourse',
  escritura: 'Discourse',
  'expresion escrita': 'Discourse',
  // French
  grammaire: 'Grammar',
  vocabulaire: 'Vocabulary',
  prononciation: 'Pronunciation',
  // Italian / Portuguese (gramatica + vocabulario already covered above)
  grammatica: 'Grammar',
  vocabolario: 'Vocabulary',
  pronuncia: 'Pronunciation',
}

const COMPETENCY_LOOKUP: Map<string, string> = (() => {
  const map = new Map<string, string>()
  for (const canonical of CANONICAL_COMPETENCIES) map.set(key(canonical), canonical)
  for (const [alias, canonical] of Object.entries(COMPETENCY_ALIASES)) {
    if (!map.has(alias)) map.set(alias, canonical)
  }
  return map
})()

export function normalizeCompetency(input: string | null | undefined): string {
  if (input == null) return COMPETENCY_FALLBACK
  const k = key(input)
  if (k.length === 0) return COMPETENCY_FALLBACK
  return COMPETENCY_LOOKUP.get(k) ?? COMPETENCY_FALLBACK
}
