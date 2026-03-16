import { useState, useRef } from 'react'
import { isExercisesContent } from '../../../types/contentTypes'
import type {
  ExercisesContent,
  ExercisesFillInBlank,
  ExercisesMatching,
} from '../../../types/contentTypes'
import type { EditorProps, PreviewProps, StudentProps } from '../contentRegistry'

const inputClass = 'w-full bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded'
const sectionHeadingClass = 'text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2 mt-4 first:mt-0'

// ─── Editor ──────────────────────────────────────────────────────────────────

let nextId = 0
function uid() { return nextId++ }

function Editor({ parsedContent, rawContent, onChange }: EditorProps) {
  const fibIdsRef = useRef<number[]>([])
  const mcIdsRef = useRef<number[]>([])
  const matchIdsRef = useRef<number[]>([])

  if (!isExercisesContent(parsedContent)) {
    return (
      <textarea
        value={rawContent}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        className="w-full resize-none text-sm border rounded p-2"
      />
    )
  }

  const content = parsedContent as ExercisesContent
  const { fillInBlank, multipleChoice, matching } = content

  // Sync stable IDs
  while (fibIdsRef.current.length < fillInBlank.length) fibIdsRef.current.push(uid())
  while (mcIdsRef.current.length < multipleChoice.length) mcIdsRef.current.push(uid())
  while (matchIdsRef.current.length < matching.length) matchIdsRef.current.push(uid())

  const emit = (next: ExercisesContent) => onChange(JSON.stringify(next))

  // Fill-in-blank handlers
  const updateFib = (i: number, field: keyof ExercisesFillInBlank, value: string) => {
    const next = fillInBlank.map((item, idx) => idx === i ? { ...item, [field]: value } : item)
    emit({ ...content, fillInBlank: next })
  }
  const addFib = () => {
    fibIdsRef.current.push(uid())
    emit({ ...content, fillInBlank: [...fillInBlank, { sentence: '', answer: '', hint: '' }] })
  }
  const removeFib = (i: number) => {
    fibIdsRef.current.splice(i, 1)
    emit({ ...content, fillInBlank: fillInBlank.filter((_, idx) => idx !== i) })
  }

  // Multiple choice handlers
  const updateMcQuestion = (i: number, value: string) => {
    const next = multipleChoice.map((item, idx) => idx === i ? { ...item, question: value } : item)
    emit({ ...content, multipleChoice: next })
  }
  const updateMcOption = (qi: number, oi: number, value: string) => {
    const next = multipleChoice.map((item, idx) => {
      if (idx !== qi) return item
      const options = item.options.map((opt, j) => j === oi ? value : opt)
      const answer = item.answer === item.options[oi] ? value : item.answer
      return { ...item, options, answer }
    })
    emit({ ...content, multipleChoice: next })
  }
  const setMcAnswer = (qi: number, answer: string) => {
    const next = multipleChoice.map((item, idx) => idx === qi ? { ...item, answer } : item)
    emit({ ...content, multipleChoice: next })
  }
  const addMcOption = (qi: number) => {
    const next = multipleChoice.map((item, idx) =>
      idx === qi ? { ...item, options: [...item.options, ''] } : item
    )
    emit({ ...content, multipleChoice: next })
  }
  const removeMcOption = (qi: number, oi: number) => {
    const next = multipleChoice.map((item, idx) => {
      if (idx !== qi) return item
      const options = item.options.filter((_, j) => j !== oi)
      const answer = item.answer === item.options[oi] ? '' : item.answer
      return { ...item, options, answer }
    })
    emit({ ...content, multipleChoice: next })
  }
  const addMc = () => {
    mcIdsRef.current.push(uid())
    emit({ ...content, multipleChoice: [...multipleChoice, { question: '', options: ['', ''], answer: '' }] })
  }
  const removeMc = (i: number) => {
    mcIdsRef.current.splice(i, 1)
    emit({ ...content, multipleChoice: multipleChoice.filter((_, idx) => idx !== i) })
  }

  // Matching handlers
  const updateMatch = (i: number, field: keyof ExercisesMatching, value: string) => {
    const next = matching.map((item, idx) => idx === i ? { ...item, [field]: value } : item)
    emit({ ...content, matching: next })
  }
  const addMatch = () => {
    matchIdsRef.current.push(uid())
    emit({ ...content, matching: [...matching, { left: '', right: '' }] })
  }
  const removeMatch = (i: number) => {
    matchIdsRef.current.splice(i, 1)
    emit({ ...content, matching: matching.filter((_, idx) => idx !== i) })
  }

  return (
    <div data-testid="exercises-editor">
      {/* Fill-in-blank */}
      <p className={sectionHeadingClass}>Fill in the Blank</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-zinc-50">
              <th className="border border-zinc-200 px-3 py-2 text-left font-medium text-zinc-600">Sentence (use ___ for blank)</th>
              <th className="border border-zinc-200 px-3 py-2 text-left font-medium text-zinc-600 text-green-700">Answer</th>
              <th className="border border-zinc-200 px-3 py-2 text-left font-medium text-zinc-600">Hint</th>
              <th className="border border-zinc-200 px-3 py-2 w-10"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {fillInBlank.map((item, i) => (
              <tr key={fibIdsRef.current[i]} className="hover:bg-zinc-50">
                <td className="border border-zinc-200 p-1">
                  <input value={item.sentence} onChange={(e) => updateFib(i, 'sentence', e.target.value)} className={inputClass} />
                </td>
                <td className="border border-zinc-200 p-1">
                  <input value={item.answer} onChange={(e) => updateFib(i, 'answer', e.target.value)} className={`${inputClass} text-green-700 font-medium`} />
                </td>
                <td className="border border-zinc-200 p-1">
                  <input value={item.hint ?? ''} onChange={(e) => updateFib(i, 'hint', e.target.value)} className={inputClass} />
                </td>
                <td className="border border-zinc-200 p-1 text-center">
                  <button type="button" onClick={() => removeFib(i)} className="text-zinc-400 hover:text-red-500 transition-colors px-1" aria-label="Remove item">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={addFib} className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium">+ Add item</button>

      {/* Multiple Choice */}
      <p className={sectionHeadingClass}>Multiple Choice</p>
      <div className="space-y-3">
        {multipleChoice.map((q, qi) => (
          <div key={mcIdsRef.current[qi]} className="border border-zinc-200 rounded p-3 space-y-2">
            <div className="flex items-start gap-2">
              <input
                value={q.question}
                onChange={(e) => updateMcQuestion(qi, e.target.value)}
                placeholder="Question"
                className={`${inputClass} border border-zinc-200 rounded flex-1`}
              />
              <button type="button" onClick={() => removeMc(qi)} className="text-zinc-400 hover:text-red-500 transition-colors mt-1 shrink-0" aria-label="Remove question">✕</button>
            </div>
            <div className="space-y-1 pl-2">
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`mc-correct-${mcIdsRef.current[qi]}`}
                    checked={q.answer === opt && opt !== ''}
                    onChange={() => setMcAnswer(qi, opt)}
                    className="accent-green-600 shrink-0"
                    title="Mark as correct answer"
                  />
                  <input
                    value={opt}
                    onChange={(e) => updateMcOption(qi, oi, e.target.value)}
                    placeholder={`Option ${oi + 1}`}
                    className={`${inputClass} border border-zinc-100 rounded flex-1 ${q.answer === opt && opt !== '' ? 'text-green-700 font-medium' : ''}`}
                  />
                  <button type="button" onClick={() => removeMcOption(qi, oi)} className="text-zinc-400 hover:text-red-500 transition-colors shrink-0" aria-label="Remove option">✕</button>
                </div>
              ))}
              <button type="button" onClick={() => addMcOption(qi)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium mt-1">+ Add option</button>
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={addMc} className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium">+ Add question</button>

      {/* Matching */}
      <p className={sectionHeadingClass}>Matching</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-zinc-50">
              <th className="border border-zinc-200 px-3 py-2 text-left font-medium text-zinc-600">Left</th>
              <th className="border border-zinc-200 px-3 py-2 text-left font-medium text-zinc-600">Right</th>
              <th className="border border-zinc-200 px-3 py-2 w-10"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {matching.map((pair, i) => (
              <tr key={matchIdsRef.current[i]} className="hover:bg-zinc-50">
                <td className="border border-zinc-200 p-1">
                  <input value={pair.left} onChange={(e) => updateMatch(i, 'left', e.target.value)} className={inputClass} />
                </td>
                <td className="border border-zinc-200 p-1">
                  <input value={pair.right} onChange={(e) => updateMatch(i, 'right', e.target.value)} className={inputClass} />
                </td>
                <td className="border border-zinc-200 p-1 text-center">
                  <button type="button" onClick={() => removeMatch(i)} className="text-zinc-400 hover:text-red-500 transition-colors px-1" aria-label="Remove pair">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={addMatch} className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium">+ Add pair</button>
    </div>
  )
}

// ─── Preview ─────────────────────────────────────────────────────────────────

function Preview({ parsedContent, rawContent }: PreviewProps) {
  if (!isExercisesContent(parsedContent)) {
    return <pre className="text-sm whitespace-pre-wrap">{rawContent}</pre>
  }

  const { fillInBlank, multipleChoice, matching } = parsedContent as ExercisesContent

  return (
    <div className="space-y-4 text-sm" data-testid="exercises-preview">
      {fillInBlank.length > 0 && (
        <div>
          <p className={sectionHeadingClass}>Fill in the Blank</p>
          <ol className="space-y-2 list-decimal list-inside">
            {fillInBlank.map((item, i) => (
              <li key={i} className="text-zinc-700">
                {item.sentence.replace('___', '[      ]')}
                {item.hint && <span className="text-xs text-zinc-400 ml-2">({item.hint})</span>}
              </li>
            ))}
          </ol>
        </div>
      )}
      {multipleChoice.length > 0 && (
        <div>
          <p className={sectionHeadingClass}>Multiple Choice</p>
          <ol className="space-y-3 list-decimal list-inside">
            {multipleChoice.map((q, qi) => (
              <li key={qi} className="text-zinc-700">
                <span>{q.question}</span>
                <ul className="mt-1 ml-4 space-y-1">
                  {q.options.map((opt, oi) => (
                    <li key={oi} className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full border border-zinc-300 inline-block shrink-0" />
                      <span>{opt}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      )}
      {matching.length > 0 && (
        <div>
          <p className={sectionHeadingClass}>Matching</p>
          <div className="overflow-x-auto">
            <table className="text-sm border-collapse">
              <tbody>
                {matching.map((pair, i) => (
                  <tr key={i}>
                    <td className="border border-zinc-200 px-3 py-1.5 font-medium">{pair.left}</td>
                    <td className="border border-zinc-200 px-3 py-1.5 text-zinc-400 w-24 text-center">___</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Student ─────────────────────────────────────────────────────────────────

function Student({ parsedContent, rawContent }: StudentProps) {
  const [fibAnswers, setFibAnswers] = useState<string[]>([])
  const [mcAnswers, setMcAnswers] = useState<(string | null)[]>([])
  const [matchAnswers, setMatchAnswers] = useState<(string | null)[]>([])
  const [checked, setChecked] = useState(false)

  if (!isExercisesContent(parsedContent)) {
    return <pre className="text-sm whitespace-pre-wrap">{rawContent}</pre>
  }

  const { fillInBlank, multipleChoice, matching } = parsedContent as ExercisesContent

  // Ensure answer arrays are sized (safe on first render)
  const fibs = fibAnswers.length === fillInBlank.length
    ? fibAnswers
    : Array(fillInBlank.length).fill('')
  const mcs: (string | null)[] = mcAnswers.length === multipleChoice.length
    ? mcAnswers
    : Array(multipleChoice.length).fill(null)
  const matches: (string | null)[] = matchAnswers.length === matching.length
    ? matchAnswers
    : Array(matching.length).fill(null)

  const fibCorrect = fillInBlank.map((item, i) =>
    (fibs[i] ?? '').trim().toLowerCase() === item.answer.trim().toLowerCase()
  )
  const mcCorrect = multipleChoice.map((q, i) => mcs[i] === q.answer)
  const matchCorrect = matching.map((pair, i) => matches[i] === pair.right)

  const totalQuestions = fillInBlank.length + multipleChoice.length + matching.length
  const totalCorrect = [
    ...fibCorrect,
    ...mcCorrect,
    ...matchCorrect,
  ].filter(Boolean).length

  const handleCheck = () => {
    // Freeze current sizes so checked state is consistent
    if (fibs !== fibAnswers) setFibAnswers(fibs)
    if (mcs !== mcAnswers) setMcAnswers(mcs)
    if (matches !== matchAnswers) setMatchAnswers(matches)
    setChecked(true)
  }

  const handleReset = () => {
    setFibAnswers(Array(fillInBlank.length).fill(''))
    setMcAnswers(Array(multipleChoice.length).fill(null))
    setMatchAnswers(Array(matching.length).fill(null))
    setChecked(false)
  }

  const resultClass = (correct: boolean) =>
    checked ? (correct ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50') : ''

  // Shuffled right column for matching (stable — derived from pair order, not random)
  const rightOptions = matching.map((p) => p.right)

  return (
    <div className="space-y-6 text-sm" data-testid="exercises-student">
      {/* Fill-in-blank */}
      {fillInBlank.length > 0 && (
        <div>
          <p className={sectionHeadingClass}>Fill in the Blank</p>
          <ol className="space-y-3 list-decimal list-inside">
            {fillInBlank.map((item, i) => {
              const parts = item.sentence.split('___')
              return (
                <li key={i} className="text-zinc-700 flex flex-wrap items-baseline gap-1">
                  <span>{parts[0]}</span>
                  <input
                    value={fibs[i] ?? ''}
                    onChange={(e) => {
                      const next = [...fibs]
                      next[i] = e.target.value
                      setFibAnswers(next)
                    }}
                    disabled={checked}
                    className={`border rounded px-2 py-0.5 w-28 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300 ${resultClass(fibCorrect[i])}`}
                    data-testid={`fib-input-${i}`}
                  />
                  <span>{parts[1] ?? ''}</span>
                  {item.hint && <span className="text-xs text-zinc-400">({item.hint})</span>}
                  {checked && (
                    <span
                      className={`text-xs font-medium ml-1 ${fibCorrect[i] ? 'text-green-600' : 'text-red-600'}`}
                      data-testid={`fib-result-${i}`}
                    >
                      {fibCorrect[i] ? '✓' : `✗ ${item.answer}`}
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      )}

      {/* Multiple choice */}
      {multipleChoice.length > 0 && (
        <div>
          <p className={sectionHeadingClass}>Multiple Choice</p>
          <ol className="space-y-4 list-decimal list-inside">
            {multipleChoice.map((q, qi) => (
              <li key={qi} className="text-zinc-700">
                <span>{q.question}</span>
                <ul className="mt-2 ml-4 space-y-1.5">
                  {q.options.map((opt, oi) => {
                    const selected = mcs[qi] === opt
                    const isCorrectOpt = opt === q.answer
                    let optClass = 'border border-zinc-200 rounded px-3 py-1.5 cursor-pointer flex items-center gap-2'
                    if (checked) {
                      if (selected && isCorrectOpt) optClass += ' border-green-400 bg-green-50'
                      else if (selected && !isCorrectOpt) optClass += ' border-red-400 bg-red-50'
                      else if (!selected && isCorrectOpt) optClass += ' border-green-300 bg-green-50/50'
                    } else if (selected) {
                      optClass += ' border-indigo-400 bg-indigo-50'
                    }
                    return (
                      <li key={oi}>
                        <label className={optClass}>
                          <input
                            type="radio"
                            name={`mc-student-${qi}`}
                            value={opt}
                            checked={selected}
                            onChange={() => {
                              const next = [...mcs] as (string | null)[]
                              next[qi] = opt
                              setMcAnswers(next)
                            }}
                            disabled={checked}
                            className="accent-indigo-600"
                            data-testid={`mc-option-${qi}-${oi}`}
                          />
                          <span>{opt}</span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
                {checked && (
                  <span
                    className={`text-xs font-medium ml-4 mt-1 inline-block ${mcCorrect[qi] ? 'text-green-600' : 'text-red-600'}`}
                    data-testid={`mc-result-${qi}`}
                  >
                    {mcCorrect[qi] ? '✓ Correct' : `✗ Answer: ${q.answer}`}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Matching */}
      {matching.length > 0 && (
        <div>
          <p className={sectionHeadingClass}>Matching</p>
          <div className="grid gap-2" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) auto' }}>
            {matching.map((pair, i) => (
              <>
                <span key={`left-${i}`} className="font-medium text-zinc-700 self-center">{pair.left}</span>
                <select
                  key={`sel-${i}`}
                  value={matches[i] ?? ''}
                  onChange={(e) => {
                    const next = [...matches] as (string | null)[]
                    next[i] = e.target.value || null
                    setMatchAnswers(next)
                  }}
                  disabled={checked}
                  className={`border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300 w-full ${resultClass(matchCorrect[i])}`}
                  data-testid={`match-select-${i}`}
                >
                  <option value="">-- select --</option>
                  {rightOptions.map((opt, oi) => (
                    <option key={oi} value={opt}>{opt}</option>
                  ))}
                </select>
                <span key={`res-${i}`} className="self-center text-xs font-medium w-20">
                  {checked && (
                    <span
                      className={matchCorrect[i] ? 'text-green-600' : 'text-red-600'}
                      data-testid={`match-result-${i}`}
                    >
                      {matchCorrect[i] ? '✓' : `✗ ${pair.right}`}
                    </span>
                  )}
                </span>
              </>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        {!checked ? (
          <button
            type="button"
            onClick={handleCheck}
            disabled={totalQuestions === 0}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
            data-testid="check-answers-btn"
          >
            Check Answers
          </button>
        ) : (
          <>
            <span className="text-sm font-semibold text-zinc-800" data-testid="score-summary">
              You got {totalCorrect} / {totalQuestions} correct
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

export const ExercisesRenderer = { Editor, Preview, Student }
