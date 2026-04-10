import { describe, it, expect } from 'vitest'
import { fieldTooltips, getFieldTooltip } from './field-tooltips'

const EXPECTED_KEYS = [
  'name', 'birthYear', 'profession', 'countryOfOrigin', 'cityOfOrigin',
  'countryOfResidence', 'cityOfResidence', 'nativeLanguages', 'spokenLanguages',
  'reasonForStudying', 'personalNotes', 'learningLanguage', 'cefrLevel',
  'officialCefrLevel', 'skillLevelOverrides', 'difficulties', 'learningGoals',
  'shortTermObjectives', 'teachingTodos', 'teachingNotes', 'isActive',
  'isCorporate', 'rate', 'weaknesses', 'interests',
]

describe('field-tooltips data', () => {
  it('contains all expected field keys', () => {
    for (const key of EXPECTED_KEYS) {
      expect(fieldTooltips[key], `missing key: ${key}`).toBeDefined()
    }
  })

  it('every entry has short and detail text', () => {
    for (const [key, entry] of Object.entries(fieldTooltips)) {
      expect(entry.short, `${key}.short`).toBeTruthy()
      expect(entry.detail, `${key}.detail`).toBeTruthy()
    }
  })

  it('every entry has a label and sourceGuide', () => {
    for (const [key, entry] of Object.entries(fieldTooltips)) {
      expect(entry.label, `${key}.label`).toBeTruthy()
      expect(entry.sourceGuide, `${key}.sourceGuide`).toBeTruthy()
    }
  })

  it('relatedFields references only known keys', () => {
    const knownKeys = new Set(Object.keys(fieldTooltips))
    for (const [key, entry] of Object.entries(fieldTooltips)) {
      for (const ref of entry.relatedFields) {
        expect(knownKeys.has(ref), `${key}.relatedFields references unknown key "${ref}"`).toBe(true)
      }
    }
  })

  it('getFieldTooltip returns entry for known key', () => {
    expect(getFieldTooltip('cefrLevel')).toBeDefined()
    expect(getFieldTooltip('cefrLevel')?.label).toBe('CEFR Level')
  })

  it('getFieldTooltip returns undefined for unknown key', () => {
    expect(getFieldTooltip('nope')).toBeUndefined()
  })
})
