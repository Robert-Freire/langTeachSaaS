import { isGrammarContent } from '../../../types/contentTypes'
import type { GrammarExample } from '../../../types/contentTypes'
import type { EditorProps, PreviewProps, StudentProps } from '../contentRegistry'

const inputClass = 'w-full bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded border border-zinc-200'
const textareaClass = 'w-full bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded border border-zinc-200 resize-none'

function Editor({ parsedContent, rawContent, onChange }: EditorProps) {
  if (!isGrammarContent(parsedContent)) {
    return (
      <textarea
        value={rawContent}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        className="w-full resize-none text-sm border rounded p-2"
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
    </div>
  )
}

function Preview({ parsedContent, rawContent }: PreviewProps) {
  if (!isGrammarContent(parsedContent)) {
    return <pre className="text-sm whitespace-pre-wrap">{rawContent}</pre>
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
    </div>
  )
}

function Student({ parsedContent, rawContent }: StudentProps) {
  if (!isGrammarContent(parsedContent)) {
    return <pre className="text-sm whitespace-pre-wrap">{rawContent}</pre>
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
    </div>
  )
}

export const GrammarRenderer = { Editor, Preview, Student }
