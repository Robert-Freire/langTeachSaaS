import { useState, useEffect, useCallback } from 'react'
import { isVocabularyContent } from '../../../types/contentTypes'
import type { VocabularyItem } from '../../../types/contentTypes'
import type { EditorProps, PreviewProps, StudentProps } from '../contentRegistry'

const TABLE_HEADERS = ['Word', 'Definition', 'Example', 'Translation']

function VocabTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto" data-testid="vocabulary-table">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-zinc-50">
            {TABLE_HEADERS.map(h => (
              <th key={h} className="border border-zinc-200 px-3 py-2 text-left font-medium text-zinc-600">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

const inputClass = 'w-full bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded'

function Editor({ parsedContent, rawContent, onChange }: EditorProps) {
  if (!isVocabularyContent(parsedContent)) {
    return (
      <textarea
        value={rawContent}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        className="w-full resize-none text-sm border rounded p-2"
      />
    )
  }

  const items = parsedContent.items
  const emit = (newItems: VocabularyItem[]) => onChange(JSON.stringify({ items: newItems }))

  const handleCellChange = (index: number, field: keyof VocabularyItem, value: string) => {
    const newItems = items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    emit(newItems)
  }

  const handleAdd = () => {
    emit([...items, { word: '', definition: '', exampleSentence: '', translation: '' }])
  }

  const handleRemove = (index: number) => {
    emit(items.filter((_, i) => i !== index))
  }

  return (
    <div>
      <div className="overflow-x-auto" data-testid="vocabulary-table">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-zinc-50">
              {TABLE_HEADERS.map(h => (
                <th key={h} className="border border-zinc-200 px-3 py-2 text-left font-medium text-zinc-600">{h}</th>
              ))}
              <th className="border border-zinc-200 px-3 py-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="hover:bg-zinc-50">
                <td className="border border-zinc-200 p-1">
                  <input value={item.word} onChange={(e) => handleCellChange(i, 'word', e.target.value)} className={inputClass} />
                </td>
                <td className="border border-zinc-200 p-1">
                  <input value={item.definition} onChange={(e) => handleCellChange(i, 'definition', e.target.value)} className={inputClass} />
                </td>
                <td className="border border-zinc-200 p-1">
                  <input value={item.exampleSentence ?? ''} onChange={(e) => handleCellChange(i, 'exampleSentence', e.target.value)} className={inputClass} />
                </td>
                <td className="border border-zinc-200 p-1">
                  <input value={item.translation ?? ''} onChange={(e) => handleCellChange(i, 'translation', e.target.value)} className={inputClass} />
                </td>
                <td className="border border-zinc-200 p-1 text-center">
                  <button
                    onClick={() => handleRemove(i)}
                    className="text-zinc-400 hover:text-red-500 transition-colors px-1"
                    title="Remove word"
                    data-testid={`vocab-remove-${i}`}
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
        onClick={handleAdd}
        className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        data-testid="vocab-add-word"
      >
        + Add word
      </button>
    </div>
  )
}

function Preview({ parsedContent, rawContent }: PreviewProps) {
  if (!isVocabularyContent(parsedContent)) {
    return <pre className="text-sm whitespace-pre-wrap">{rawContent}</pre>
  }

  return (
    <VocabTable>
      {parsedContent.items.map((item, i) => (
        <tr key={i} className="hover:bg-zinc-50">
          <td className="border border-zinc-200 px-3 py-2 font-medium">{item.word}</td>
          <td className="border border-zinc-200 px-3 py-2">{item.definition}</td>
          <td className="border border-zinc-200 px-3 py-2 italic text-zinc-600">{item.exampleSentence}</td>
          <td className="border border-zinc-200 px-3 py-2 text-zinc-500">{item.translation}</td>
        </tr>
      ))}
    </VocabTable>
  )
}

function Student({ parsedContent, rawContent }: StudentProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  const isVocab = isVocabularyContent(parsedContent)
  const items = isVocab ? parsedContent.items : []
  const safeIndex = Math.min(currentIndex, Math.max(0, items.length - 1))
  const item = items[safeIndex]

  const flip = useCallback(() => setFlipped(f => !f), [])
  const prev = useCallback(() => {
    setFlipped(false)
    setCurrentIndex(i => Math.max(0, i - 1))
  }, [])
  const next = useCallback(() => {
    setFlipped(false)
    setCurrentIndex(i => Math.min(items.length - 1, i + 1))
  }, [items.length])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [prev, next, flip])

  if (!isVocab) {
    return <pre className="text-sm whitespace-pre-wrap">{rawContent}</pre>
  }

  if (items.length === 0) {
    return <p className="text-sm text-zinc-500 italic">No vocabulary items yet.</p>
  }

  return (
    <div className="flex flex-col items-center gap-4 py-4" data-testid="flashcard-container">
      <div className="text-sm text-zinc-500" data-testid="flashcard-progress">
        {safeIndex + 1} / {items.length}
      </div>

      <div
        className="w-full max-w-md cursor-pointer"
        style={{ perspective: '800px' }}
        onClick={flip}
        data-testid="flashcard-card"
      >
        <div
          className="relative w-full transition-transform duration-500"
          style={{
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            minHeight: '200px',
          }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 flex items-center justify-center rounded-xl border-2 border-indigo-200 bg-white shadow-md p-6"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <span className="text-2xl font-semibold text-zinc-800" data-testid="flashcard-word">
              {item.word}
            </span>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-xl border-2 border-indigo-200 bg-indigo-50 shadow-md p-6 gap-2"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <p className="text-lg font-medium text-zinc-800" data-testid="flashcard-definition">
              {item.definition}
            </p>
            {item.exampleSentence && (
              <p className="text-sm italic text-zinc-600">"{item.exampleSentence}"</p>
            )}
            {item.translation && (
              <p className="text-sm text-indigo-600 font-medium">{item.translation}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={prev}
          disabled={safeIndex === 0}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          data-testid="flashcard-prev"
        >
          ← Previous
        </button>
        <button
          onClick={next}
          disabled={safeIndex === items.length - 1}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          data-testid="flashcard-next"
        >
          Next →
        </button>
      </div>
    </div>
  )
}

export const VocabularyRenderer = { Editor, Preview, Student }
