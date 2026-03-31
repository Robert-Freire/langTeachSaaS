/* eslint-disable react-refresh/only-export-components */
import { useState, useCallback } from 'react'
import { isNoticingTaskContent, coerceNoticingTaskContent } from '../../../types/contentTypes'
import type { NoticingTaskTarget } from '../../../types/contentTypes'
import type { EditorProps, PreviewProps, StudentProps } from '../contentRegistry'
import { ContentParseError } from '../ContentParseError'
import { ContentEditorParseError } from '../ContentEditorParseError'

/** Render text with highlighted target spans. */
function TextWithTargets({
  text,
  targets,
  highlightClass = 'bg-yellow-200 border-b-2 border-yellow-500 rounded-sm px-0.5',
}: {
  text: string
  targets: NoticingTaskTarget[]
  highlightClass?: string
}) {
  // Sort targets by position to render in order
  const sorted = [...targets].sort((a, b) => a.position[0] - b.position[0])

  const parts: React.ReactNode[] = []
  let lastEnd = 0

  for (let i = 0; i < sorted.length; i++) {
    const target = sorted[i]
    const [start, end] = target.position

    // Skip invalid positions
    if (start < lastEnd || start >= text.length || end > text.length || start >= end) continue

    if (start > lastEnd) {
      parts.push(<span key={`text-${i}`}>{text.slice(lastEnd, start)}</span>)
    }
    parts.push(
      <span key={`target-${i}`} className={highlightClass} title={target.grammar}>
        {text.slice(start, end)}
      </span>,
    )
    lastEnd = end
  }

  if (lastEnd < text.length) {
    parts.push(<span key="text-end">{text.slice(lastEnd)}</span>)
  }

  return <span>{parts}</span>
}

// ─── Editor ──────────────────────────────────────────────────────────────────

function Editor({ parsedContent, rawContent, onChange, onRegenerate, isIncomplete }: EditorProps) {
  if (!isNoticingTaskContent(parsedContent)) {
    return (
      <ContentEditorParseError
        rawContent={rawContent}
        onChange={onChange}
        onRegenerate={onRegenerate}
        isIncomplete={isIncomplete}
      />
    )
  }

  const content = parsedContent

  const updateField = (field: string, value: unknown) => {
    const updated = { ...content, [field]: value }
    onChange(JSON.stringify(updated, null, 2))
  }

  const updateTarget = (index: number, field: keyof NoticingTaskTarget, value: unknown) => {
    const newTargets = [...content.targets]
    newTargets[index] = { ...newTargets[index], [field]: value }
    updateField('targets', newTargets)
  }

  const addTarget = () => {
    updateField('targets', [
      ...content.targets,
      { form: '', position: [0, 0] as [number, number], grammar: '' },
    ])
  }

  const removeTarget = (index: number) => {
    updateField(
      'targets',
      content.targets.filter((_, i) => i !== index),
    )
  }

  const updateQuestion = (index: number, value: string) => {
    const newQuestions = [...content.discoveryQuestions]
    newQuestions[index] = value
    updateField('discoveryQuestions', newQuestions)
  }

  const addQuestion = () => {
    updateField('discoveryQuestions', [...content.discoveryQuestions, ''])
  }

  const removeQuestion = (index: number) => {
    updateField(
      'discoveryQuestions',
      content.discoveryQuestions.filter((_, i) => i !== index),
    )
  }

  return (
    <div className="space-y-4">
      {/* Text */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Text</label>
        <textarea
          className="w-full border border-gray-300 rounded-md p-3 text-sm min-h-[120px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={content.text}
          onChange={(e) => updateField('text', e.target.value)}
        />
      </div>

      {/* Instruction */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Instruction</label>
        <input
          type="text"
          className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={content.instruction}
          onChange={(e) => updateField('instruction', e.target.value)}
        />
      </div>

      {/* Targets */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Targets</label>
          <button
            className="text-sm text-blue-600 hover:text-blue-800"
            onClick={addTarget}
          >
            + Add Target
          </button>
        </div>
        {content.targets.map((target, i) => (
          <div key={i} className="flex gap-2 mb-2 items-start">
            <input
              type="text"
              className="flex-1 border border-gray-300 rounded-md p-2 text-sm"
              placeholder="Form (word/phrase)"
              value={target.form}
              onChange={(e) => updateTarget(i, 'form', e.target.value)}
            />
            <input
              type="number"
              className="w-20 border border-gray-300 rounded-md p-2 text-sm"
              placeholder="Start"
              value={target.position[0]}
              onChange={(e) =>
                updateTarget(i, 'position', [parseInt(e.target.value) || 0, target.position[1]])
              }
            />
            <input
              type="number"
              className="w-20 border border-gray-300 rounded-md p-2 text-sm"
              placeholder="End"
              value={target.position[1]}
              onChange={(e) =>
                updateTarget(i, 'position', [target.position[0], parseInt(e.target.value) || 0])
              }
            />
            <input
              type="text"
              className="w-32 border border-gray-300 rounded-md p-2 text-sm"
              placeholder="Grammar ref"
              value={target.grammar}
              onChange={(e) => updateTarget(i, 'grammar', e.target.value)}
            />
            <button
              className="text-red-500 hover:text-red-700 px-2 py-2"
              onClick={() => removeTarget(i)}
              title="Remove target"
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      {/* Discovery Questions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Discovery Questions</label>
          <button
            className="text-sm text-blue-600 hover:text-blue-800"
            onClick={addQuestion}
          >
            + Add Question
          </button>
        </div>
        {content.discoveryQuestions.map((q, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input
              type="text"
              className="flex-1 border border-gray-300 rounded-md p-2 text-sm"
              value={q}
              onChange={(e) => updateQuestion(i, e.target.value)}
              placeholder={`Question ${i + 1}`}
            />
            <button
              className="text-red-500 hover:text-red-700 px-2 py-2"
              onClick={() => removeQuestion(i)}
              title="Remove question"
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      {/* Teacher Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Teacher Notes</label>
        <textarea
          className="w-full border border-gray-300 rounded-md p-3 text-sm min-h-[80px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={content.teacherNotes ?? ''}
          onChange={(e) => updateField('teacherNotes', e.target.value || undefined)}
        />
      </div>
    </div>
  )
}

// ─── Preview ─────────────────────────────────────────────────────────────────

function Preview({ parsedContent }: PreviewProps) {
  if (!isNoticingTaskContent(parsedContent)) {
    return <ContentParseError context="teacher" />
  }

  const content = parsedContent

  return (
    <div className="space-y-4">
      {/* Instruction */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm font-medium text-blue-800">{content.instruction}</p>
      </div>

      {/* Text with highlighted targets */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-base leading-relaxed whitespace-pre-wrap">
          <TextWithTargets text={content.text} targets={content.targets} />
        </p>
      </div>

      {/* Target legend */}
      <div className="text-xs text-gray-500">
        <span className="font-medium">Targets:</span>{' '}
        {content.targets.map((t, i) => (
          <span key={i}>
            {i > 0 && ', '}
            <span className="bg-yellow-100 px-1 rounded">{t.form}</span>
            <span className="text-gray-400"> ({t.grammar})</span>
          </span>
        ))}
      </div>

      {/* Discovery Questions */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Discovery Questions</h4>
        <ol className="list-decimal list-inside space-y-1">
          {content.discoveryQuestions.map((q, i) => (
            <li key={i} className="text-sm text-gray-600">
              {q}
            </li>
          ))}
        </ol>
      </div>

      {/* Teacher Notes */}
      {content.teacherNotes && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <h4 className="text-sm font-medium text-amber-800 mb-1">Teacher Notes</h4>
          <p className="text-sm text-amber-700 whitespace-pre-wrap">{content.teacherNotes}</p>
        </div>
      )}
    </div>
  )
}

// ─── Student ─────────────────────────────────────────────────────────────────

function Student({ parsedContent }: StudentProps) {
  const [selectedWords, setSelectedWords] = useState<Set<number>>(new Set())
  const [showFeedback, setShowFeedback] = useState(false)

  const toggleWord = useCallback((tokenIndex: number) => {
    setSelectedWords((prev) => {
      const next = new Set(prev)
      if (next.has(tokenIndex)) {
        next.delete(tokenIndex)
      } else {
        next.add(tokenIndex)
      }
      return next
    })
    setShowFeedback(false)
  }, [])

  const checkAnswers = useCallback(() => {
    setShowFeedback(true)
  }, [])

  const resetSelections = useCallback(() => {
    setSelectedWords(new Set())
    setShowFeedback(false)
  }, [])

  if (!isNoticingTaskContent(parsedContent)) {
    return <ContentParseError context="student" />
  }

  const content = parsedContent

  // Split text into clickable word tokens
  const tokens = splitIntoTokens(content.text)

  // Determine which tokens are targets
  const targetTokenIndices = new Set<number>()
  for (const target of content.targets) {
    const [start, end] = target.position
    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i]
      // Token overlaps with target span
      if (tok.end > start && tok.start < end && tok.type === 'word') {
        targetTokenIndices.add(i)
      }
    }
  }

  const correctSelected = new Set([...selectedWords].filter((i) => targetTokenIndices.has(i)))
  const incorrectSelected = new Set([...selectedWords].filter((i) => !targetTokenIndices.has(i)))
  const missedTargets = new Set([...targetTokenIndices].filter((i) => !selectedWords.has(i)))
  const allFound = showFeedback && missedTargets.size === 0 && incorrectSelected.size === 0

  return (
    <div className="space-y-4">
      {/* Instruction */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm font-medium text-blue-800">{content.instruction}</p>
      </div>

      {/* Interactive text */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-base leading-relaxed">
          {tokens.map((tok, i) => {
            if (tok.type === 'space') {
              return <span key={i}>{tok.text}</span>
            }

            const isSelected = selectedWords.has(i)
            const isTarget = targetTokenIndices.has(i)

            let className = 'cursor-pointer rounded px-0.5 transition-colors '
            if (showFeedback) {
              if (isSelected && isTarget) {
                className += 'bg-green-200 border-b-2 border-green-500'
              } else if (isSelected && !isTarget) {
                className += 'bg-red-200 border-b-2 border-red-500'
              } else if (!isSelected && isTarget) {
                className += 'bg-yellow-200 border-b-2 border-yellow-500'
              } else {
                className += 'hover:bg-gray-100'
              }
            } else {
              if (isSelected) {
                className += 'bg-blue-200 border-b-2 border-blue-500'
              } else {
                className += 'hover:bg-gray-100'
              }
            }

            return (
              <span
                key={i}
                className={className}
                onClick={() => toggleWord(i)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    toggleWord(i)
                  }
                }}
              >
                {tok.text}
              </span>
            )
          })}
        </p>
      </div>

      {/* Feedback */}
      {showFeedback && (
        <div
          className={`rounded-lg p-3 text-sm ${
            allFound
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-amber-50 border border-amber-200 text-amber-800'
          }`}
        >
          {allFound
            ? `You found all ${targetTokenIndices.size} targets!`
            : `You found ${correctSelected.size} of ${targetTokenIndices.size} targets. ${
                missedTargets.size > 0
                  ? `${missedTargets.size} missed (highlighted in yellow).`
                  : ''
              } ${incorrectSelected.size > 0 ? `${incorrectSelected.size} incorrect (highlighted in red).` : ''}`}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
          onClick={checkAnswers}
        >
          Check
        </button>
        {showFeedback && (
          <button
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 transition-colors"
            onClick={resetSelections}
          >
            Try Again
          </button>
        )}
      </div>

      {/* Discovery Questions */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Discovery Questions</h4>
        <ol className="list-decimal list-inside space-y-1">
          {content.discoveryQuestions.map((q, i) => (
            <li key={i} className="text-sm text-gray-600">
              {q}
            </li>
          ))}
        </ol>
      </div>

      {/* Teacher notes hidden in student view */}
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface Token {
  text: string
  start: number
  end: number
  type: 'word' | 'space'
}

function splitIntoTokens(text: string): Token[] {
  const tokens: Token[] = []
  const regex = /(\S+|\s+)/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    tokens.push({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
      type: match[0].trim().length > 0 ? 'word' : 'space',
    })
  }
  return tokens
}

// ─── Export ──────────────────────────────────────────────────────────────────

export const NoticingTaskRenderer = { Editor, Preview, Student, coerce: coerceNoticingTaskContent }
