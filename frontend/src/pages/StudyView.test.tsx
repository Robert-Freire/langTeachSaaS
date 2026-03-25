import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import StudyView from './StudyView'

const mockGetStudyLesson = vi.fn()

vi.mock('../api/lessons', () => ({
  getStudyLesson: (...args: unknown[]) => mockGetStudyLesson(...args),
}))

vi.mock('../components/lesson/contentRegistry', () => ({
  getRenderer: () => ({
    Student: ({ rawContent }: { rawContent: string }) => <div>{rawContent}</div>,
  }),
}))

function renderStudyView() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/lessons/lesson-1/study']}>
        <Routes>
          <Route path="/lessons/:id/study" element={<StudyView />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const mockLesson = {
  id: 'lesson-1',
  title: 'Travel Vocabulary',
  language: 'English',
  cefrLevel: 'B1',
  topic: 'Travel',
  sections: [
    {
      id: 'sec-1',
      sectionType: 'WarmUp',
      notes: 'Opening activity',
      blocks: [],
    },
  ],
}

describe('StudyView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetStudyLesson.mockResolvedValue(mockLesson)
  })

  it('renders Back link to lesson editor', async () => {
    renderStudyView()
    const back = await screen.findByTestId('page-header-back')
    expect(back).toHaveAttribute('href', '/lessons/lesson-1')
    expect(back).toHaveTextContent('Back to editor')
  })

  it('renders Preview badge in actions', async () => {
    renderStudyView()
    await screen.findByTestId('page-header-back')
    expect(screen.getByText('Preview')).toBeInTheDocument()
  })

  it('renders lesson title in header', async () => {
    renderStudyView()
    expect(await screen.findByRole('heading', { name: 'Travel Vocabulary' })).toBeInTheDocument()
  })

  it('renders error state when lesson not found', async () => {
    mockGetStudyLesson.mockRejectedValue(new Error('Not found'))
    renderStudyView()
    expect(await screen.findByText('Lesson not found.')).toBeInTheDocument()
  })

  it('renders learning targets when lesson has learningTargets', async () => {
    mockGetStudyLesson.mockResolvedValue({
      ...mockLesson,
      learningTargets: ['Subjunctive mood', 'Speaking'],
    })
    renderStudyView()
    const container = await screen.findByTestId('study-learning-targets')
    expect(container).toBeInTheDocument()
    expect(screen.getByText('Subjunctive mood')).toBeInTheDocument()
    expect(screen.getByText('Speaking')).toBeInTheDocument()
    expect(screen.getByText('Practices:')).toBeInTheDocument()
  })

  it('does not render learning targets section when learningTargets is null', async () => {
    mockGetStudyLesson.mockResolvedValue({
      ...mockLesson,
      learningTargets: null,
    })
    renderStudyView()
    await screen.findByTestId('study-title')
    expect(screen.queryByTestId('study-learning-targets')).toBeNull()
  })
})
