import { describe, it, expect } from 'vitest'
import { normalizeLanguage, normalizeLanguages, normalizeCompetency } from './extractionNormalizer'

describe('normalizeLanguage', () => {
  it('passes canonical English forms through', () => {
    expect(normalizeLanguage('English')).toBe('English')
    expect(normalizeLanguage('Catalan')).toBe('Catalan')
    expect(normalizeLanguage('Portuguese')).toBe('Portuguese')
  })

  it('maps Spanish names to canonical English', () => {
    expect(normalizeLanguage('Inglés')).toBe('English')
    expect(normalizeLanguage('Catalán')).toBe('Catalan')
    expect(normalizeLanguage('Español')).toBe('Spanish')
    expect(normalizeLanguage('Castellano')).toBe('Spanish')
    expect(normalizeLanguage('Francés')).toBe('French')
    expect(normalizeLanguage('Alemán')).toBe('German')
    expect(normalizeLanguage('Portugués')).toBe('Portuguese')
  })

  it('maps French/German/Italian names to canonical English', () => {
    expect(normalizeLanguage('Anglais')).toBe('English')
    expect(normalizeLanguage('Englisch')).toBe('English')
    expect(normalizeLanguage('Inglese')).toBe('English')
  })

  it('is case- and accent-insensitive', () => {
    expect(normalizeLanguage('english')).toBe('English')
    expect(normalizeLanguage('ESPAÑOL')).toBe('Spanish')
    expect(normalizeLanguage('  Português  ')).toBe('Portuguese')
    expect(normalizeLanguage('ingles')).toBe('English')
  })

  it('returns null for unknown values', () => {
    expect(normalizeLanguage('Klingon')).toBeNull()
    expect(normalizeLanguage('')).toBeNull()
    expect(normalizeLanguage('   ')).toBeNull()
    expect(normalizeLanguage(null)).toBeNull()
    expect(normalizeLanguage(undefined)).toBeNull()
  })
})

describe('normalizeLanguages', () => {
  it('drops unknown values and dedupes preserving order', () => {
    expect(normalizeLanguages(['Catalán', 'Klingon', 'Inglés', 'Catalan']))
      .toEqual(['Catalan', 'English'])
  })

  it('returns empty array when nothing matches', () => {
    expect(normalizeLanguages([])).toEqual([])
    expect(normalizeLanguages(['Klingon', 'Dothraki'])).toEqual([])
  })
})

describe('normalizeCompetency', () => {
  it('passes canonical taxonomy values through', () => {
    expect(normalizeCompetency('Grammar')).toBe('Grammar')
    expect(normalizeCompetency('Vocabulary')).toBe('Vocabulary')
    expect(normalizeCompetency('Pronunciation')).toBe('Pronunciation')
    expect(normalizeCompetency('Interaction')).toBe('Interaction')
    expect(normalizeCompetency('Discourse')).toBe('Discourse')
    expect(normalizeCompetency('Mediation')).toBe('Mediation')
  })

  it('maps Spanish forms to canonical English', () => {
    expect(normalizeCompetency('Gramática')).toBe('Grammar')
    expect(normalizeCompetency('gramatica')).toBe('Grammar')
    expect(normalizeCompetency('Vocabulario')).toBe('Vocabulary')
    expect(normalizeCompetency('Léxico')).toBe('Vocabulary')
    expect(normalizeCompetency('Pronunciación')).toBe('Pronunciation')
    expect(normalizeCompetency('Mediación')).toBe('Mediation')
  })

  it('maps macro-skill labels to the closest taxonomy entry', () => {
    expect(normalizeCompetency('Listening')).toBe('Interaction')
    expect(normalizeCompetency('Speaking')).toBe('Interaction')
    expect(normalizeCompetency('Reading')).toBe('Discourse')
    expect(normalizeCompetency('Writing')).toBe('Discourse')
    expect(normalizeCompetency('Comprensión auditiva')).toBe('Interaction')
    expect(normalizeCompetency('Expresión escrita')).toBe('Discourse')
  })

  it('falls back to Grammar for unknown / empty / nullish input', () => {
    expect(normalizeCompetency('Phonetics')).toBe('Grammar')
    expect(normalizeCompetency('')).toBe('Grammar')
    expect(normalizeCompetency('   ')).toBe('Grammar')
    expect(normalizeCompetency(null)).toBe('Grammar')
    expect(normalizeCompetency(undefined)).toBe('Grammar')
  })
})
