import { useRef } from 'react'
import { isConversationContent } from '../../../types/contentTypes'
import type { ConversationContent, ConversationScenario } from '../../../types/contentTypes'
import type { EditorProps, PreviewProps, StudentProps } from '../contentRegistry'

const sectionHeadingClass = 'text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2 mt-4 first:mt-0'
const inputClass = 'w-full bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded border border-zinc-200'

// ─── uid helpers ─────────────────────────────────────────────────────────────

let nextId = 0
function uid() { return nextId++ }

// ─── Editor ──────────────────────────────────────────────────────────────────

function Editor({ parsedContent, rawContent, onChange }: EditorProps) {
  const scenarioIdsRef = useRef<number[]>([])

  if (!isConversationContent(parsedContent)) {
    return (
      <textarea
        value={rawContent}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        className="w-full resize-none text-sm border rounded p-2"
      />
    )
  }

  const content = parsedContent as ConversationContent
  const { scenarios } = content

  while (scenarioIdsRef.current.length < scenarios.length) scenarioIdsRef.current.push(uid())

  const emit = (next: ConversationScenario[]) =>
    onChange(JSON.stringify({ scenarios: next }))

  const updateScenario = (i: number, field: keyof ConversationScenario, value: string | string[]) => {
    const next = scenarios.map((s, idx) => idx === i ? { ...s, [field]: value } : s)
    emit(next)
  }

  const addPhrase = (i: number, value: string) => {
    if (!value.trim()) return
    const next = scenarios.map((s, idx) =>
      idx === i ? { ...s, keyPhrases: [...s.keyPhrases, value.trim()] } : s
    )
    emit(next)
  }

  const removePhrase = (scenarioIdx: number, phraseIdx: number) => {
    const next = scenarios.map((s, idx) =>
      idx === scenarioIdx
        ? { ...s, keyPhrases: s.keyPhrases.filter((_, j) => j !== phraseIdx) }
        : s
    )
    emit(next)
  }

  const addScenario = () => {
    scenarioIdsRef.current.push(uid())
    emit([...scenarios, { setup: '', roleA: '', roleB: '', keyPhrases: [] }])
  }

  const removeScenario = (i: number) => {
    scenarioIdsRef.current.splice(i, 1)
    emit(scenarios.filter((_, idx) => idx !== i))
  }

  return (
    <div data-testid="conversation-editor">
      <div className="space-y-4">
        {scenarios.map((scenario, i) => (
          <div key={scenarioIdsRef.current[i]} className="border border-zinc-200 rounded-lg p-4 space-y-3" data-testid={`scenario-card-${i}`}>
            <div className="flex items-start justify-between gap-2">
              <p className={`${sectionHeadingClass} mt-0`}>Scenario {i + 1}</p>
              <button
                type="button"
                onClick={() => removeScenario(i)}
                className="text-zinc-400 hover:text-red-500 transition-colors text-sm shrink-0"
                aria-label="Remove scenario"
                data-testid={`scenario-remove-${i}`}
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Setup / Context</label>
              <textarea
                value={scenario.setup}
                onChange={(e) => updateScenario(i, 'setup', e.target.value)}
                rows={2}
                className="w-full resize-none text-sm border border-zinc-200 rounded p-2 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                data-testid={`scenario-setup-${i}`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Role A</label>
                <input
                  value={scenario.roleA}
                  onChange={(e) => updateScenario(i, 'roleA', e.target.value)}
                  placeholder="e.g. Waiter"
                  className={inputClass}
                  data-testid={`scenario-role-a-${i}`}
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Role B</label>
                <input
                  value={scenario.roleB}
                  onChange={(e) => updateScenario(i, 'roleB', e.target.value)}
                  placeholder="e.g. Customer"
                  className={inputClass}
                  data-testid={`scenario-role-b-${i}`}
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Key Phrases</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {scenario.keyPhrases.map((phrase, j) => (
                  <span
                    key={j}
                    className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded-full border border-indigo-200"
                    data-testid={`phrase-chip-${i}-${j}`}
                  >
                    {phrase}
                    <button
                      type="button"
                      onClick={() => removePhrase(i, j)}
                      className="text-indigo-400 hover:text-indigo-700 leading-none"
                      aria-label="Remove phrase"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  placeholder="Add a key phrase..."
                  className={`${inputClass} flex-1`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addPhrase(i, (e.target as HTMLInputElement).value)
                      ;(e.target as HTMLInputElement).value = ''
                    }
                  }}
                  data-testid={`phrase-add-${i}`}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    const input = (e.currentTarget.previousElementSibling as HTMLInputElement)
                    addPhrase(i, input.value)
                    input.value = ''
                  }}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium whitespace-nowrap"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addScenario}
        className="mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        data-testid="scenario-add"
      >
        + Add scenario
      </button>
    </div>
  )
}

// ─── Preview ─────────────────────────────────────────────────────────────────

function Preview({ parsedContent, rawContent }: PreviewProps) {
  if (!isConversationContent(parsedContent)) {
    return <pre className="text-sm whitespace-pre-wrap">{rawContent}</pre>
  }

  const { scenarios } = parsedContent as ConversationContent

  return (
    <div className="space-y-4 text-sm" data-testid="conversation-preview">
      {scenarios.map((scenario, i) => (
        <div key={i} className="border border-zinc-200 rounded-lg p-4 space-y-2">
          <p className="text-zinc-700">{scenario.setup}</p>
          <div className="flex gap-2">
            <span className="inline-block bg-indigo-100 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded">
              {scenario.roleA}
            </span>
            <span className="inline-block bg-zinc-100 text-zinc-600 text-xs font-medium px-2 py-0.5 rounded">
              {scenario.roleB}
            </span>
          </div>
          {scenario.keyPhrases.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {scenario.keyPhrases.map((phrase, j) => (
                <span
                  key={j}
                  className="bg-zinc-50 text-zinc-600 text-xs px-2 py-0.5 rounded-full border border-zinc-200"
                >
                  {phrase}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Student ─────────────────────────────────────────────────────────────────

function Student({ parsedContent, rawContent }: StudentProps) {
  if (!isConversationContent(parsedContent)) {
    return <pre className="text-sm whitespace-pre-wrap">{rawContent}</pre>
  }

  const { scenarios } = parsedContent as ConversationContent

  return (
    <div className="space-y-6 text-sm" data-testid="conversation-student">
      {scenarios.map((scenario, i) => (
        <div key={i} className="border border-zinc-200 rounded-xl overflow-hidden">
          {/* Setup callout */}
          <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">Context</p>
            <p className="text-zinc-700">{scenario.setup}</p>
          </div>

          <div className="p-4 space-y-4">
            {/* Role badges */}
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 bg-indigo-100 text-indigo-800 font-semibold text-sm px-3 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                {scenario.roleA}
              </span>
              <span className="text-zinc-300 text-xs">vs</span>
              <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 font-semibold text-sm px-3 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                {scenario.roleB}
              </span>
            </div>

            {/* Key phrases */}
            {scenario.keyPhrases.length > 0 && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400 mb-2">Key Phrases</p>
                <div className="flex flex-wrap gap-2">
                  {scenario.keyPhrases.map((phrase, j) => (
                    <span
                      key={j}
                      className="bg-white text-indigo-700 text-xs px-2.5 py-1 rounded-full border border-indigo-200 font-medium"
                    >
                      {phrase}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Export ──────────────────────────────────────────────────────────────────

export const ConversationRenderer = { Editor, Preview, Student }
