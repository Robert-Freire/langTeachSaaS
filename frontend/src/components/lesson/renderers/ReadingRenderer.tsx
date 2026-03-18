import { isReadingContent } from '../../../types/contentTypes'
import type { ReadingContent, ReadingQuestion, ReadingVocabHighlight } from '../../../types/contentTypes'
import type { EditorProps, PreviewProps, StudentProps } from '../contentRegistry'

const inputClass = 'w-full bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded border border-zinc-200'
const textareaClass = 'w-full bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded border border-zinc-200 resize-none'

function getReadingContent(value: unknown): ReadingContent | null {
  if (!isReadingContent(value)) return null
  if (
    typeof value.passage !== 'string' ||
    !Array.isArray(value.comprehensionQuestions) ||
    !Array.isArray(value.vocabularyHighlights)
  ) {
    return null
  }
  return value
}

function Editor({ parsedContent: raw, rawContent, onChange }: EditorProps) {
  const parsedContent = getReadingContent(raw)
  if (!parsedContent) {
    return (
      <textarea
        value={rawContent}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        className="w-full resize-none text-sm border rounded p-2"
      />
    )
  }

  const emit = (updated: ReadingContent) => onChange(JSON.stringify(updated))

  const handleQuestionChange = (index: number, field: keyof ReadingQuestion, value: string) => {
    const newQuestions = parsedContent.comprehensionQuestions.map((q, i) =>
      i === index ? { ...q, [field]: value } : q
    )
    emit({ ...parsedContent, comprehensionQuestions: newQuestions })
  }

  const handleAddQuestion = () => {
    emit({
      ...parsedContent,
      comprehensionQuestions: [...parsedContent.comprehensionQuestions, { question: '', answer: '', type: 'detail' }],
    })
  }

  const handleRemoveQuestion = (index: number) => {
    emit({
      ...parsedContent,
      comprehensionQuestions: parsedContent.comprehensionQuestions.filter((_, i) => i !== index),
    })
  }

  const handleHighlightChange = (index: number, field: keyof ReadingVocabHighlight, value: string) => {
    const newHighlights = parsedContent.vocabularyHighlights.map((h, i) =>
      i === index ? { ...h, [field]: value } : h
    )
    emit({ ...parsedContent, vocabularyHighlights: newHighlights })
  }

  const handleAddHighlight = () => {
    emit({
      ...parsedContent,
      vocabularyHighlights: [...parsedContent.vocabularyHighlights, { word: '', definition: '' }],
    })
  }

  const handleRemoveHighlight = (index: number) => {
    emit({
      ...parsedContent,
      vocabularyHighlights: parsedContent.vocabularyHighlights.filter((_, i) => i !== index),
    })
  }

  return (
    <div className="space-y-4" data-testid="reading-editor">
      <div>
        <label className="block text-xs font-medium text-zinc-500 mb-1">Passage</label>
        <textarea
          value={parsedContent.passage}
          onChange={(e) => emit({ ...parsedContent, passage: e.target.value })}
          rows={6}
          className={textareaClass}
          data-testid="reading-passage-input"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-500 mb-1">Comprehension Questions</label>
        <div className="space-y-2">
          {parsedContent.comprehensionQuestions.map((q, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex-1 space-y-1">
                <input
                  value={q.question}
                  onChange={(e) => handleQuestionChange(i, 'question', e.target.value)}
                  placeholder="Question"
                  className={inputClass}
                  data-testid={`reading-question-${i}`}
                />
                <input
                  value={q.answer}
                  onChange={(e) => handleQuestionChange(i, 'answer', e.target.value)}
                  placeholder="Answer"
                  className={inputClass}
                  data-testid={`reading-question-answer-${i}`}
                />
              </div>
              <button
                type="button"
                onClick={() => handleRemoveQuestion(i)}
                className="text-zinc-400 hover:text-red-500 transition-colors px-1 mt-1"
                aria-label="Remove question"
                data-testid={`reading-remove-question-${i}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={handleAddQuestion}
          className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          data-testid="reading-add-question"
        >
          + Add question
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-500 mb-1">Vocabulary Highlights</label>
        <div className="space-y-2">
          {parsedContent.vocabularyHighlights.map((h, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex-1 space-y-1">
                <input
                  value={h.word}
                  onChange={(e) => handleHighlightChange(i, 'word', e.target.value)}
                  placeholder="Word"
                  className={inputClass}
                  data-testid={`reading-highlight-word-${i}`}
                />
                <input
                  value={h.definition}
                  onChange={(e) => handleHighlightChange(i, 'definition', e.target.value)}
                  placeholder="Definition"
                  className={inputClass}
                  data-testid={`reading-highlight-def-${i}`}
                />
              </div>
              <button
                type="button"
                onClick={() => handleRemoveHighlight(i)}
                className="text-zinc-400 hover:text-red-500 transition-colors px-1 mt-1"
                aria-label="Remove highlight"
                data-testid={`reading-remove-highlight-${i}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={handleAddHighlight}
          className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          data-testid="reading-add-highlight"
        >
          + Add highlight
        </button>
      </div>
    </div>
  )
}

function Preview({ parsedContent: raw, rawContent }: PreviewProps) {
  const parsedContent = getReadingContent(raw)
  if (!parsedContent) {
    return <pre className="text-sm whitespace-pre-wrap">{rawContent}</pre>
  }

  return (
    <div className="space-y-4" data-testid="reading-preview">
      <div className="text-sm text-zinc-700 space-y-2">
        {parsedContent.passage.split('\n').map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {parsedContent.comprehensionQuestions.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-zinc-500 mb-2">Comprehension Questions</h4>
          <ol className="list-decimal list-inside space-y-2">
            {parsedContent.comprehensionQuestions.map((q, i) => (
              <li key={i} className="text-sm">
                <span className="font-medium text-zinc-800">{q.question}</span>
                <span className="block ml-5 text-xs text-zinc-500 mt-0.5">Answer: {q.answer}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {parsedContent.vocabularyHighlights.length > 0 && (
        <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3">
          <p className="text-xs font-semibold text-blue-700 mb-1">Vocabulary</p>
          <dl className="space-y-1">
            {parsedContent.vocabularyHighlights.map((h, i) => (
              <div key={i} className="text-sm">
                <dt className="inline font-medium text-blue-800">{h.word}</dt>
                <dd className="inline text-blue-700"> — {h.definition}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  )
}

function Student({ parsedContent: raw, rawContent }: StudentProps) {
  const parsedContent = getReadingContent(raw)
  if (!parsedContent) {
    return <pre className="text-sm whitespace-pre-wrap">{rawContent}</pre>
  }

  return (
    <div className="space-y-4" data-testid="reading-student">
      <div className="text-sm text-zinc-700 space-y-2">
        {parsedContent.passage.split('\n').map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {parsedContent.comprehensionQuestions.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-zinc-700 mb-2">Comprehension Questions</h4>
          <ol className="list-decimal list-inside space-y-3">
            {parsedContent.comprehensionQuestions.map((q, i) => (
              <li key={i} className="text-sm font-medium text-zinc-800">{q.question}</li>
            ))}
          </ol>
        </div>
      )}

      {parsedContent.vocabularyHighlights.length > 0 && (
        <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3">
          <p className="text-sm font-semibold text-blue-700 mb-1">Key Vocabulary</p>
          <dl className="space-y-1">
            {parsedContent.vocabularyHighlights.map((h, i) => (
              <div key={i} className="text-sm">
                <dt className="inline font-medium text-blue-800">{h.word}</dt>
                <dd className="inline text-blue-700"> — {h.definition}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  )
}

export const ReadingRenderer = { Editor, Preview, Student }
