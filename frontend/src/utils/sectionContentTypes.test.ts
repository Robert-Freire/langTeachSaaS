import { describe, it, expect } from 'vitest'
import { getAllowedContentTypes } from './sectionContentTypes'

describe('getAllowedContentTypes', () => {
  describe('WarmUp section', () => {
    it('returns only free-text for A1 level', () => {
      expect(getAllowedContentTypes('WarmUp', 'A1')).toEqual(['free-text'])
    })

    it('returns only free-text for A2 level', () => {
      expect(getAllowedContentTypes('WarmUp', 'A2')).toEqual(['free-text'])
    })

    it('returns free-text and conversation for B1 level', () => {
      expect(getAllowedContentTypes('WarmUp', 'B1')).toEqual(['free-text', 'conversation'])
    })

    it('returns free-text and conversation for B2 level', () => {
      expect(getAllowedContentTypes('WarmUp', 'B2')).toEqual(['free-text', 'conversation'])
    })

    it('returns free-text and conversation for C1 level', () => {
      expect(getAllowedContentTypes('WarmUp', 'C1')).toEqual(['free-text', 'conversation'])
    })

    it('excludes vocabulary, grammar, exercises from WarmUp', () => {
      const types = getAllowedContentTypes('WarmUp', 'A1')
      expect(types).not.toContain('vocabulary')
      expect(types).not.toContain('grammar')
      expect(types).not.toContain('exercises')
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

    it('excludes vocabulary, grammar, reading from Practice', () => {
      const types = getAllowedContentTypes('Practice', 'B1')
      expect(types).not.toContain('vocabulary')
      expect(types).not.toContain('grammar')
      expect(types).not.toContain('reading')
    })
  })

  describe('Production section', () => {
    it('returns free-text, conversation, reading', () => {
      expect(getAllowedContentTypes('Production', 'B1')).toEqual(['free-text', 'conversation', 'reading'])
    })

    it('excludes exercises from Production', () => {
      const types = getAllowedContentTypes('Production', 'B1')
      expect(types).not.toContain('exercises')
    })
  })

  describe('WrapUp section', () => {
    it('returns only free-text', () => {
      expect(getAllowedContentTypes('WrapUp', 'B1')).toEqual(['free-text'])
    })
  })

  describe('default (unknown section)', () => {
    it('returns full list including free-text for unknown section type', () => {
      // TypeScript prevents this at compile time but the default branch exists for safety
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
