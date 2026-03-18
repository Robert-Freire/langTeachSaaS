import { describe, it, expect } from 'vitest'
import { buildPartialContent } from './usePartialJsonParse'

// Helper to build partial JSON strings
function vocabJson(items: object[]): string {
  return `{"items": [${items.map((i) => JSON.stringify(i)).join(', ')}]}`
}

const item1 = { word: 'bonjour', definition: 'hello' }
const item2 = { word: 'merci', definition: 'thank you' }

describe('buildPartialContent – vocabulary', () => {
  it('returns null for empty string', () => {
    expect(buildPartialContent('', 'vocabulary')).toBeNull()
  })

  it('returns null when partial JSON has no closed item yet', () => {
    expect(buildPartialContent('{"items": [{"word": "bon', 'vocabulary')).toBeNull()
  })

  it('returns first item when one complete item is present', () => {
    const json = `{"items": [${JSON.stringify(item1)}`
    expect(buildPartialContent(json, 'vocabulary')).toEqual({ items: [item1] })
  })

  it('returns two items after both are complete', () => {
    expect(buildPartialContent(vocabJson([item1, item2]), 'vocabulary')).toEqual({ items: [item1, item2] })
  })

  it('strips markdown fences', () => {
    const json = '```json\n' + vocabJson([item1]) + '\n```'
    expect(buildPartialContent(json, 'vocabulary')).toEqual({ items: [item1] })
  })
})

describe('buildPartialContent – grammar', () => {
  it('returns null when no title and no examples', () => {
    expect(buildPartialContent('{"explanation": "some text"', 'grammar')).toBeNull()
  })

  it('returns partial object with title but empty arrays when no examples yet', () => {
    const json = '{"title": "Present tense", "explanation": "Used for habits"'
    const result = buildPartialContent(json, 'grammar') as Record<string, unknown>
    expect(result).not.toBeNull()
    expect(result.title).toBe('Present tense')
    expect(result.explanation).toBe('Used for habits')
    expect(result.examples).toEqual([])
    expect(result.commonMistakes).toEqual([])
  })

  it('includes example after first complete example object', () => {
    const example = { sentence: 'I run daily.', note: 'habitual' }
    const json = `{"title": "Present tense", "explanation": "Habits", "examples": [${JSON.stringify(example)}]`
    const result = buildPartialContent(json, 'grammar') as Record<string, unknown>
    expect((result.examples as unknown[]).length).toBe(1)
  })
})

describe('buildPartialContent – exercises', () => {
  it('returns null when all arrays empty', () => {
    expect(buildPartialContent('{"fillInBlank": []', 'exercises')).toBeNull()
  })

  it('returns all three arrays when one fillInBlank item is present', () => {
    const item = { sentence: 'I ___ a student.', answer: 'am' }
    const json = `{"fillInBlank": [${JSON.stringify(item)}], "multipleChoice": [], "matching": []}`
    const result = buildPartialContent(json, 'exercises') as Record<string, unknown>
    expect(result).not.toBeNull()
    expect((result.fillInBlank as unknown[]).length).toBe(1)
    expect(result.multipleChoice).toEqual([])
    expect(result.matching).toEqual([])
  })
})

describe('buildPartialContent – conversation', () => {
  it('returns null when no scenarios', () => {
    expect(buildPartialContent('{"scenarios": [', 'conversation')).toBeNull()
  })

  it('returns scenarios after first complete scenario with empty arrays', () => {
    const scenario = { setup: 'At a cafe', roleA: 'Customer', roleB: 'Waiter', roleAPhrases: [], roleBPhrases: [] }
    const json = `{"scenarios": [${JSON.stringify(scenario)}]}`
    const result = buildPartialContent(json, 'conversation') as Record<string, unknown>
    expect((result.scenarios as unknown[]).length).toBe(1)
  })

  it('correctly handles scenarios with nested non-empty arrays (roleAPhrases/roleBPhrases)', () => {
    const scenario = {
      setup: 'At a cafe',
      roleA: 'Customer',
      roleB: 'Waiter',
      roleAPhrases: ['Excuse me', 'I would like'],
      roleBPhrases: ['Welcome', 'Right away'],
    }
    const json = `{"scenarios": [${JSON.stringify(scenario)}]}`
    const result = buildPartialContent(json, 'conversation') as Record<string, unknown>
    expect(result).not.toBeNull()
    const s = (result.scenarios as unknown[])[0] as Record<string, unknown>
    expect((s.roleAPhrases as string[]).length).toBe(2)
    expect((s.roleBPhrases as string[]).length).toBe(2)
  })
})

describe('buildPartialContent – reading', () => {
  it('returns null when no comprehension questions', () => {
    expect(buildPartialContent('{"passage": "The fox", "comprehensionQuestions": [', 'reading')).toBeNull()
  })

  it('includes comprehension question with empty passage and vocabularyHighlights', () => {
    const q = { question: 'What is the main idea?', answer: 'The fox', type: 'open' }
    const json = `{"passage": "The fox runs.", "comprehensionQuestions": [${JSON.stringify(q)}]}`
    const result = buildPartialContent(json, 'reading') as Record<string, unknown>
    expect(result).not.toBeNull()
    expect(result.passage).toBe('')
    expect((result.comprehensionQuestions as unknown[]).length).toBe(1)
    expect(result.vocabularyHighlights).toEqual([])
  })
})

describe('buildPartialContent – homework', () => {
  it('returns null when no tasks', () => {
    expect(buildPartialContent('{"tasks": [', 'homework')).toBeNull()
  })

  it('returns tasks after first complete task', () => {
    const task = { type: 'writing', instructions: 'Write a paragraph.', examples: [] }
    const json = `{"tasks": [${JSON.stringify(task)}]}`
    const result = buildPartialContent(json, 'homework') as Record<string, unknown>
    expect((result.tasks as unknown[]).length).toBe(1)
  })
})
