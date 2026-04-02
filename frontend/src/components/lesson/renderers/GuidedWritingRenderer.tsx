/* eslint-disable react-refresh/only-export-components */
import { useState, useRef } from 'react'
import { isGuidedWritingContent, coerceGuidedWritingContent } from '../../../types/contentTypes'
import type { GuidedWritingContent } from '../../../types/contentTypes'
import type { EditorProps, PreviewProps, StudentProps } from '../contentRegistry'
import { ContentParseError } from '../ContentParseError'
import { ContentEditorParseError } from '../ContentEditorParseError'

const inputClass = 'w-full bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded border border-zinc-200'
const textareaClass = 'w-full bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded border border-zinc-200 resize-none'

function normalize(v: unknown): GuidedWritingContent {
  const c = coerceGuidedWritingContent(v)
  if (c) return c
  return {
    situation: '',
    requiredStructures: [],
    wordCount: { min: 50, max: 100 },
    evaluationCriteria: [],
    modelAnswer: '',
    tips: [],
  }
}

// --- Editor ---

function Editor({ parsedContent, rawContent, onChange, onRegenerate, isIncomplete }: EditorProps) {
  if (!isGuidedWritingContent(parsedContent)) {
    return (
      <ContentEditorParseError
        rawContent={rawContent}
        onChange={onChange}
        onRegenerate={onRegenerate}
        isIncomplete={isIncomplete}
      />
    )
  }

  const c = normalize(parsedContent)
  const emit = (next: GuidedWritingContent) => onChange(JSON.stringify(next))

  const handleStringList = (field: 'requiredStructures' | 'evaluationCriteria' | 'tips', idx: number, value: string) => {
    const arr = [...(c[field] ?? [])]
    arr[idx] = value
    emit({ ...c, [field]: arr })
  }
  const handleAddItem = (field: 'requiredStructures' | 'evaluationCriteria' | 'tips') => {
    emit({ ...c, [field]: [...(c[field] ?? []), ''] })
  }
  const handleRemoveItem = (field: 'requiredStructures' | 'evaluationCriteria' | 'tips', idx: number) => {
    emit({ ...c, [field]: (c[field] ?? []).filter((_, i) => i !== idx) })
  }

  return (
    <div className="space-y-4" data-testid="guided-writing-editor">
      <div>
        <label className="block text-xs font-medium text-zinc-500 mb-1">Situation / Writing prompt</label>
        <textarea
          value={c.situation}
          onChange={(e) => emit({ ...c, situation: e.target.value })}
          rows={3}
          className={textareaClass}
          placeholder="Describe the writing situation for the student..."
          data-testid="guided-writing-situation"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-500 mb-1">Required structures</label>
        <div className="space-y-1">
          {c.requiredStructures.map((s, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                value={s}
                onChange={(e) => handleStringList('requiredStructures', i, e.target.value)}
                placeholder={`Structure ${i + 1}`}
                className={inputClass}
                data-testid={`guided-writing-structure-${i}`}
              />
              <button
                type="button"
                onClick={() => handleRemoveItem('requiredStructures', i)}
                className="text-zinc-400 hover:text-red-500 transition-colors px-1 shrink-0"
                aria-label="Remove structure"
              >✕</button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => handleAddItem('requiredStructures')}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            data-testid="guided-writing-add-structure"
          >+ Add structure</button>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-zinc-500 mb-1">Min words</label>
          <input
            type="number"
            value={c.wordCount.min}
            onChange={(e) => emit({ ...c, wordCount: { ...c.wordCount, min: Number(e.target.value) } })}
            className={inputClass}
            min={1}
            data-testid="guided-writing-word-min"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-zinc-500 mb-1">Max words</label>
          <input
            type="number"
            value={c.wordCount.max}
            onChange={(e) => emit({ ...c, wordCount: { ...c.wordCount, max: Number(e.target.value) } })}
            className={inputClass}
            min={1}
            data-testid="guided-writing-word-max"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-500 mb-1">Evaluation criteria</label>
        <div className="space-y-1">
          {c.evaluationCriteria.map((s, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                value={s}
                onChange={(e) => handleStringList('evaluationCriteria', i, e.target.value)}
                placeholder={`Criterion ${i + 1}`}
                className={inputClass}
                data-testid={`guided-writing-criterion-${i}`}
              />
              <button
                type="button"
                onClick={() => handleRemoveItem('evaluationCriteria', i)}
                className="text-zinc-400 hover:text-red-500 transition-colors px-1 shrink-0"
                aria-label="Remove criterion"
              >✕</button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => handleAddItem('evaluationCriteria')}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            data-testid="guided-writing-add-criterion"
          >+ Add criterion</button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-500 mb-1">Model answer</label>
        <textarea
          value={c.modelAnswer}
          onChange={(e) => emit({ ...c, modelAnswer: e.target.value })}
          rows={5}
          className={textareaClass}
          placeholder="A sample response at the target level..."
          data-testid="guided-writing-model-answer"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-500 mb-1">Tips (optional)</label>
        <div className="space-y-1">
          {(c.tips ?? []).map((s, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                value={s}
                onChange={(e) => handleStringList('tips', i, e.target.value)}
                placeholder={`Tip ${i + 1}`}
                className={inputClass}
                data-testid={`guided-writing-tip-${i}`}
              />
              <button
                type="button"
                onClick={() => handleRemoveItem('tips', i)}
                className="text-zinc-400 hover:text-red-500 transition-colors px-1 shrink-0"
                aria-label="Remove tip"
              >✕</button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => handleAddItem('tips')}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            data-testid="guided-writing-add-tip"
          >+ Add tip</button>
        </div>
      </div>
    </div>
  )
}

// --- Preview (teacher view) ---

function Preview({ parsedContent }: PreviewProps) {
  const [modelOpen, setModelOpen] = useState(true)

  if (!isGuidedWritingContent(parsedContent)) {
    return <ContentParseError context="teacher" />
  }

  const c = normalize(parsedContent)

  return (
    <div className="space-y-4" data-testid="guided-writing-preview">
      <div className="border border-zinc-200 rounded-lg p-4 space-y-3">
        <div>
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Situation</span>
          <p className="text-sm text-zinc-800 mt-1">{c.situation}</p>
        </div>

        {c.requiredStructures.length > 0 && (
          <div>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Required structures</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {c.requiredStructures.map((s, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">{s}</span>
              ))}
            </div>
          </div>
        )}

        <div>
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Word count</span>
          <p className="text-sm text-zinc-700 mt-1">{c.wordCount.min}–{c.wordCount.max} words</p>
        </div>

        {c.evaluationCriteria.length > 0 && (
          <div>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Evaluation criteria</span>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              {c.evaluationCriteria.map((cr, i) => (
                <li key={i} className="text-sm text-zinc-700">{cr}</li>
              ))}
            </ul>
          </div>
        )}

        {(c.tips ?? []).length > 0 && (
          <div>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Tips</span>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              {(c.tips ?? []).map((tip, i) => (
                <li key={i} className="text-sm text-zinc-600 italic">{tip}</li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <button
            type="button"
            className="text-xs font-semibold text-zinc-500 uppercase tracking-wide flex items-center gap-1 hover:text-zinc-700 transition-colors"
            onClick={() => setModelOpen((v) => !v)}
            data-testid="guided-writing-toggle-model"
          >
            Model answer {modelOpen ? '▲' : '▼'}
          </button>
          {modelOpen && (
            <p className="text-sm text-zinc-700 mt-2 whitespace-pre-wrap bg-zinc-50 rounded p-2" data-testid="guided-writing-model-answer-preview">
              {c.modelAnswer}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// --- Student view ---

function Student({ parsedContent }: StudentProps) {
  const [text, setText] = useState('')
  const [tipsOpen, setTipsOpen] = useState(false)
  const [modelRevealed, setModelRevealed] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  if (!isGuidedWritingContent(parsedContent)) {
    return <ContentParseError context="student" />
  }

  const c = normalize(parsedContent)
  const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length
  const withinRange = wordCount >= c.wordCount.min && wordCount <= c.wordCount.max

  return (
    <div className="space-y-4" data-testid="guided-writing-student">
      <div className="border border-zinc-200 rounded-lg p-4 space-y-3">
        <div>
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Your task</span>
          <p className="text-sm text-zinc-800 mt-1">{c.situation}</p>
        </div>

        {c.requiredStructures.length > 0 && (
          <div>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">You must use</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {c.requiredStructures.map((s, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">{s}</span>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Target:</span>
          <span className="text-xs text-zinc-600">{c.wordCount.min}–{c.wordCount.max} words</span>
        </div>

        {(c.tips ?? []).length > 0 && (
          <div>
            <button
              type="button"
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              onClick={() => setTipsOpen((v) => !v)}
              data-testid="guided-writing-tips-toggle"
            >
              {tipsOpen ? 'Hide tips' : 'Show tips'}
            </button>
            {tipsOpen && (
              <ul className="list-disc list-inside mt-2 space-y-0.5" data-testid="guided-writing-tips">
                {(c.tips ?? []).map((tip, i) => (
                  <li key={i} className="text-sm text-zinc-600 italic">{tip}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          className={`${textareaClass} leading-relaxed`}
          placeholder="Write your response here..."
          data-testid="guided-writing-textarea"
        />
        <div className="flex justify-end mt-1">
          <span
            className={`text-xs font-medium ${withinRange ? 'text-green-600' : 'text-zinc-400'}`}
            data-testid="guided-writing-word-count"
          >
            {wordCount} / {c.wordCount.min}–{c.wordCount.max} words
          </span>
        </div>
      </div>

      <div>
        <button
          type="button"
          className="text-xs text-zinc-400 hover:text-zinc-600 font-medium"
          onClick={() => setModelRevealed((v) => !v)}
          data-testid="guided-writing-reveal-model"
        >
          {modelRevealed ? 'Hide model answer' : 'Reveal model answer'}
        </button>
        {modelRevealed && (
          <div className="mt-2 p-3 rounded bg-zinc-50 border border-zinc-200" data-testid="guided-writing-model-revealed">
            <p className="text-sm text-zinc-700 whitespace-pre-wrap">{c.modelAnswer}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export const GuidedWritingRenderer = { Editor, Preview, Student, coerce: coerceGuidedWritingContent }
