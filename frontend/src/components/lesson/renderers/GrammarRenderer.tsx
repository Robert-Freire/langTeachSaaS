/* eslint-disable react-refresh/only-export-components */
import { useState } from 'react'
import { isGrammarContent, coerceGrammarContent } from '../../../types/contentTypes'
import type { GrammarExample, L1ContrastiveNote } from '../../../types/contentTypes'
import type { EditorProps, PreviewProps, StudentProps } from '../contentRegistry'
import { ContentParseError } from '../ContentParseError'
import { ContentEditorParseError } from '../ContentEditorParseError'

const inputClass = 'w-full bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded border border-zinc-200'
const textareaClass = 'w-full bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded border border-zinc-200 resize-none'

function Editor({ parsedContent, rawContent, onChange, onRegenerate, isIncomplete }: EditorProps) {
  const [l1NoteExpanded, setL1NoteExpanded] = useState(
    parsedContent != null && isGrammarContent(parsedContent) && parsedContent.l1ContrastiveNote != null
  )

  if (!isGrammarContent(parsedContent)) {
    return (
      <ContentEditorParseError
        rawContent={rawContent}
        onChange={onChange}
        onRegenerate={onRegenerate}
        isIncomplete={isIncomplete}
      />
    )
  }

  const emit = (updated: typeof parsedContent) => onChange(JSON.stringify(updated))

  const handleExampleChange = (index: number, field: keyof GrammarExample, value: string) => {
    const newExamples = parsedContent.examples.map((ex, i) =>
      i === index ? { ...ex, [field]: value } : ex
    )
    emit({ ...parsedContent, examples: newExamples })
  }

  const handleAddExample = () => {
    emit({ ...parsedContent, examples: [...parsedContent.examples, { sentence: '', note: '' }] })
  }

  const handleRemoveExample = (index: number) => {
    emit({ ...parsedContent, examples: parsedContent.examples.filter((_, i) => i !== index) })
  }

  const handleMistakeChange = (index: number, value: string) => {
    const newMistakes = parsedContent.commonMistakes.map((m, i) => i === index ? value : m)
    emit({ ...parsedContent, commonMistakes: newMistakes })
  }

  const handleAddMistake = () => {
    emit({ ...parsedContent, commonMistakes: [...parsedContent.commonMistakes, ''] })
  }

  const handleRemoveMistake = (index: number) => {
    emit({ ...parsedContent, commonMistakes: parsedContent.commonMistakes.filter((_, i) => i !== index) })
  }

  const handleL1NoteChange = (field: keyof L1ContrastiveNote, value: string) => {
    const current = parsedContent.l1ContrastiveNote ?? { l1Example: '', targetExample: '', explanation: '', interferencePattern: '' }
    emit({ ...parsedContent, l1ContrastiveNote: { ...current, [field]: value } })
  }

  const handleRemoveL1Note = () => {
    emit({ title: parsedContent.title, explanation: parsedContent.explanation, examples: parsedContent.examples, commonMistakes: parsedContent.commonMistakes })
    setL1NoteExpanded(false)
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-zinc-500 mb-1">Title</label>
        <input
          value={parsedContent.title}
          onChange={(e) => emit({ ...parsedContent, title: e.target.value })}
          className={inputClass}
          data-testid="grammar-title-input"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-500 mb-1">Explanation</label>
        <textarea
          value={parsedContent.explanation}
          onChange={(e) => emit({ ...parsedContent, explanation: e.target.value })}
          rows={4}
          className={textareaClass}
          data-testid="grammar-explanation-input"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-500 mb-1">Examples</label>
        <div className="space-y-2">
          {parsedContent.examples.map((ex, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex-1 space-y-1">
                <input
                  value={ex.sentence}
                  onChange={(e) => handleExampleChange(i, 'sentence', e.target.value)}
                  placeholder="Sentence"
                  className={inputClass}
                  data-testid={`grammar-example-sentence-${i}`}
                />
                <input
                  value={ex.note ?? ''}
                  onChange={(e) => handleExampleChange(i, 'note', e.target.value)}
                  placeholder="Note (optional)"
                  className={inputClass}
                  data-testid={`grammar-example-note-${i}`}
                />
              </div>
              <button
                type="button"
                onClick={() => handleRemoveExample(i)}
                className="text-zinc-400 hover:text-red-500 transition-colors px-1 mt-1"
                aria-label="Remove example"
                data-testid={`grammar-remove-example-${i}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={handleAddExample}
          className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          data-testid="grammar-add-example"
        >
          + Add example
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-500 mb-1">Common Mistakes</label>
        <div className="space-y-2">
          {parsedContent.commonMistakes.map((mistake, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                value={mistake}
                onChange={(e) => handleMistakeChange(i, e.target.value)}
                placeholder="Common mistake"
                className={inputClass}
                data-testid={`grammar-mistake-input-${i}`}
              />
              <button
                type="button"
                onClick={() => handleRemoveMistake(i)}
                className="text-zinc-400 hover:text-red-500 transition-colors px-1"
                aria-label="Remove mistake"
                data-testid={`grammar-remove-mistake-${i}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={handleAddMistake}
          className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          data-testid="grammar-add-mistake"
        >
          + Add mistake
        </button>
      </div>

      <div className="border border-blue-200 rounded-md">
        <button
          type="button"
          onClick={() => setL1NoteExpanded(!l1NoteExpanded)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
          data-testid="grammar-l1-note-toggle"
        >
          <span>L1 Comparison Note</span>
          <span>{l1NoteExpanded ? '▲' : '▼'}</span>
        </button>
        {l1NoteExpanded && (
          <div className="px-3 pb-3 space-y-2" data-testid="grammar-l1-note-editor">
            <input
              value={parsedContent.l1ContrastiveNote?.l1Example ?? ''}
              onChange={(e) => handleL1NoteChange('l1Example', e.target.value)}
              placeholder="L1 example (e.g. 'Sono stanco' in Italian)"
              className={inputClass}
              data-testid="grammar-l1-example-input"
            />
            <input
              value={parsedContent.l1ContrastiveNote?.targetExample ?? ''}
              onChange={(e) => handleL1NoteChange('targetExample', e.target.value)}
              placeholder="Spanish equivalent (e.g. 'Estoy cansado')"
              className={inputClass}
              data-testid="grammar-l1-target-input"
            />
            <textarea
              value={parsedContent.l1ContrastiveNote?.explanation ?? ''}
              onChange={(e) => handleL1NoteChange('explanation', e.target.value)}
              placeholder="Why they differ"
              rows={2}
              className={textareaClass}
              data-testid="grammar-l1-explanation-input"
            />
            <input
              value={parsedContent.l1ContrastiveNote?.interferencePattern ?? ''}
              onChange={(e) => handleL1NoteChange('interferencePattern', e.target.value)}
              placeholder="Interference pattern (e.g. 'ser-estar')"
              className={inputClass}
              data-testid="grammar-l1-pattern-input"
            />
            <button
              type="button"
              onClick={handleRemoveL1Note}
              className="text-xs text-red-500 hover:text-red-700"
              data-testid="grammar-l1-note-remove"
            >
              Remove L1 note
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Preview({ parsedContent }: PreviewProps) {
  if (!isGrammarContent(parsedContent)) {
    return <ContentParseError context="teacher" />
  }

  return (
    <div className="space-y-4" data-testid="grammar-preview">
      <h3 className="text-base font-semibold text-zinc-800">{parsedContent.title}</h3>
      <div className="text-sm text-zinc-700 space-y-2">
        {parsedContent.explanation.split('\n').map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      {parsedContent.examples.length > 0 && (
        <ul className="space-y-2">
          {parsedContent.examples.map((ex, i) => (
            <li key={i} className="text-sm">
              <span className="font-medium text-zinc-800">{ex.sentence}</span>
              {ex.note && <span className="block text-xs italic text-zinc-500 mt-0.5">{ex.note}</span>}
            </li>
          ))}
        </ul>
      )}
      {parsedContent.commonMistakes.length > 0 && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3">
          <p className="text-xs font-semibold text-amber-700 mb-1">Common Mistakes</p>
          <ul className="list-disc list-inside space-y-1">
            {parsedContent.commonMistakes.map((m, i) => (
              <li key={i} className="text-sm text-amber-800">{m}</li>
            ))}
          </ul>
        </div>
      )}
      {parsedContent.l1ContrastiveNote && (
        <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3" data-testid="grammar-preview-l1-note">
          <p className="text-xs font-semibold text-blue-700 mb-2">L1 Comparison Note</p>
          <div className="space-y-1 text-sm text-blue-900">
            <p><span className="font-medium">L1:</span> {parsedContent.l1ContrastiveNote.l1Example}</p>
            <p><span className="font-medium">Spanish:</span> {parsedContent.l1ContrastiveNote.targetExample}</p>
            <p className="text-xs text-blue-700 mt-1">{parsedContent.l1ContrastiveNote.explanation}</p>
            <p className="text-xs text-blue-500 italic">Pattern: {parsedContent.l1ContrastiveNote.interferencePattern}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function Student({ parsedContent }: StudentProps) {
  if (!isGrammarContent(parsedContent)) {
    return <ContentParseError context="student" />
  }

  return (
    <div className="space-y-4" data-testid="grammar-student">
      <h3 className="text-base font-semibold text-zinc-800">{parsedContent.title}</h3>
      <div className="text-sm text-zinc-700 space-y-2">
        {parsedContent.explanation.split('\n').map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      {parsedContent.examples.length > 0 && (
        <ol className="list-decimal list-inside space-y-3">
          {parsedContent.examples.map((ex, i) => (
            <li key={i} className="text-sm">
              <span className="font-medium text-zinc-800">{ex.sentence}</span>
              {ex.note && <span className="block ml-5 text-xs italic text-zinc-500 mt-0.5">{ex.note}</span>}
            </li>
          ))}
        </ol>
      )}
      {parsedContent.commonMistakes.length > 0 && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3">
          <p className="text-sm font-semibold text-amber-700 mb-1">Watch out!</p>
          <ul className="list-disc list-inside space-y-1">
            {parsedContent.commonMistakes.map((m, i) => (
              <li key={i} className="text-sm text-amber-800">{m}</li>
            ))}
          </ul>
        </div>
      )}
      {parsedContent.l1ContrastiveNote && (
        <div className="rounded-md bg-blue-50 border-l-4 border-blue-400 px-4 py-3" data-testid="grammar-student-l1-note">
          <p className="text-sm font-semibold text-blue-800 mb-2">In your language vs. Spanish</p>
          <div className="space-y-2 text-sm">
            <div className="flex gap-2 items-start">
              <span className="text-xs font-medium text-blue-600 w-16 shrink-0 pt-0.5">Your L1:</span>
              <span className="text-blue-900 font-medium">{parsedContent.l1ContrastiveNote.l1Example}</span>
            </div>
            <div className="flex gap-2 items-start">
              <span className="text-xs font-medium text-blue-600 w-16 shrink-0 pt-0.5">Spanish:</span>
              <span className="text-blue-900 font-medium">{parsedContent.l1ContrastiveNote.targetExample}</span>
            </div>
            <p className="text-xs text-blue-700 mt-1">{parsedContent.l1ContrastiveNote.explanation}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export const GrammarRenderer = { Editor, Preview, Student, coerce: coerceGrammarContent }
