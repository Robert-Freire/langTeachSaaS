/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect } from 'react'
import { isErrorCorrectionContent, coerceErrorCorrectionContent } from '../../../types/contentTypes'
import type {
  ErrorCorrectionContent,
  ErrorCorrectionItem,
  ErrorCorrectionMode,
  ErrorCorrectionErrorType,
} from '../../../types/contentTypes'
import type { EditorProps, PreviewProps, StudentProps } from '../contentRegistry'
import { ContentParseError } from '../ContentParseError'
import { ContentEditorParseError } from '../ContentEditorParseError'

const ERROR_TYPE_LABELS: Record<ErrorCorrectionErrorType, string> = {
  grammar: 'Grammar',
  vocabulary: 'Vocabulary',
  spelling: 'Spelling',
  verbForm: 'Verb Form',
  agreement: 'Agreement',
  wordOrder: 'Word Order',
}

const ERROR_TYPE_COLORS: Record<ErrorCorrectionErrorType, string> = {
  grammar: 'bg-red-100 text-red-800 border-red-300',
  vocabulary: 'bg-amber-100 text-amber-800 border-amber-300',
  spelling: 'bg-orange-100 text-orange-800 border-orange-300',
  verbForm: 'bg-purple-100 text-purple-800 border-purple-300',
  agreement: 'bg-pink-100 text-pink-800 border-pink-300',
  wordOrder: 'bg-sky-100 text-sky-800 border-sky-300',
}

/** Render a sentence with its error span highlighted. */
function SentenceWithHighlight({
  sentence,
  errorSpan,
  highlightClass = 'bg-red-100 border-b-2 border-red-500 rounded-sm px-0.5',
}: {
  sentence: string
  errorSpan: [number, number]
  highlightClass?: string
}) {
  const [start, end] = errorSpan
  const before = sentence.slice(0, start)
  const error = sentence.slice(start, end)
  const after = sentence.slice(end)
  return (
    <span>
      {before}
      <span className={highlightClass}>{error}</span>
      {after}
    </span>
  )
}

// ─── Editor ──────────────────────────────────────────────────────────────────

function Editor({ parsedContent, rawContent, onChange, onRegenerate, isIncomplete }: EditorProps) {
  if (!isErrorCorrectionContent(parsedContent)) {
    return (
      <ContentEditorParseError
        rawContent={rawContent}
        onChange={onChange}
        onRegenerate={onRegenerate}
        isIncomplete={isIncomplete}
      />
    )
  }

  const content = parsedContent as ErrorCorrectionContent
  const emit = (next: ErrorCorrectionContent) => onChange(JSON.stringify(next))

  const updateMode = (mode: ErrorCorrectionMode) => emit({ ...content, mode })

  const updateItem = (i: number, field: keyof ErrorCorrectionItem, value: string | number[]) => {
    const next = content.items.map((item, idx) =>
      idx === i ? { ...item, [field]: value } : item
    )
    emit({ ...content, items: next })
  }

  const addItem = () => {
    emit({
      ...content,
      items: [
        ...content.items,
        { sentence: '', errorSpan: [0, 0], correction: '', errorType: 'grammar' },
      ],
    })
  }

  const removeItem = (i: number) => {
    emit({ ...content, items: content.items.filter((_, idx) => idx !== i) })
  }

  return (
    <div data-testid="error-correction-editor">
      {/* Mode selector */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Mode:</span>
        {(['identify-only', 'identify-and-correct'] as ErrorCorrectionMode[]).map((m) => (
          <label key={m} className="flex items-center gap-1.5 cursor-pointer text-sm text-zinc-700">
            <input
              type="radio"
              name="ec-mode"
              value={m}
              checked={content.mode === m}
              onChange={() => updateMode(m)}
              className="accent-indigo-600"
            />
            {m === 'identify-only' ? 'Identify only' : 'Identify and correct'}
          </label>
        ))}
      </div>

      {/* Items table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-zinc-50">
              <th className="border border-zinc-200 px-3 py-2 text-left font-medium text-zinc-600 min-w-[200px]">Sentence</th>
              <th className="border border-zinc-200 px-3 py-2 text-left font-medium text-zinc-600 w-20">Span start</th>
              <th className="border border-zinc-200 px-3 py-2 text-left font-medium text-zinc-600 w-20">Span end</th>
              <th className="border border-zinc-200 px-3 py-2 text-left font-medium text-zinc-600 text-green-700 min-w-[140px]">Correction</th>
              <th className="border border-zinc-200 px-3 py-2 text-left font-medium text-zinc-600 w-32">Error type</th>
              <th className="hidden sm:table-cell border border-zinc-200 px-3 py-2 text-left font-medium text-zinc-400">Explanation</th>
              <th className="border border-zinc-200 px-3 py-2 w-10"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {content.items.map((item, i) => (
              <tr key={i} className="hover:bg-zinc-50">
                <td className="border border-zinc-200 p-1">
                  <input
                    value={item.sentence}
                    onChange={(e) => updateItem(i, 'sentence', e.target.value)}
                    className="w-full bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded"
                    placeholder="Sentence with one error"
                  />
                </td>
                <td className="border border-zinc-200 p-1">
                  <input
                    type="number"
                    min={0}
                    value={item.errorSpan[0]}
                    onChange={(e) => updateItem(i, 'errorSpan', [Number(e.target.value), item.errorSpan[1]])}
                    className="w-full bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded text-center"
                  />
                </td>
                <td className="border border-zinc-200 p-1">
                  <input
                    type="number"
                    min={0}
                    value={item.errorSpan[1]}
                    onChange={(e) => updateItem(i, 'errorSpan', [item.errorSpan[0], Number(e.target.value)])}
                    className="w-full bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded text-center"
                  />
                </td>
                <td className="border border-zinc-200 p-1">
                  <input
                    value={item.correction}
                    onChange={(e) => updateItem(i, 'correction', e.target.value)}
                    className="w-full bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded text-green-700 font-medium"
                    placeholder="Correct form"
                  />
                </td>
                <td className="border border-zinc-200 p-1">
                  <select
                    value={item.errorType}
                    onChange={(e) => updateItem(i, 'errorType', e.target.value)}
                    className="w-full bg-transparent px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded"
                  >
                    {Object.entries(ERROR_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </td>
                <td className="hidden sm:table-cell border border-zinc-200 p-1">
                  <span className="px-2 py-1 text-xs text-zinc-400 italic">{item.explanation ?? '—'}</span>
                </td>
                <td className="border border-zinc-200 p-1 text-center">
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="text-zinc-400 hover:text-red-500 transition-colors px-1"
                    aria-label="Remove item"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={addItem}
        className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
      >
        + Add item
      </button>
    </div>
  )
}

// ─── Preview ─────────────────────────────────────────────────────────────────

function Preview({ parsedContent }: PreviewProps) {
  if (!isErrorCorrectionContent(parsedContent)) {
    return <ContentParseError context="teacher" />
  }

  const { mode, items } = parsedContent as ErrorCorrectionContent

  return (
    <div className="space-y-4 text-sm" data-testid="error-correction-preview">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Mode: {mode === 'identify-only' ? 'Identify only' : 'Identify and correct'}
      </p>
      <ol className="space-y-4 list-decimal list-inside">
        {items.map((item, i) => (
          <li key={i} className="text-zinc-700 space-y-1">
            <p>
              <SentenceWithHighlight sentence={item.sentence} errorSpan={item.errorSpan} />
              <span className={`ml-2 inline-block text-xs font-medium px-1.5 py-0.5 rounded border ${ERROR_TYPE_COLORS[item.errorType]}`}>
                {ERROR_TYPE_LABELS[item.errorType]}
              </span>
            </p>
            <p className="text-green-700 font-medium text-xs ml-4">
              Correction: <span className="font-normal">{item.correction}</span>
            </p>
            {item.explanation && (
              <p className="text-zinc-500 text-xs ml-4 italic">{item.explanation}</p>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}

// ─── Student ─────────────────────────────────────────────────────────────────

/**
 * Student view for error correction.
 * "identify-only": student clicks words to select the error span, then checks.
 * "identify-and-correct": student clicks to select span + types the correction.
 */
function Student({ parsedContent, rawContent }: StudentProps) {
  // selectedSpan[i] = [start, end] of the student's selected span for item i, or null
  const [selectedSpans, setSelectedSpans] = useState<([number, number] | null)[]>([])
  const [corrections, setCorrections] = useState<string[]>([])
  const [checked, setChecked] = useState(false)

  const validContent = isErrorCorrectionContent(parsedContent) ? (parsedContent as ErrorCorrectionContent) : null

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setSelectedSpans([])
    setCorrections([])
    setChecked(false)
  }, [rawContent])
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!validContent) {
    return <ContentParseError context="student" />
  }

  const { mode, items } = validContent

  const spans = selectedSpans.length === items.length
    ? selectedSpans
    : Array<[number, number] | null>(items.length).fill(null)

  const corrs = corrections.length === items.length
    ? corrections
    : Array(items.length).fill('')

  /**
   * Build clickable word tokens for a sentence.
   * Clicking a token selects the span covering that word.
   */
  const tokenize = (sentence: string): { text: string; start: number; end: number }[] => {
    const tokens: { text: string; start: number; end: number }[] = []
    // Split on whitespace boundaries, preserving spaces as tokens
    const regex = /\S+|\s+/g
    let match: RegExpExecArray | null
    while ((match = regex.exec(sentence)) !== null) {
      tokens.push({ text: match[0], start: match.index, end: match.index + match[0].length })
    }
    return tokens
  }

  const handleSpanClick = (itemIdx: number, start: number, end: number) => {
    if (checked) return
    const next = [...spans] as ([number, number] | null)[]
    const current = next[itemIdx]
    // Toggle off if same span clicked again
    if (current && current[0] === start && current[1] === end) {
      next[itemIdx] = null
    } else {
      next[itemIdx] = [start, end]
    }
    setSelectedSpans(next)
  }

  const handleCheck = () => {
    if (spans !== selectedSpans) setSelectedSpans(spans)
    if (corrs !== corrections) setCorrections(corrs)
    setChecked(true)
  }

  const handleReset = () => {
    setSelectedSpans(Array(items.length).fill(null))
    setCorrections(Array(items.length).fill(''))
    setChecked(false)
  }

  const spanCorrect = (i: number): boolean => {
    const sel = spans[i]
    if (!sel) return false
    const [cs, ce] = sel
    const [es, ee] = items[i].errorSpan
    return cs === es && ce === ee
  }

  const correctionCorrect = (i: number): boolean => {
    if (mode === 'identify-only') return true
    const norm = (s: string) => s.trim().toLowerCase()
    return norm(corrs[i]) === norm(items[i].correction)
  }

  const itemCorrect = (i: number) => spanCorrect(i) && correctionCorrect(i)

  const totalCorrect = items.filter((_, i) => itemCorrect(i)).length

  return (
    <div className="space-y-6 text-sm" data-testid="error-correction-student">
      <p className="text-xs text-zinc-500">
        {mode === 'identify-only'
          ? 'Click on the word or phrase that contains the error in each sentence.'
          : 'Click on the word or phrase that contains the error, then type the correction.'}
      </p>

      <ol className="space-y-5 list-decimal list-inside">
        {items.map((item, i) => {
          const tokens = tokenize(item.sentence)
          const sel = spans[i]
          const isChecked = checked
          const correct = itemCorrect(i)

          return (
            <li key={i} className="text-zinc-700 space-y-2">
              {/* Sentence with clickable tokens */}
              <div className="flex flex-wrap items-baseline gap-0.5 leading-7">
                {tokens.map((tok, ti) => {
                  if (/^\s+$/.test(tok.text)) {
                    return <span key={ti}>{tok.text}</span>
                  }
                  const isSelected = sel && tok.start >= sel[0] && tok.end <= sel[1]
                  const isAnswer = item.errorSpan && tok.start >= item.errorSpan[0] && tok.end <= item.errorSpan[1]

                  let cls = 'cursor-pointer rounded px-0.5 transition-colors select-none'
                  if (isChecked) {
                    if (isAnswer) {
                      cls += correct
                        ? ' bg-green-100 border-b-2 border-green-500'
                        : ' bg-red-100 border-b-2 border-red-500'
                    } else if (isSelected && !isAnswer) {
                      cls += ' bg-red-50 line-through text-red-400'
                    }
                  } else if (isSelected) {
                    cls += ' bg-indigo-100 border-b-2 border-indigo-500'
                  } else {
                    cls += ' hover:bg-zinc-100'
                  }

                  return (
                    <span
                      key={ti}
                      className={cls}
                      onClick={() => handleSpanClick(i, tok.start, tok.end)}
                      data-testid={`token-${i}-${ti}`}
                    >
                      {tok.text}
                    </span>
                  )
                })}
              </div>

              {/* Correction input (identify-and-correct mode only) */}
              {mode === 'identify-and-correct' && (
                <div className="ml-4 flex items-center gap-2">
                  <span className="text-xs text-zinc-400">Correction:</span>
                  <input
                    value={corrs[i]}
                    onChange={(e) => {
                      const next = [...corrs]
                      next[i] = e.target.value
                      setCorrections(next)
                    }}
                    disabled={isChecked}
                    placeholder="Type the corrected form..."
                    className={`border rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300 w-48 ${
                      isChecked
                        ? correctionCorrect(i)
                          ? 'border-green-400 bg-green-50'
                          : 'border-red-400 bg-red-50'
                        : 'border-zinc-200'
                    }`}
                    data-testid={`correction-input-${i}`}
                  />
                </div>
              )}

              {/* Feedback after check */}
              {isChecked && (
                <div className="ml-4 space-y-1">
                  <p
                    className={`text-xs font-medium ${correct ? 'text-green-600' : 'text-red-600'}`}
                    data-testid={`item-result-${i}`}
                  >
                    {correct
                      ? '✓ Correct'
                      : `✗ The error was: "${item.sentence.slice(item.errorSpan[0], item.errorSpan[1])}" → "${item.correction}"`}
                  </p>
                  {!correct && item.explanation && (
                    <p className="text-xs text-zinc-500" data-testid={`item-explanation-${i}`}>
                      {item.explanation}
                    </p>
                  )}
                  <span className={`inline-block text-xs font-medium px-1.5 py-0.5 rounded border ${ERROR_TYPE_COLORS[item.errorType]}`}>
                    {ERROR_TYPE_LABELS[item.errorType]}
                  </span>
                </div>
              )}
            </li>
          )
        })}
      </ol>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        {!checked ? (
          <button
            type="button"
            onClick={handleCheck}
            disabled={items.length === 0}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
            data-testid="check-answers-btn"
          >
            Check Answers
          </button>
        ) : (
          <>
            <span className="text-sm font-semibold text-zinc-800" data-testid="score-summary">
              You got {totalCorrect} / {items.length} correct
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 transition-colors"
              data-testid="try-again-btn"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Export ──────────────────────────────────────────────────────────────────

export const ErrorCorrectionRenderer = { Editor, Preview, Student, coerce: coerceErrorCorrectionContent }
