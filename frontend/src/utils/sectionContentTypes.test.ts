import { describe, it, expect } from 'vitest'
import { getAllowedContentTypes, getContentTypeLabel } from './sectionContentTypes'

describe('getAllowedContentTypes', () => {
  describe('WarmUp section', () => {
    it('returns only conversation for A1 level', () => {
      expect(getAllowedContentTypes('WarmUp', 'A1')).toEqual(['conversation'])
    })

    it('returns only conversation for A2 level', () => {
      expect(getAllowedContentTypes('WarmUp', 'A2')).toEqual(['conversation'])
    })

    it('returns only conversation for B1 level', () => {
      expect(getAllowedContentTypes('WarmUp', 'B1')).toEqual(['conversation'])
    })

    it('returns only conversation for B2 level', () => {
      expect(getAllowedContentTypes('WarmUp', 'B2')).toEqual(['conversation'])
    })

    it('returns only conversation for C1 level', () => {
      expect(getAllowedContentTypes('WarmUp', 'C1')).toEqual(['conversation'])
    })

    it('returns only conversation for C2 level', () => {
      expect(getAllowedContentTypes('WarmUp', 'C2')).toEqual(['conversation'])
    })

    it('excludes vocabulary, grammar, exercises, free-text from WarmUp', () => {
      const types = getAllowedContentTypes('WarmUp', 'A1')
      expect(types).not.toContain('vocabulary')
      expect(types).not.toContain('grammar')
      expect(types).not.toContain('exercises')
      expect(types).not.toContain('free-text')
    })
  })

  describe('Presentation section', () => {
    it('returns grammar, vocabulary, reading, conversation, free-text', () => {
      const types = getAllowedContentTypes('Presentation', 'B1')
      expect(types).toContain('grammar')
      expect(types).toContain('vocabulary')
      expect(types).toContain('reading')
      expect(types).toContain('conversation')
      expect(types).toContain('free-text')
    })

    it('excludes exercises from Presentation', () => {
      const types = getAllowedContentTypes('Presentation', 'B1')
      expect(types).not.toContain('exercises')
    })
  })

  describe('Practice section', () => {
    it('returns only exercises and conversation', () => {
      expect(getAllowedContentTypes('Practice', 'B1')).toEqual(['exercises', 'conversation'])
    })

    it('excludes vocabulary, grammar, reading, free-text from Practice', () => {
      const types = getAllowedContentTypes('Practice', 'B1')
      expect(types).not.toContain('vocabulary')
      expect(types).not.toContain('grammar')
      expect(types).not.toContain('reading')
      expect(types).not.toContain('free-text')
    })
  })

  describe('Production section', () => {
    it('returns only conversation for A1', () => {
      expect(getAllowedContentTypes('Production', 'A1')).toEqual(['conversation'])
    })

    it('returns only conversation for B1', () => {
      expect(getAllowedContentTypes('Production', 'B1')).toEqual(['conversation'])
    })

    it('returns conversation and reading for B2', () => {
      expect(getAllowedContentTypes('Production', 'B2')).toEqual(['conversation', 'reading'])
    })

    it('returns conversation and reading for C1', () => {
      expect(getAllowedContentTypes('Production', 'C1')).toEqual(['conversation', 'reading'])
    })

    it('excludes exercises from Production', () => {
      const types = getAllowedContentTypes('Production', 'B1')
      expect(types).not.toContain('exercises')
    })
  })

  describe('WrapUp section', () => {
    it('returns only conversation for all levels', () => {
      for (const level of ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']) {
        expect(getAllowedContentTypes('WrapUp', level)).toEqual(['conversation'])
      }
    })

    it('excludes free-text from WrapUp', () => {
      const types = getAllowedContentTypes('WrapUp', 'B1')
      expect(types).not.toContain('free-text')
    })
  })

  describe('default (unknown section)', () => {
    it('returns full list for unknown section type', () => {
      const types = getAllowedContentTypes('Unknown' as never, 'B1')
      expect(types).toContain('vocabulary')
      expect(types).toContain('grammar')
      expect(types).toContain('exercises')
      expect(types).toContain('conversation')
      expect(types).toContain('reading')
      expect(types).toContain('homework')
      expect(types).toContain('free-text')
    })
  })
})

describe('getContentTypeLabel', () => {
  it('returns Conversation starter for WarmUp + conversation', () => {
    expect(getContentTypeLabel('WarmUp', 'conversation', 'Conversation')).toBe('Conversation starter')
  })

  it('returns Reflection for WrapUp + conversation', () => {
    expect(getContentTypeLabel('WrapUp', 'conversation', 'Conversation')).toBe('Reflection')
  })

  it('returns generic label for non-override combinations', () => {
    expect(getContentTypeLabel('Practice', 'exercises', 'Exercises')).toBe('Exercises')
    expect(getContentTypeLabel('Presentation', 'grammar', 'Grammar')).toBe('Grammar')
  })

  it('returns generic label for WarmUp non-conversation types', () => {
    expect(getContentTypeLabel('WarmUp', 'grammar', 'Grammar')).toBe('Grammar')
  })
})
