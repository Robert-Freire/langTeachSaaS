import { describe, it, expect } from 'vitest'
import { LEARNING_GOALS, COMPETENCY_OPTIONS, SEVERITY_LEVELS } from './studentOptions'

describe('studentOptions', () => {
  it('LEARNING_GOALS has value and label fields', () => {
    for (const opt of LEARNING_GOALS) {
      expect(opt).toHaveProperty('value')
      expect(opt).toHaveProperty('label')
      expect(opt.value.length).toBeGreaterThan(0)
      expect(opt.label.length).toBeGreaterThan(0)
    }
  })

  it('COMPETENCY_OPTIONS contains Grammar and Vocabulary', () => {
    const values = COMPETENCY_OPTIONS.map((o) => o.value)
    expect(values).toContain('Grammar')
    expect(values).toContain('Vocabulary')
  })

  it('SEVERITY_LEVELS contains low, medium, high', () => {
    const values = SEVERITY_LEVELS.map((o) => o.value)
    expect(values).toContain('low')
    expect(values).toContain('medium')
    expect(values).toContain('high')
  })
})
