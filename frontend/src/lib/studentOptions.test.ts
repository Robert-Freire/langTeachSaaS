import { describe, it, expect } from 'vitest'
import { getWeaknessesForLanguage } from './studentOptions'

describe('getWeaknessesForLanguage', () => {
  it('returns common + English-specific weaknesses for English', () => {
    const result = getWeaknessesForLanguage('English')
    const values = result.map((o) => o.value)
    expect(values).toContain('past tenses')
    expect(values).toContain('pronunciation')
    expect(values).toContain('phrasal verbs')
    expect(values).toContain('articles')
    expect(values).not.toContain('ser/estar')
  })

  it('returns common + Spanish-specific weaknesses for Spanish', () => {
    const result = getWeaknessesForLanguage('Spanish')
    const values = result.map((o) => o.value)
    expect(values).toContain('past tenses')
    expect(values).toContain('ser/estar')
    expect(values).toContain('subjunctive')
    expect(values).not.toContain('phrasal verbs')
  })

  it('returns common + French-specific weaknesses for French', () => {
    const result = getWeaknessesForLanguage('French')
    const values = result.map((o) => o.value)
    expect(values).toContain('partitive articles')
    expect(values).toContain('gender agreement')
    expect(values).not.toContain('phrasal verbs')
  })

  it('returns common + German-specific weaknesses for German', () => {
    const result = getWeaknessesForLanguage('German')
    const values = result.map((o) => o.value)
    expect(values).toContain('cases')
    expect(values).toContain('word order')
    expect(values).not.toContain('ser/estar')
  })

  it('returns common-only for unknown languages', () => {
    const result = getWeaknessesForLanguage('Mandarin')
    const values = result.map((o) => o.value)
    expect(values).toContain('past tenses')
    expect(values).toContain('pronunciation')
    expect(values).not.toContain('phrasal verbs')
    expect(values).not.toContain('ser/estar')
  })

  it('returns common-only for empty string', () => {
    const result = getWeaknessesForLanguage('')
    const values = result.map((o) => o.value)
    expect(values).toContain('past tenses')
    expect(values).not.toContain('phrasal verbs')
    expect(values).not.toContain('ser/estar')
  })

  it('returns options with both value and label fields', () => {
    const result = getWeaknessesForLanguage('English')
    for (const opt of result) {
      expect(opt).toHaveProperty('value')
      expect(opt).toHaveProperty('label')
      expect(opt.value.length).toBeGreaterThan(0)
      expect(opt.label.length).toBeGreaterThan(0)
    }
  })
})
