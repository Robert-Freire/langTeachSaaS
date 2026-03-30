/* eslint-disable react-refresh/only-export-components */
import { useState, useRef, useMemo, useEffect } from 'react'
import { isExercisesContent, coerceExercisesContent } from '../../../types/contentTypes'
import type {
  ExercisesContent,
  ExercisesFillInBlank,
  ExercisesMatching,
  ExercisesTrueFalse,
  PracticeStage,
} from '../../../types/contentTypes'
import type { EditorProps, PreviewProps, StudentProps } from '../contentRegistry'
import { ContentParseError } from '../ContentParseError'
import { ContentEditorParseError } from '../ContentEditorParseError'

const inputClass = 'w-full bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded'
const sectionHeadingClass = 'text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2 mt-4 first:mt-0'

// Stage display metadata
// SYNC: label/labelEs mirror nameEs/nameLong in data/pedagogy/practice-stages.json — update both if stage names change
const STAGE_LABELS: Record<PracticeStage, { label: string; labelEs: string; color: string }> = {
  controlled: { label: 'Controlled', labelEs: 'Controlada', color: 'text-indigo-600 border-indigo-200 bg-indigo-50' },
  meaningful: { label: 'Meaningful', labelEs: 'Significativa', color: 'text-amber-700 border-amber-200 bg-amber-50' },
  guided_free: { label: 'Guided Free', labelEs: 'Libre guiada', color: 'text-emerald-700 border-emerald-200 bg-emerald-50' },
}

function StageLabel({ stage }: { stage: PracticeStage }) {
  const meta = STAGE_LABELS[stage]
  return (
    <span
      className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${meta.color}`}
      title={meta.labelEs}
    >
      {meta.label}
    </span>
  )
}

function StageSectionHeader({ stage }: { stage: PracticeStage }) {
  const meta = STAGE_LABELS[stage]
  return (
    <div
      className="flex items-center gap-2 mt-5 mb-1 pt-3 border-t border-zinc-100"
      data-testid={`stage-header-${stage}`}
    >
      <span className={`text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${meta.color}`}>
        {meta.label} / {meta.labelEs}
      </span>
    </div>
  )
}

// Group items by stage, preserving order within each stage group.
// Items without a stage are returned under the key "unstaged".
function groupByStage<T extends { stage?: PracticeStage }>(
  items: T[]
): { stage: PracticeStage | 'unstaged'; items: T[] }[] {
  // SYNC: order matches stages array position in data/pedagogy/practice-stages.json — update if stages are added/reordered
  const order: (PracticeStage | 'unstaged')[] = ['unstaged', 'controlled', 'meaningful', 'guided_free']
  const map = new Map<PracticeStage | 'unstaged', T[]>()
  for (const item of items) {
    const key = item.stage ?? 'unstaged'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return order
    .filter(k => map.has(k))
    .map(k => ({ stage: k, items: map.get(k)! }))
}

// ─── Editor ──────────────────────────────────────────────────────────────────

let nextId = 0
function uid() { return nextId++ }

function syncIds(ids: number[], targetLength: number) {
  while (ids.length < targetLength) ids.push(uid())
  return ids
}

function Editor({ parsedContent, rawContent, onChange, onRegenerate, isIncomplete }: EditorProps) {
  const fibIdsRef = useRef<number[]>([])
  const mcIdsRef = useRef<number[]>([])
  const matchIdsRef = useRef<number[]>([])
  const tfIdsRef = useRef<number[]>([])

  const content = isExercisesContent(parsedContent) ? parsedContent as ExercisesContent : null

  // Sync stable IDs (must run before early return so hooks are unconditional)
  // Ref access during memo is intentional: these are append-only ID arrays used as React keys
  /* eslint-disable react-hooks/refs */
  const fibIds = useMemo(() => syncIds(fibIdsRef.current, content?.fillInBlank.length ?? 0), [content?.fillInBlank.length])
  const mcIds = useMemo(() => syncIds(mcIdsRef.current, content?.multipleChoice.length ?? 0), [content?.multipleChoice.length])
  const matchIds = useMemo(() => syncIds(matchIdsRef.current, content?.matching.length ?? 0), [content?.matching.length])
  const tfIds = useMemo(() => syncIds(tfIdsRef.current, content?.trueFalse.length ?? 0), [content?.trueFalse.length])
  /* eslint-enable react-hooks/refs */

  if (!content) {
    return (
      <ContentEditorParseError
        rawContent={rawContent}
        onChange={onChange}
        onRegenerate={onRegenerate}
        isIncomplete={isIncomplete}
      />
    )
  }

  const { fillInBlank, multipleChoice, matching, trueFalse } = content

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

  // True/False handlers
  const updateTf = (i: number, field: keyof ExercisesTrueFalse, value: string | boolean) => {
    const next = trueFalse.map((item, idx) => idx === i ? { ...item, [field]: value } : item)
    emit({ ...content, trueFalse: next })
  }
  const addTf = () => {
    tfIdsRef.current.push(uid())
    emit({ ...content, trueFalse: [...trueFalse, { statement: '', isTrue: true, justification: '' }] })
  }
  const removeTf = (i: number) => {
    tfIdsRef.current.splice(i, 1)
    emit({ ...content, trueFalse: trueFalse.filter((_, idx) => idx !== i) })
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
              <th className="hidden sm:table-cell border border-zinc-200 px-3 py-2 text-left font-medium text-zinc-400">Explanation</th>
              <th className="hidden sm:table-cell border border-zinc-200 px-3 py-2 text-left font-medium text-zinc-400">Stage</th>
              <th className="border border-zinc-200 px-3 py-2 w-10"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {fillInBlank.map((item, i) => (
              <tr key={fibIds[i]} className="hover:bg-zinc-50">
                <td className="border border-zinc-200 p-1">
                  <input value={item.sentence} onChange={(e) => updateFib(i, 'sentence', e.target.value)} className={inputClass} />
                </td>
                <td className="border border-zinc-200 p-1">
                  <input value={item.answer} onChange={(e) => updateFib(i, 'answer', e.target.value)} className={`${inputClass} text-green-700 font-medium`} />
                </td>
                <td className="border border-zinc-200 p-1">
                  <input value={item.hint ?? ''} onChange={(e) => updateFib(i, 'hint', e.target.value)} className={inputClass} />
                </td>
                <td className="hidden sm:table-cell border border-zinc-200 p-1">
                  <span className="px-2 py-1 text-xs text-zinc-400 italic">{item.explanation ?? '—'}</span>
                </td>
                <td className="hidden sm:table-cell border border-zinc-200 p-1 text-center">
                  {item.stage && <StageLabel stage={item.stage} />}
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
          <div key={mcIds[qi]} className="border border-zinc-200 rounded p-3 space-y-2">
            <div className="flex items-start gap-2">
              <input
                value={q.question}
                onChange={(e) => updateMcQuestion(qi, e.target.value)}
                placeholder="Question"
                className={`${inputClass} border border-zinc-200 rounded flex-1`}
              />
              {q.stage && <StageLabel stage={q.stage} />}
              <button type="button" onClick={() => removeMc(qi)} className="text-zinc-400 hover:text-red-500 transition-colors mt-1 shrink-0" aria-label="Remove question">✕</button>
            </div>
            <div className="space-y-1 pl-2">
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`mc-correct-${mcIds[qi]}`}
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
            {q.explanation && (
              <p className="text-xs text-zinc-400 italic mt-2 pl-1 border-t border-zinc-100 pt-2">{q.explanation}</p>
            )}
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
              <th className="hidden sm:table-cell border border-zinc-200 px-3 py-2 text-left font-medium text-zinc-400">Explanation</th>
              <th className="hidden sm:table-cell border border-zinc-200 px-3 py-2 text-left font-medium text-zinc-400">Stage</th>
              <th className="border border-zinc-200 px-3 py-2 w-10"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {matching.map((pair, i) => (
              <tr key={matchIds[i]} className="hover:bg-zinc-50">
                <td className="border border-zinc-200 p-1">
                  <input value={pair.left} onChange={(e) => updateMatch(i, 'left', e.target.value)} className={inputClass} />
                </td>
                <td className="border border-zinc-200 p-1">
                  <input value={pair.right} onChange={(e) => updateMatch(i, 'right', e.target.value)} className={inputClass} />
                </td>
                <td className="hidden sm:table-cell border border-zinc-200 p-1">
                  <span className="px-2 py-1 text-xs text-zinc-400 italic">{pair.explanation ?? '—'}</span>
                </td>
                <td className="hidden sm:table-cell border border-zinc-200 p-1 text-center">
                  {pair.stage && <StageLabel stage={pair.stage} />}
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

      {/* True/False with Justification */}
      <p className={sectionHeadingClass}>True / False with Justification</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-zinc-50">
              <th className="border border-zinc-200 px-3 py-2 text-left font-medium text-zinc-600">Statement</th>
              <th className="border border-zinc-200 px-3 py-2 text-left font-medium text-zinc-600 w-28">Answer</th>
              <th className="border border-zinc-200 px-3 py-2 text-left font-medium text-zinc-600">Justification (model)</th>
              <th className="hidden sm:table-cell border border-zinc-200 px-3 py-2 text-left font-medium text-zinc-400">Stage</th>
              <th className="border border-zinc-200 px-3 py-2 w-10"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {trueFalse.map((item, i) => (
              <tr key={tfIds[i]} className="hover:bg-zinc-50">
                <td className="border border-zinc-200 p-1">
                  <input value={item.statement} onChange={(e) => updateTf(i, 'statement', e.target.value)} className={inputClass} />
                </td>
                <td className="border border-zinc-200 p-1">
                  <select
                    value={item.isTrue ? 'true' : 'false'}
                    onChange={(e) => updateTf(i, 'isTrue', e.target.value === 'true')}
                    className="w-full bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded"
                    data-testid={`tf-answer-${i}`}
                  >
                    <option value="true">Verdadero (V)</option>
                    <option value="false">Falso (F)</option>
                  </select>
                </td>
                <td className="border border-zinc-200 p-1">
                  <input value={item.justification} onChange={(e) => updateTf(i, 'justification', e.target.value)} className={inputClass} placeholder="Text excerpt that proves the answer" />
                </td>
                <td className="hidden sm:table-cell border border-zinc-200 p-1 text-center">
                  {item.stage && <StageLabel stage={item.stage} />}
                </td>
                <td className="border border-zinc-200 p-1 text-center">
                  <button type="button" onClick={() => removeTf(i)} className="text-zinc-400 hover:text-red-500 transition-colors px-1" aria-label="Remove item">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={addTf} className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium">+ Add statement</button>
    </div>
  )
}

// ─── Preview ─────────────────────────────────────────────────────────────────

function Preview({ parsedContent }: PreviewProps) {
  if (!isExercisesContent(parsedContent)) {
    return <ContentParseError context="teacher" />
  }

  const { fillInBlank, multipleChoice, matching, trueFalse } = parsedContent as ExercisesContent

  const fibGroups = groupByStage(fillInBlank)
  const mcGroups = groupByStage(multipleChoice)
  const matchGroups = groupByStage(matching)
  const tfGroups = groupByStage(trueFalse)

  return (
    <div className="space-y-4 text-sm" data-testid="exercises-preview">
      {fillInBlank.length > 0 && (
        <div>
          <p className={sectionHeadingClass}>Fill in the Blank</p>
          {fibGroups.map(({ stage, items }) => (
            <div key={stage}>
              {stage !== 'unstaged' && <StageSectionHeader stage={stage} />}
              <ol className="space-y-2 list-decimal list-inside">
                {items.map((item, i) => (
                  <li key={i} className="text-zinc-700">
                    {item.sentence.replace('___', '[      ]')}
                    {item.hint && <span className="text-xs text-zinc-400 ml-2">({item.hint})</span>}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
      {multipleChoice.length > 0 && (
        <div>
          <p className={sectionHeadingClass}>Multiple Choice</p>
          {mcGroups.map(({ stage, items }) => (
            <div key={stage}>
              {stage !== 'unstaged' && <StageSectionHeader stage={stage} />}
              <ol className="space-y-3 list-decimal list-inside">
                {items.map((q, qi) => (
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
          ))}
        </div>
      )}
      {matching.length > 0 && (
        <div>
          <p className={sectionHeadingClass}>Matching</p>
          {matchGroups.map(({ stage, items }) => (
            <div key={stage}>
              {stage !== 'unstaged' && <StageSectionHeader stage={stage} />}
              <div className="overflow-x-auto">
                <table className="text-sm border-collapse">
                  <tbody>
                    {items.map((pair, i) => (
                      <tr key={i}>
                        <td className="border border-zinc-200 px-3 py-1.5 font-medium">{pair.left}</td>
                        <td className="border border-zinc-200 px-3 py-1.5 text-zinc-400 w-24 text-center">___</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
      {trueFalse.length > 0 && (
        <div>
          <p className={sectionHeadingClass}>True / False with Justification</p>
          {tfGroups.map(({ stage, items }) => (
            <div key={stage}>
              {stage !== 'unstaged' && <StageSectionHeader stage={stage} />}
              <ol className="space-y-2 list-decimal list-inside">
                {items.map((item, i) => (
                  <li key={i} className="text-zinc-700">
                    <span>{item.statement}</span>
                    <span className="ml-2 text-xs font-medium text-zinc-400">[V / F]</span>
                    <div className="mt-0.5 ml-4 text-xs text-zinc-400 italic">Justificación: ___________</div>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Student ─────────────────────────────────────────────────────────────────

// Pair colors — cycle through these for matched pairs
const PAIR_COLORS = [
  { bg: 'bg-violet-100', border: 'border-violet-400', text: 'text-violet-800' },
  { bg: 'bg-sky-100', border: 'border-sky-400', text: 'text-sky-800' },
  { bg: 'bg-amber-100', border: 'border-amber-400', text: 'text-amber-800' },
  { bg: 'bg-emerald-100', border: 'border-emerald-400', text: 'text-emerald-800' },
  { bg: 'bg-rose-100', border: 'border-rose-400', text: 'text-rose-800' },
  { bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-800' },
]

function Student({ parsedContent, rawContent }: StudentProps) {
  const [fibAnswers, setFibAnswers] = useState<string[]>([])
  const [mcAnswers, setMcAnswers] = useState<(string | null)[]>([])
  // matchAnswers[i] = right-side value paired with left[i], or null
  const [matchAnswers, setMatchAnswers] = useState<(string | null)[]>([])
  // index of the left item currently selected (waiting for right pick)
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null)
  // trueFalse answers: boolean selection (null = unanswered) + free-text justification
  const [tfAnswers, setTfAnswers] = useState<(boolean | null)[]>([])
  const [tfJustifications, setTfJustifications] = useState<string[]>([])
  const [checked, setChecked] = useState(false)

  // Reset all answers when the content block changes (sync with external content updates)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setFibAnswers([])
    setMcAnswers([])
    setMatchAnswers([])
    setSelectedLeft(null)
    setTfAnswers([])
    setTfJustifications([])
    setChecked(false)
  }, [rawContent])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Extract matching before the early return so useMemo is always called (Rules of Hooks)
  const validContent = isExercisesContent(parsedContent) ? parsedContent as ExercisesContent : null

  // Stable rotation of right-side options so they don't appear in the same order as left
  const shuffledRight = useMemo(() => {
    if (!validContent) return []
    const items = validContent.matching.map((p, i) => ({ value: p.right, origIdx: i }))
    // Rotate by half the length for a simple deterministic reorder
    const mid = Math.ceil(items.length / 2)
    return [...items.slice(mid), ...items.slice(0, mid)]
  }, [validContent])

  if (!validContent) {
    return <ContentParseError context="student" />
  }

  const { fillInBlank, multipleChoice, matching, trueFalse } = validContent

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
  const tfs: (boolean | null)[] = tfAnswers.length === trueFalse.length
    ? tfAnswers
    : Array(trueFalse.length).fill(null)
  const tfJusts: string[] = tfJustifications.length === trueFalse.length
    ? tfJustifications
    : Array(trueFalse.length).fill('')

  const fibCorrect = fillInBlank.map((item, i) =>
    (fibs[i] ?? '').trim().toLowerCase() === item.answer.trim().toLowerCase()
  )
  const mcCorrect = multipleChoice.map((q, i) => mcs[i] === q.answer)
  const matchCorrect = matching.map((pair, i) => matches[i] === pair.right)
  const tfCorrect = trueFalse.map((item, i) => tfs[i] !== null && tfs[i] === item.isTrue)

  const totalQuestions = fillInBlank.length + multipleChoice.length + matching.length + trueFalse.length
  const totalCorrect = [
    ...fibCorrect,
    ...mcCorrect,
    ...matchCorrect,
    ...tfCorrect,
  ].filter(Boolean).length

  const handleCheck = () => {
    if (fibs !== fibAnswers) setFibAnswers(fibs)
    if (mcs !== mcAnswers) setMcAnswers(mcs)
    if (matches !== matchAnswers) setMatchAnswers(matches)
    if (tfs !== tfAnswers) setTfAnswers(tfs)
    if (tfJusts !== tfJustifications) setTfJustifications(tfJusts)
    setChecked(true)
  }

  const handleReset = () => {
    setFibAnswers(Array(fillInBlank.length).fill(''))
    setMcAnswers(Array(multipleChoice.length).fill(null))
    setMatchAnswers(Array(matching.length).fill(null))
    setSelectedLeft(null)
    setTfAnswers(Array(trueFalse.length).fill(null))
    setTfJustifications(Array(trueFalse.length).fill(''))
    setChecked(false)
  }

  const resultClass = (correct: boolean) =>
    checked ? (correct ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50') : ''

  // Matching interaction handlers
  const handleLeftClick = (i: number) => {
    if (checked) return
    if (selectedLeft === i) {
      setSelectedLeft(null)
      return
    }
    setSelectedLeft(i)
  }

  const handleRightClick = (value: string) => {
    if (checked) return
    const alreadyPairedAt = matches.findIndex((m) => m === value)
    if (selectedLeft === null) {
      // No left selected: if this right is already paired, unpair it
      if (alreadyPairedAt !== -1) {
        const next = [...matches]
        next[alreadyPairedAt] = null
        setMatchAnswers(next)
      }
      return
    }
    const next = [...matches]
    // If right was paired elsewhere, free it first
    if (alreadyPairedAt !== -1) next[alreadyPairedAt] = null
    // If this left was already paired, free it (swap)
    next[selectedLeft] = value
    setMatchAnswers(next)
    setSelectedLeft(null)
  }

  // color index per left item (only assigned once paired)
  const pairColorIndex = (i: number) => i % PAIR_COLORS.length

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
                  {checked && !fibCorrect[i] && item.explanation && (
                    <p className="w-full text-xs text-zinc-500 mt-1" data-testid={`fib-explanation-${i}`}>
                      {item.explanation}
                    </p>
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
                  <div className="ml-4 mt-1">
                    <span
                      className={`text-xs font-medium ${mcCorrect[qi] ? 'text-green-600' : 'text-red-600'}`}
                      data-testid={`mc-result-${qi}`}
                    >
                      {mcCorrect[qi] ? '✓ Correct' : `✗ Answer: ${q.answer}`}
                    </span>
                    {!mcCorrect[qi] && q.explanation && (
                      <p className="text-xs text-zinc-500 mt-0.5" data-testid={`mc-explanation-${qi}`}>
                        {q.explanation}
                      </p>
                    )}
                  </div>
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
          {!checked && (
            <p className="text-xs text-zinc-400 mb-3">Select a prompt, then select its match.</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            {/* Left column: prompts */}
            <div className="space-y-2">
              {matching.map((pair, i) => {
                const paired = matches[i] !== null
                const color = paired ? PAIR_COLORS[pairColorIndex(i)] : null
                const isSelected = selectedLeft === i
                let cls = 'rounded-lg border-2 px-3 py-2 text-sm font-medium cursor-pointer transition-all select-none'
                if (checked) {
                  cls += matchCorrect[i]
                    ? ' border-green-400 bg-green-50 text-green-800'
                    : ' border-red-400 bg-red-50 text-red-800'
                } else if (isSelected) {
                  cls += ' border-indigo-500 bg-indigo-50 text-indigo-800 ring-2 ring-indigo-300'
                } else if (color) {
                  cls += ` ${color.border} ${color.bg} ${color.text}`
                } else {
                  cls += ' border-zinc-200 bg-white text-zinc-700 hover:border-indigo-300 hover:bg-indigo-50/50'
                }
                return (
                  <div
                    key={i}
                    className={cls}
                    onClick={() => handleLeftClick(i)}
                    data-testid={`match-left-${i}`}
                  >
                    {pair.left}
                    {checked && (
                      <span className="ml-2 text-xs font-semibold" data-testid={`match-result-${i}`}>
                        {matchCorrect[i] ? '✓' : `✗`}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Right column: shuffled answers */}
            <div className="space-y-2">
              {shuffledRight.map(({ value }, si) => {
                const pairedToLeftIdx = matches.findIndex((m) => m === value)
                const isPaired = pairedToLeftIdx !== -1
                const color = isPaired ? PAIR_COLORS[pairColorIndex(pairedToLeftIdx)] : null
                let cls = 'rounded-lg border-2 px-3 py-2 text-sm cursor-pointer transition-all select-none'
                if (checked) {
                  const correct = isPaired && matchCorrect[pairedToLeftIdx]
                  cls += isPaired
                    ? correct
                      ? ' border-green-400 bg-green-50 text-green-800'
                      : ' border-red-400 bg-red-50 text-red-800'
                    : ' border-zinc-200 bg-white text-zinc-400'
                } else if (color) {
                  cls += ` ${color.border} ${color.bg} ${color.text}`
                } else {
                  cls += selectedLeft !== null
                    ? ' border-zinc-200 bg-white text-zinc-700 hover:border-indigo-300 hover:bg-indigo-50/50'
                    : ' border-zinc-200 bg-white text-zinc-700'
                }
                return (
                  <div
                    key={si}
                    className={cls}
                    onClick={() => handleRightClick(value)}
                    data-testid={`match-right-${si}`}
                  >
                    {value}
                  </div>
                )
              })}
            </div>
          </div>
          {checked && (
            <div className="mt-3 space-y-2">
              {matching.map((pair, i) => !matchCorrect[i] && (
                <div key={i}>
                  <p className="text-xs text-red-600">
                    "{pair.left}" should match "{pair.right}"
                  </p>
                  {pair.explanation && (
                    <p className="text-xs text-zinc-500 mt-0.5" data-testid={`match-explanation-${i}`}>
                      {pair.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* True/False with Justification */}
      {trueFalse.length > 0 && (
        <div>
          <p className={sectionHeadingClass}>True / False with Justification</p>
          <p className="text-xs text-zinc-400 mb-3">Select Verdadero or Falso, then write the text excerpt that proves your answer.</p>
          <ol className="space-y-4 list-decimal list-inside">
            {trueFalse.map((item, i) => (
              <li key={i} className="text-zinc-700">
                <span>{item.statement}</span>
                <div className="mt-2 ml-4 flex gap-3">
                  <label className={`flex items-center gap-1.5 rounded-lg border-2 px-3 py-1.5 text-sm cursor-pointer transition-all select-none ${
                    checked
                      ? tfs[i] === true
                        ? tfCorrect[i] ? 'border-green-400 bg-green-50 text-green-800' : 'border-red-400 bg-red-50 text-red-800'
                        : !item.isTrue ? 'border-green-300 bg-green-50/50 text-green-700' : 'border-zinc-200 bg-white text-zinc-400'
                      : tfs[i] === true ? 'border-indigo-400 bg-indigo-50 text-indigo-800' : 'border-zinc-200 bg-white text-zinc-700 hover:border-indigo-300'
                  }`}>
                    <input
                      type="radio"
                      name={`tf-student-${i}`}
                      checked={tfs[i] === true}
                      onChange={() => {
                        const next = [...tfs] as (boolean | null)[]
                        next[i] = true
                        setTfAnswers(next)
                      }}
                      disabled={checked}
                      className="accent-indigo-600"
                      data-testid={`tf-option-true-${i}`}
                    />
                    Verdadero
                  </label>
                  <label className={`flex items-center gap-1.5 rounded-lg border-2 px-3 py-1.5 text-sm cursor-pointer transition-all select-none ${
                    checked
                      ? tfs[i] === false
                        ? tfCorrect[i] ? 'border-green-400 bg-green-50 text-green-800' : 'border-red-400 bg-red-50 text-red-800'
                        : item.isTrue ? 'border-green-300 bg-green-50/50 text-green-700' : 'border-zinc-200 bg-white text-zinc-400'
                      : tfs[i] === false ? 'border-indigo-400 bg-indigo-50 text-indigo-800' : 'border-zinc-200 bg-white text-zinc-700 hover:border-indigo-300'
                  }`}>
                    <input
                      type="radio"
                      name={`tf-student-${i}`}
                      checked={tfs[i] === false}
                      onChange={() => {
                        const next = [...tfs] as (boolean | null)[]
                        next[i] = false
                        setTfAnswers(next)
                      }}
                      disabled={checked}
                      className="accent-indigo-600"
                      data-testid={`tf-option-false-${i}`}
                    />
                    Falso
                  </label>
                </div>
                {checked && (
                  <div className="ml-4 mt-1">
                    <span
                      className={`text-xs font-medium ${tfCorrect[i] ? 'text-green-600' : 'text-red-600'}`}
                      data-testid={`tf-result-${i}`}
                    >
                      {tfCorrect[i] ? '✓ Correct' : `✗ Answer: ${item.isTrue ? 'Verdadero' : 'Falso'}`}
                    </span>
                  </div>
                )}
                <div className="mt-2 ml-4">
                  <textarea
                    value={tfJusts[i] ?? ''}
                    onChange={(e) => {
                      const next = [...tfJusts]
                      next[i] = e.target.value
                      setTfJustifications(next)
                    }}
                    disabled={checked}
                    placeholder="Cita el fragmento del texto que justifica tu respuesta..."
                    rows={2}
                    className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300 resize-none"
                    data-testid={`tf-justification-${i}`}
                  />
                  {checked && item.justification && (
                    <div className="mt-1 p-2 bg-zinc-50 border border-zinc-200 rounded text-xs" data-testid={`tf-model-answer-${i}`}>
                      <span className="font-medium text-zinc-600">Justificación del modelo: </span>
                      <span className="text-zinc-700 italic">{item.justification}</span>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
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

export const ExercisesRenderer = { Editor, Preview, Student, coerce: coerceExercisesContent }
