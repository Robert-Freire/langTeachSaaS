import { describe, it, expect } from 'vitest'
import { suggestTopicTags } from './suggestTopicTags'

describe('suggestTopicTags', () => {
  it('returns empty array for empty narrative', () => {
    expect(suggestTopicTags('', [])).toEqual([])
    expect(suggestTopicTags('   ', [])).toEqual([])
  })

  it('detects Spanish grammar keyword in narrative', () => {
    const result = suggestTopicTags('Revisamos el uso del subjuntivo en oraciones temporales', [])
    expect(result).toContain('subjuntivo')
  })

  it('detects multiple keywords', () => {
    const result = suggestTopicTags('pretérito vs imperfecto differences', [])
    expect(result).toContain('pretérito')
    expect(result).toContain('imperfecto')
  })

  it('is case-insensitive', () => {
    const result = suggestTopicTags('Trabajamos el SUBJUNTIVO', [])
    expect(result).toContain('subjuntivo')
  })

  it('excludes already-added tags', () => {
    const existing = [{ tag: 'subjuntivo' }]
    const result = suggestTopicTags('Hablamos del subjuntivo y el condicional', existing)
    expect(result).not.toContain('subjuntivo')
    expect(result).toContain('condicional')
  })

  it('excludes already-added tags case-insensitively', () => {
    const existing = [{ tag: 'Subjuntivo' }]
    const result = suggestTopicTags('El subjuntivo es importante', existing)
    expect(result).not.toContain('subjuntivo')
  })

  it('caps results at 5', () => {
    const narrative = 'subjuntivo pretérito imperfecto condicional futuro pluscuamperfecto gerundio'
    const result = suggestTopicTags(narrative, [])
    expect(result.length).toBeLessThanOrEqual(5)
  })

  it('handles ser/estar keyword variant', () => {
    const result = suggestTopicTags('Discutimos la diferencia entre ser vs estar', [])
    expect(result).toContain('ser/estar')
  })

  it('deduplicates when multiple keyword variants match the same label', () => {
    // 'ser/estar' and 'ser vs estar' both map to label 'ser/estar'
    const result = suggestTopicTags('ser/estar y ser vs estar', [])
    expect(result.filter(s => s === 'ser/estar').length).toBe(1)
  })

  it('returns empty for narrative with no matching keywords', () => {
    const result = suggestTopicTags('Hicimos ejercicios generales y repasamos el examen', [])
    expect(result).toEqual([])
  })
})
