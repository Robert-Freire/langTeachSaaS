import { describe, it, expect } from 'vitest'
import { isGuidedWritingContent, coerceGuidedWritingContent, isErrorCorrectionContent, coerceErrorCorrectionContent, isExercisesContent, coerceExercisesContent } from './contentTypes'

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

const validEc = {
  mode: 'identify-and-correct' as const,
  items: [
    {
      sentence: 'Yo soy muy calor',
      errorSpan: [3, 11] as [number, number],
      correction: 'tengo mucho calor',
      errorType: 'grammar' as const,
      explanation: 'Use tener for physical sensations.',
    },
  ],
}

describe('isErrorCorrectionContent', () => {
  it('returns true for valid content', () => {
    expect(isErrorCorrectionContent(validEc)).toBe(true)
  })

  it('returns true for identify-only mode', () => {
    expect(isErrorCorrectionContent({ ...validEc, mode: 'identify-only' })).toBe(true)
  })

  it('returns true when explanation is absent', () => {
    const noExpl = { ...validEc, items: [{ ...validEc.items[0], explanation: undefined }] }
    expect(isErrorCorrectionContent(noExpl)).toBe(true)
  })

  it('returns false for null', () => {
    expect(isErrorCorrectionContent(null)).toBe(false)
  })

  it('returns false when mode is invalid', () => {
    expect(isErrorCorrectionContent({ ...validEc, mode: 'wrong' })).toBe(false)
  })

  it('returns false when items is not an array', () => {
    expect(isErrorCorrectionContent({ ...validEc, items: 'bad' })).toBe(false)
  })

  it('returns false when an item is missing errorSpan', () => {
    const bad = { ...validEc, items: [{ ...validEc.items[0], errorSpan: undefined }] }
    expect(isErrorCorrectionContent(bad)).toBe(false)
  })
})

describe('coerceErrorCorrectionContent', () => {
  it('returns valid content as-is', () => {
    const result = coerceErrorCorrectionContent(validEc)
    expect(result).toEqual(validEc)
  })

  it('defaults mode to identify-and-correct when missing', () => {
    const input = { items: validEc.items }
    const result = coerceErrorCorrectionContent(input)
    expect(result).not.toBeNull()
    expect(result!.mode).toBe('identify-and-correct')
  })

  it('defaults unknown errorType to grammar', () => {
    const input = {
      ...validEc,
      items: [{ ...validEc.items[0], errorType: 'unknown-type' }],
    }
    const result = coerceErrorCorrectionContent(input)
    expect(result).not.toBeNull()
    expect(result!.items[0].errorType).toBe('grammar')
  })

  it('unwraps a wrapper key', () => {
    const wrapped = { errorCorrection: validEc }
    const result = coerceErrorCorrectionContent(wrapped)
    expect(result).not.toBeNull()
    expect(result!.mode).toBe(validEc.mode)
  })

  it('returns null for unrecognized shape', () => {
    expect(coerceErrorCorrectionContent({ foo: 'bar' })).toBeNull()
  })
})

// ─── isExercisesContent (sentenceOrdering) ────────────────────────────────────

const validExercises = {
  fillInBlank: [{ sentence: 'S', answer: 'A' }],
  multipleChoice: [{ question: 'Q', options: ['a', 'b'], answer: 'a' }],
  matching: [{ left: 'L', right: 'R' }],
}

describe('isExercisesContent (sentenceOrdering)', () => {
  it('accepts content without sentenceOrdering (backward compat)', () => {
    expect(isExercisesContent(validExercises)).toBe(true)
  })

  it('accepts content with sentenceOrdering', () => {
    const withSo = {
      ...validExercises,
      sentenceOrdering: [{ fragments: ['yo', 'soy'], correctOrder: [0, 1] }],
    }
    expect(isExercisesContent(withSo)).toBe(true)
  })
})

describe('coerceExercisesContent (sentenceOrdering)', () => {
  it('preserves sentenceOrdering when present', () => {
    const input = { ...validExercises, sentenceOrdering: [{ fragments: ['yo', 'soy'], correctOrder: [0, 1] }] }
    const result = coerceExercisesContent(input)
    expect(result?.sentenceOrdering).toHaveLength(1)
    expect(result?.sentenceOrdering?.[0].fragments).toEqual(['yo', 'soy'])
  })

  it('handles AI response with only sentenceOrdering (no other arrays)', () => {
    const input = { sentenceOrdering: [{ fragments: ['yo', 'soy'], correctOrder: [0, 1] }] }
    const result = coerceExercisesContent(input)
    expect(result).not.toBeNull()
    expect(result?.sentenceOrdering).toHaveLength(1)
    expect(result?.fillInBlank).toEqual([])
    expect(result?.multipleChoice).toEqual([])
    expect(result?.matching).toEqual([])
  })

  it('sets sentenceOrdering to undefined when not present', () => {
    const result = coerceExercisesContent(validExercises)
    expect(result?.sentenceOrdering).toBeUndefined()
  })
})

// ─── isExercisesContent (sentenceTransformation) ─────────────────────────────

describe('isExercisesContent (sentenceTransformation)', () => {
  it('accepts content without sentenceTransformation (backward compat)', () => {
    expect(isExercisesContent(validExercises)).toBe(true)
  })

  it('accepts content with sentenceTransformation', () => {
    const withSt = {
      ...validExercises,
      sentenceTransformation: [{ prompt: 'Rewrite in past', original: 'Ella sale.', expected: 'Ella salio.' }],
    }
    expect(isExercisesContent(withSt)).toBe(true)
  })
})

describe('coerceExercisesContent (sentenceTransformation)', () => {
  it('preserves sentenceTransformation when present', () => {
    const input = {
      ...validExercises,
      sentenceTransformation: [{ prompt: 'P', original: 'O', expected: 'E', alternatives: ['A1'] }],
    }
    const result = coerceExercisesContent(input)
    expect(result?.sentenceTransformation).toHaveLength(1)
    expect(result?.sentenceTransformation?.[0].expected).toBe('E')
    expect(result?.sentenceTransformation?.[0].alternatives).toEqual(['A1'])
  })

  it('handles AI response with only sentenceTransformation (no other arrays)', () => {
    const input = { sentenceTransformation: [{ prompt: 'P', original: 'O', expected: 'E' }] }
    const result = coerceExercisesContent(input)
    expect(result).not.toBeNull()
    expect(result?.sentenceTransformation).toHaveLength(1)
    expect(result?.fillInBlank).toEqual([])
    expect(result?.multipleChoice).toEqual([])
    expect(result?.matching).toEqual([])
  })

  it('handles snake_case sentence_transformation from AI', () => {
    const input = { sentence_transformation: [{ prompt: 'P', original: 'O', expected: 'E' }] }
    const result = coerceExercisesContent(input)
    expect(result).not.toBeNull()
    expect(result?.sentenceTransformation).toHaveLength(1)
  })

  it('filters out invalid items missing required fields', () => {
    const input = {
      sentenceTransformation: [
        { prompt: 'P', original: 'O', expected: 'E' },
        { prompt: 'P', original: 'O' },
        { notAField: true },
      ],
    }
    const result = coerceExercisesContent(input)
    expect(result?.sentenceTransformation).toHaveLength(1)
  })

  it('sets sentenceTransformation to undefined when not present', () => {
    const result = coerceExercisesContent(validExercises)
    expect(result?.sentenceTransformation).toBeUndefined()
  })
})
