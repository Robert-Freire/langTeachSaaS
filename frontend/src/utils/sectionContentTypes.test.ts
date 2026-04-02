import { describe, it, expect } from 'vitest'
import {
  getAllowedContentTypes,
  getContentTypeLabel,
  normalizeLevel,
  type SectionRulesMap,
} from './sectionContentTypes'

// Mock rules matching the backend section profile JSON data
const MOCK_RULES: SectionRulesMap = {
  WarmUp: {
    A1: ['conversation'],
    A2: ['conversation'],
    B1: ['conversation'],
    B2: ['conversation'],
    C1: ['conversation'],
    C2: ['conversation'],
  },
  Presentation: {
    A1: ['grammar', 'vocabulary', 'reading', 'conversation'],
    A2: ['grammar', 'vocabulary', 'reading', 'conversation'],
    B1: ['grammar', 'vocabulary', 'reading', 'conversation'],
    B2: ['grammar', 'vocabulary', 'reading', 'conversation'],
    C1: ['grammar', 'vocabulary', 'reading', 'conversation'],
    C2: ['grammar', 'vocabulary', 'reading', 'conversation'],
  },
  Practice: {
    A1: ['exercises', 'conversation'],
    A2: ['exercises', 'conversation'],
    B1: ['exercises', 'conversation'],
    B2: ['exercises', 'conversation'],
    C1: ['exercises', 'conversation'],
    C2: ['exercises', 'conversation'],
  },
  Production: {
    A1: ['conversation'],
    A2: ['conversation'],
    B1: ['conversation', 'exercises'],
    B2: ['conversation', 'reading', 'exercises'],
    C1: ['conversation', 'reading', 'exercises'],
    C2: ['conversation', 'reading', 'exercises'],
  },
  WrapUp: {
    A1: ['conversation'],
    A2: ['conversation'],
    B1: ['conversation'],
    B2: ['conversation'],
    C1: ['conversation'],
    C2: ['conversation'],
  },
}

describe('normalizeLevel', () => {
  it('leaves standard levels unchanged', () => {
    expect(normalizeLevel('A1')).toBe('A1')
    expect(normalizeLevel('B2')).toBe('B2')
    expect(normalizeLevel('C1')).toBe('C1')
  })

  it('strips trailing decimal suffix', () => {
    expect(normalizeLevel('B2.1')).toBe('B2')
    expect(normalizeLevel('C1.2')).toBe('C1')
    expect(normalizeLevel('A2.5')).toBe('A2')
  })
})

describe('getAllowedContentTypes — loading fallback', () => {
  it('returns [] when rules is undefined (loading)', () => {
    expect(getAllowedContentTypes(undefined, 'WarmUp', 'A1')).toEqual([])
  })

  it('returns [] when rules is undefined regardless of section', () => {
    expect(getAllowedContentTypes(undefined, 'Practice', 'B2')).toEqual([])
  })

  it('does not include free-text for Presentation when rules are loading', () => {
    expect(getAllowedContentTypes(undefined, 'Presentation', 'B1')).not.toContain('free-text')
  })
})

describe('getAllowedContentTypes — WarmUp section', () => {
  it('returns only conversation for A1 level', () => {
    expect(getAllowedContentTypes(MOCK_RULES, 'WarmUp', 'A1')).toEqual(['conversation'])
  })

  it('returns only conversation for A2 level', () => {
    expect(getAllowedContentTypes(MOCK_RULES, 'WarmUp', 'A2')).toEqual(['conversation'])
  })

  it('returns only conversation for B1 level', () => {
    expect(getAllowedContentTypes(MOCK_RULES, 'WarmUp', 'B1')).toEqual(['conversation'])
  })

  it('returns only conversation for B2 level', () => {
    expect(getAllowedContentTypes(MOCK_RULES, 'WarmUp', 'B2')).toEqual(['conversation'])
  })

  it('returns only conversation for C1 level', () => {
    expect(getAllowedContentTypes(MOCK_RULES, 'WarmUp', 'C1')).toEqual(['conversation'])
  })

  it('returns only conversation for C2 level', () => {
    expect(getAllowedContentTypes(MOCK_RULES, 'WarmUp', 'C2')).toEqual(['conversation'])
  })

  it('excludes vocabulary, grammar, exercises, free-text from WarmUp', () => {
    const types = getAllowedContentTypes(MOCK_RULES, 'WarmUp', 'A1')
    expect(types).not.toContain('vocabulary')
    expect(types).not.toContain('grammar')
    expect(types).not.toContain('exercises')
    expect(types).not.toContain('free-text')
  })
})

describe('getAllowedContentTypes — Presentation section', () => {
  it('returns grammar, vocabulary, reading, conversation', () => {
    const types = getAllowedContentTypes(MOCK_RULES, 'Presentation', 'B1')
    expect(types).toContain('grammar')
    expect(types).toContain('vocabulary')
    expect(types).toContain('reading')
    expect(types).toContain('conversation')
  })

  it('excludes exercises from Presentation', () => {
    const types = getAllowedContentTypes(MOCK_RULES, 'Presentation', 'B1')
    expect(types).not.toContain('exercises')
  })

  it('excludes free-text from Presentation (not in section profile)', () => {
    const types = getAllowedContentTypes(MOCK_RULES, 'Presentation', 'B1')
    expect(types).not.toContain('free-text')
  })
})

describe('getAllowedContentTypes — Practice section', () => {
  it('returns only exercises and conversation', () => {
    expect(getAllowedContentTypes(MOCK_RULES, 'Practice', 'B1')).toEqual(['exercises', 'conversation'])
  })

  it('excludes vocabulary, grammar, reading, free-text from Practice', () => {
    const types = getAllowedContentTypes(MOCK_RULES, 'Practice', 'B1')
    expect(types).not.toContain('vocabulary')
    expect(types).not.toContain('grammar')
    expect(types).not.toContain('reading')
    expect(types).not.toContain('free-text')
  })
})

describe('getAllowedContentTypes — Production section', () => {
  it('returns only conversation for A1', () => {
    expect(getAllowedContentTypes(MOCK_RULES, 'Production', 'A1')).toEqual(['conversation'])
  })

  it('returns conversation and exercises for B1', () => {
    expect(getAllowedContentTypes(MOCK_RULES, 'Production', 'B1')).toEqual(['conversation', 'exercises'])
  })

  it('returns conversation, reading, and exercises for B2', () => {
    expect(getAllowedContentTypes(MOCK_RULES, 'Production', 'B2')).toEqual(['conversation', 'reading', 'exercises'])
  })

  it('returns conversation, reading, and exercises for C1', () => {
    expect(getAllowedContentTypes(MOCK_RULES, 'Production', 'C1')).toEqual(['conversation', 'reading', 'exercises'])
  })

  it('includes exercises in Production from B1 upward', () => {
    for (const level of ['B1', 'B2', 'C1', 'C2']) {
      expect(getAllowedContentTypes(MOCK_RULES, 'Production', level)).toContain('exercises')
    }
  })

  it('normalizes B2.1 to B2 before lookup', () => {
    expect(getAllowedContentTypes(MOCK_RULES, 'Production', 'B2.1')).toEqual(['conversation', 'reading', 'exercises'])
  })
})

describe('getAllowedContentTypes — WrapUp section', () => {
  it('returns only conversation for all levels', () => {
    for (const level of ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']) {
      expect(getAllowedContentTypes(MOCK_RULES, 'WrapUp', level)).toEqual(['conversation'])
    }
  })

  it('excludes free-text from WrapUp', () => {
    const types = getAllowedContentTypes(MOCK_RULES, 'WrapUp', 'B1')
    expect(types).not.toContain('free-text')
  })
})

describe('getAllowedContentTypes — unknown section', () => {
  it('returns [] for unknown section type when rules are loaded', () => {
    const types = getAllowedContentTypes(MOCK_RULES, 'Unknown' as never, 'B1')
    expect(types).toEqual([])
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
