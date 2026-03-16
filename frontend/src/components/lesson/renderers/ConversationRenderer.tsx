import { useRef, useState } from 'react'
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
  const [phraseInputs, setPhraseInputs] = useState<string[]>([])

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

  // Keep phraseInputs in sync with scenarios count
  const inputs = phraseInputs.length === scenarios.length
    ? phraseInputs
    : Array(scenarios.length).fill('')

  const setPhraseInput = (i: number, value: string) => {
    const next = [...inputs]
    next[i] = value
    setPhraseInputs(next)
  }

  const emit = (next: ConversationScenario[]) =>
    onChange(JSON.stringify({ scenarios: next }))

  const updateScenario = (i: number, field: keyof ConversationScenario, value: string | string[]) => {
    const next = scenarios.map((s, idx) => idx === i ? { ...s, [field]: value } : s)
    emit(next)
  }

  const addPhrase = (i: number) => {
    const value = inputs[i] ?? ''
    if (!value.trim()) return
    const next = scenarios.map((s, idx) =>
      idx === i ? { ...s, keyPhrases: [...s.keyPhrases, value.trim()] } : s
    )
    setPhraseInput(i, '')
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
    setPhraseInputs([...inputs, ''])
    emit([...scenarios, { setup: '', roleA: '', roleB: '', keyPhrases: [] }])
  }

  const removeScenario = (i: number) => {
    scenarioIdsRef.current.splice(i, 1)
    setPhraseInputs(inputs.filter((_, idx) => idx !== i))
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
                  value={inputs[i] ?? ''}
                  onChange={(e) => setPhraseInput(i, e.target.value)}
                  placeholder="Add a key phrase..."
                  className={`${inputClass} flex-1`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addPhrase(i)
                    }
                  }}
                  data-testid={`phrase-add-${i}`}
                />
                <button
                  type="button"
                  onClick={() => addPhrase(i)}
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

function ScenarioCard({ scenario, index }: { scenario: ConversationScenario; index: number }) {
  const [selectedRole, setSelectedRole] = useState<'A' | 'B' | null>(null)
  const [checkedPhrases, setCheckedPhrases] = useState<Set<number>>(new Set())

  const toggleRole = (role: 'A' | 'B') =>
    setSelectedRole(prev => (prev === role ? null : role))

  const togglePhrase = (j: number) =>
    setCheckedPhrases(prev => {
      const next = new Set(prev)
      next.has(j) ? next.delete(j) : next.add(j)
      return next
    })

  const roleClass = (role: 'A' | 'B') => {
    if (selectedRole === null)
      return role === 'A'
        ? 'bg-indigo-100 text-indigo-800'
        : 'bg-slate-100 text-slate-700'
    if (selectedRole === role)
      return 'bg-indigo-500 text-white ring-2 ring-indigo-300'
    return 'bg-zinc-100 text-zinc-400'
  }

  const dotClass = (role: 'A' | 'B') => {
    if (selectedRole === role) return 'bg-white'
    return role === 'A' ? 'bg-indigo-500' : 'bg-slate-400'
  }

  return (
    <div className="border border-zinc-200 rounded-xl overflow-hidden">
      {/* Setup callout */}
      <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">Context</p>
        <p className="text-zinc-700">{scenario.setup}</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Role selection */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => toggleRole('A')}
            className={`inline-flex items-center gap-1.5 font-semibold text-sm px-3 py-1 rounded-full transition-all ${roleClass('A')}`}
            data-testid={`student-role-a-${index}`}
          >
            <span className={`w-2 h-2 rounded-full inline-block ${dotClass('A')}`} />
            {scenario.roleA}
            {selectedRole === 'A' && <span className="ml-1 text-xs font-bold">(You)</span>}
            {selectedRole === 'B' && <span className="ml-1 text-xs">(Partner)</span>}
          </button>
          <span className="text-zinc-300 text-xs">vs</span>
          <button
            type="button"
            onClick={() => toggleRole('B')}
            className={`inline-flex items-center gap-1.5 font-semibold text-sm px-3 py-1 rounded-full transition-all ${roleClass('B')}`}
            data-testid={`student-role-b-${index}`}
          >
            <span className={`w-2 h-2 rounded-full inline-block ${dotClass('B')}`} />
            {scenario.roleB}
            {selectedRole === 'B' && <span className="ml-1 text-xs font-bold">(You)</span>}
            {selectedRole === 'A' && <span className="ml-1 text-xs">(Partner)</span>}
          </button>
        </div>

        {/* Key phrases checklist */}
        {scenario.keyPhrases.length > 0 && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400 mb-2">Key Phrases</p>
            <div className="flex flex-wrap gap-2">
              {scenario.keyPhrases.map((phrase, j) => {
                const checked = checkedPhrases.has(j)
                return (
                  <button
                    key={j}
                    type="button"
                    onClick={() => togglePhrase(j)}
                    className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
                      checked
                        ? 'bg-indigo-200 text-indigo-400 border-indigo-200 line-through'
                        : 'bg-white text-indigo-700 border-indigo-200'
                    }`}
                    data-testid={`student-phrase-chip-${index}-${j}`}
                  >
                    {checked && <span className="mr-1">✓</span>}
                    {phrase}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Student({ parsedContent, rawContent }: StudentProps) {
  if (!isConversationContent(parsedContent)) {
    return <pre className="text-sm whitespace-pre-wrap">{rawContent}</pre>
  }

  const { scenarios } = parsedContent as ConversationContent

  return (
    <div className="space-y-6 text-sm" data-testid="conversation-student">
      {/* Activity instruction */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 text-sm text-indigo-800">
        <span className="font-semibold">Practice with a partner:</span> Choose a role, read the context, and have a conversation using the key phrases below.
      </div>

      {scenarios.map((scenario, i) => (
        <ScenarioCard key={i} scenario={scenario} index={i} />
      ))}
    </div>
  )
}

// ─── Export ──────────────────────────────────────────────────────────────────

export const ConversationRenderer = { Editor, Preview, Student }
