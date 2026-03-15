import { isVocabularyContent } from '../../../types/contentTypes'
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
  const handleCellChange = (index: number, field: 'word' | 'definition' | 'exampleSentence' | 'translation', value: string) => {
    const newItems = items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    onChange(JSON.stringify({ items: newItems }))
  }

  return (
    <VocabTable>
      {items.map((item, i) => (
        <tr key={i} className="hover:bg-zinc-50">
          <td className="border border-zinc-200 p-1">
            <input
              value={item.word}
              onChange={(e) => handleCellChange(i, 'word', e.target.value)}
              className="w-full bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded"
            />
          </td>
          <td className="border border-zinc-200 p-1">
            <input
              value={item.definition}
              onChange={(e) => handleCellChange(i, 'definition', e.target.value)}
              className="w-full bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded"
            />
          </td>
          <td className="border border-zinc-200 p-1">
            <input
              value={item.exampleSentence ?? ''}
              onChange={(e) => handleCellChange(i, 'exampleSentence', e.target.value)}
              className="w-full bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded"
            />
          </td>
          <td className="border border-zinc-200 p-1">
            <input
              value={item.translation ?? ''}
              onChange={(e) => handleCellChange(i, 'translation', e.target.value)}
              className="w-full bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded"
            />
          </td>
        </tr>
      ))}
    </VocabTable>
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

function Student(props: StudentProps) {
  return <Preview {...props} />
}

export const VocabularyRenderer = { Editor, Preview, Student }
