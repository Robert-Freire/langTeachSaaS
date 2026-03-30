import { describe, it, expect } from 'vitest'
import { isGuidedWritingContent, coerceGuidedWritingContent } from './contentTypes'

const valid = {
  situation: 'Write a short email.',
  requiredStructures: ['presente de indicativo'],
  wordCount: { min: 50, max: 80 },
  evaluationCriteria: ['Uses target structure'],
  modelAnswer: 'Hola, te escribo para...',
}

describe('isGuidedWritingContent', () => {
  it('returns true for valid content', () => {
    expect(isGuidedWritingContent(valid)).toBe(true)
  })

  it('returns true when optional tips field is present', () => {
    expect(isGuidedWritingContent({ ...valid, tips: ['Start with a greeting'] })).toBe(true)
  })

  it('returns false for null', () => {
    expect(isGuidedWritingContent(null)).toBe(false)
  })

  it('returns false when situation is missing', () => {
    const rest = { ...valid, situation: undefined }
    expect(isGuidedWritingContent(rest)).toBe(false)
  })

  it('returns false when modelAnswer is missing', () => {
    const rest = { ...valid, modelAnswer: undefined }
    expect(isGuidedWritingContent(rest)).toBe(false)
  })

  it('returns false when wordCount is not an object', () => {
    expect(isGuidedWritingContent({ ...valid, wordCount: 80 })).toBe(false)
  })

  it('returns false for a homework content object', () => {
    expect(isGuidedWritingContent({ tasks: [{ type: 'Fill', instructions: 'Do it', examples: [] }] })).toBe(false)
  })
})

describe('coerceGuidedWritingContent', () => {
  it('returns valid content as-is', () => {
    const result = coerceGuidedWritingContent(valid)
    expect(result).toEqual(valid)
  })

  it('fills missing requiredStructures with empty array', () => {
    const input = { ...valid, requiredStructures: undefined }
    const result = coerceGuidedWritingContent(input)
    expect(result).not.toBeNull()
    expect(result!.requiredStructures).toEqual([])
  })

  it('fills missing evaluationCriteria with empty array', () => {
    const input = { ...valid, evaluationCriteria: undefined }
    const result = coerceGuidedWritingContent(input)
    expect(result).not.toBeNull()
    expect(result!.evaluationCriteria).toEqual([])
  })

  it('fills missing wordCount with defaults', () => {
    const input = { ...valid, wordCount: undefined }
    const result = coerceGuidedWritingContent(input)
    expect(result).not.toBeNull()
    expect(result!.wordCount.min).toBeGreaterThan(0)
    expect(result!.wordCount.max).toBeGreaterThanOrEqual(result!.wordCount.min)
  })

  it('returns null for unrecognized input', () => {
    expect(coerceGuidedWritingContent({ foo: 'bar' })).toBeNull()
  })

  it('returns null for null input', () => {
    expect(coerceGuidedWritingContent(null)).toBeNull()
  })

  it('unwraps a wrapper key', () => {
    const wrapped = { guidedWriting: valid }
    const result = coerceGuidedWritingContent(wrapped)
    expect(result).not.toBeNull()
    expect(result!.situation).toBe(valid.situation)
  })
})
