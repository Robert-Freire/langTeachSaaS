import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getStudyLesson } from '../api/lessons'
import { getRenderer } from '../components/lesson/contentRegistry'

export default function StudyView() {
  const { id } = useParams<{ id: string }>()

  const { data: lesson, isLoading, isError } = useQuery({
    queryKey: ['study-lesson', id],
    queryFn: () => getStudyLesson(id!),
    enabled: !!id,
  })

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-sm text-zinc-500">Loading...</div>
  }
  if (isError || !lesson) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-sm text-red-600">
          Lesson not found. <Link to="/lessons" className="underline">Go back</Link>
        </span>
      </div>
    )
  }

  return (
    <>
      <div className="sticky top-0 z-10 bg-zinc-50 border-b border-zinc-200 px-4 py-2 flex items-center justify-between">
        <Link
          to={`/lessons/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to editor
        </Link>
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Preview</span>
      </div>
      <div className="max-w-2xl mx-auto space-y-8 py-8 px-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-zinc-900" data-testid="study-title">{lesson.title}</h1>
        <p className="text-sm text-zinc-500">{lesson.language} · {lesson.cefrLevel} · {lesson.topic}</p>
      </div>

      {lesson.sections.map((section) => (
        <div key={section.id} className="space-y-3">
          <h2 className="text-base font-semibold text-zinc-700 border-b border-zinc-100 pb-2">
            {section.sectionType.replace(/([A-Z])/g, ' $1').trim()}
          </h2>
          {section.notes && (
            <p className="text-sm text-zinc-600">{section.notes}</p>
          )}
          {section.blocks.map((block) => {
            const renderer = getRenderer(block.blockType)
            return (
              <div key={block.id} className="bg-white border border-zinc-100 rounded-lg p-4">
                <renderer.Student
                  rawContent={block.displayContent}
                  parsedContent={block.parsedContent}
                />
              </div>
            )
          })}
        </div>
      ))}
      </div>
    </>
  )
}
