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
  )
}
