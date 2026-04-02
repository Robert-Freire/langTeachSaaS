import { useMemo } from 'react'
import type { ContentBlockType } from '../types/contentTypes'

function extractItemsFromArray(json: string, key: string): unknown[] {
  const keyIndex = json.indexOf(`"${key}"`)
  if (keyIndex === -1) return []

  const bracketIndex = json.indexOf('[', keyIndex)
  if (bracketIndex === -1) return []

  const results: unknown[] = []
  let depth = 0
  let inString = false
  let escaped = false
  let itemStart = -1

  for (let i = bracketIndex; i < json.length; i++) {
    const ch = json[i]

    if (escaped) {
      escaped = false
      continue
    }

    if (ch === '\\' && inString) {
      escaped = true
      continue
    }

    if (ch === '"') {
      inString = !inString
      continue
    }

    if (inString) continue

    if (ch === '{') {
      if (depth === 1) itemStart = i
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 1 && itemStart !== -1) {
        const fragment = json.slice(itemStart, i + 1)
        try {
          results.push(JSON.parse(fragment))
        } catch {
          // incomplete item — skip
        }
        itemStart = -1
      }
    } else if (ch === '[') {
      depth++
    } else if (ch === ']') {
      depth--
      if (depth === 0) break
    }
  }

  return results
}

function extractScalarString(json: string, key: string): string | null {
  const keyIndex = json.indexOf(`"${key}"`)
  if (keyIndex === -1) return null

  const colonIndex = json.indexOf(':', keyIndex)
  if (colonIndex === -1) return null

  const quoteStart = json.indexOf('"', colonIndex + 1)
  if (quoteStart === -1) return null

  let escaped = false

  for (let i = quoteStart + 1; i < json.length; i++) {
    const ch = json[i]

    if (escaped) {
      escaped = false
      continue
    }

    if (ch === '\\') {
      escaped = true
      continue
    }

    if (ch === '"') {
      try {
        return JSON.parse(json.slice(quoteStart, i + 1)) as string
      } catch {
        return null
      }
    }
  }

  return null // string not yet closed
}

export function buildPartialContent(rawOutput: string, blockType: ContentBlockType): unknown | null {
  const json = rawOutput
    .replace(/^```(?:json)?\s*/, '')
    .replace(/\s*```\s*$/, '')

  switch (blockType) {
    case 'vocabulary': {
      const items = extractItemsFromArray(json, 'items')
      return items.length > 0 ? { items } : null
    }
    case 'grammar': {
      const title = extractScalarString(json, 'title')
      const explanation = extractScalarString(json, 'explanation')
      const examples = extractItemsFromArray(json, 'examples')
      const commonMistakes = extractItemsFromArray(json, 'commonMistakes')
      if (!title && examples.length === 0) return null
      return { title: title ?? '', explanation: explanation ?? '', examples, commonMistakes }
    }
    case 'exercises': {
      const fillInBlank = extractItemsFromArray(json, 'fillInBlank')
      const multipleChoice = extractItemsFromArray(json, 'multipleChoice')
      const matching = extractItemsFromArray(json, 'matching')
      const trueFalse = extractItemsFromArray(json, 'trueFalse')
      if (fillInBlank.length === 0 && multipleChoice.length === 0 && matching.length === 0 && trueFalse.length === 0) return null
      return { fillInBlank, multipleChoice, matching, trueFalse }
    }
    case 'conversation': {
      const scenarios = extractItemsFromArray(json, 'scenarios')
      return scenarios.length > 0 ? { scenarios } : null
    }
    case 'reading': {
      const passage = extractScalarString(json, 'passage')
      const comprehensionQuestions = extractItemsFromArray(json, 'comprehensionQuestions')
      const vocabularyHighlights = extractItemsFromArray(json, 'vocabularyHighlights')
      if (!passage && comprehensionQuestions.length === 0) return null
      return {
        passage: passage ?? '',
        comprehensionQuestions,
        vocabularyHighlights,
      }
    }
    case 'homework': {
      const tasks = extractItemsFromArray(json, 'tasks')
      return tasks.length > 0 ? { tasks } : null
    }
    case 'guided-writing': {
      const situation = extractScalarString(json, 'situation')
      const modelAnswer = extractScalarString(json, 'modelAnswer')
      const requiredStructures = extractItemsFromArray(json, 'requiredStructures')
      const evaluationCriteria = extractItemsFromArray(json, 'evaluationCriteria')
      if (!situation && requiredStructures.length === 0) return null
      // wordCount is a nested object — omit during streaming so coerce fills safe defaults
      return {
        situation: situation ?? '',
        requiredStructures,
        evaluationCriteria,
        modelAnswer: modelAnswer ?? '',
      }
    }
    default:
      return null
  }
}

export function usePartialJsonParse(rawOutput: string, blockType: ContentBlockType): unknown | null {
  return useMemo(() => buildPartialContent(rawOutput, blockType), [rawOutput, blockType])
}
