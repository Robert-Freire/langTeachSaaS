import { describe, it, expect } from 'vitest'
import { CEFR_ORDER } from './cefrUtils'

describe('CEFR_ORDER', () => {
  it('contains all six CEFR levels', () => {
    expect(Object.keys(CEFR_ORDER)).toEqual(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
  })

  it('assigns strictly increasing numeric values', () => {
    const values = Object.values(CEFR_ORDER)
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1])
    }
  })

  it('A1 maps to 1 and C2 maps to 6', () => {
    expect(CEFR_ORDER['A1']).toBe(1)
    expect(CEFR_ORDER['C2']).toBe(6)
  })
})
