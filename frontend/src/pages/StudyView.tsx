import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BookOpen } from 'lucide-react'
import { getStudyLesson } from '../api/lessons'
import { getRenderer } from '../components/lesson/contentRegistry'
import { ContentErrorBoundary } from '../components/lesson/ContentErrorBoundary'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/PageHeader'

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
          Lesson not found. <Link to="/lessons" className="underline hover:text-zinc-700 transition-colors">Go back</Link>
        </span>
      </div>
    )
  }

  return (
    <>
      <div className="sticky top-0 z-10 bg-zinc-50 border-b border-zinc-200 px-4 py-2">
        <PageHeader
          backTo={`/lessons/${id}`}
          backLabel="Back to editor"
          title={lesson.title}
          titleTestId="study-title"
          actions={
            <Badge variant="outline" className="text-xs font-medium text-zinc-500 border-zinc-300 uppercase tracking-wide">Preview</Badge>
          }
        />
      </div>
      <div className="max-w-2xl mx-auto space-y-8 py-8 px-4">
      <p className="text-sm text-zinc-500">{lesson.language} · {lesson.cefrLevel} · {lesson.topic}</p>

      {lesson.sections.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="h-12 w-12 text-zinc-300 mb-4" />
          <h2 className="text-lg font-medium text-zinc-700 mb-1">No content yet</h2>
          <p className="text-sm text-zinc-500 mb-4">This lesson doesn't have any generated content to preview.</p>
          <Link
            to={`/lessons/${id}`}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Go to editor to add content
          </Link>
        </div>
      )}

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
                <ContentErrorBoundary blockType={block.blockType}>
                  <renderer.Student
                    rawContent={block.displayContent}
                    parsedContent={block.parsedContent}
                  />
                </ContentErrorBoundary>
              </div>
            )
          })}
        </div>
      ))}
      </div>
    </>
  )
}
