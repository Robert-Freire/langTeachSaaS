import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FullLessonGenerateButton } from './FullLessonGenerateButton'
import type { LessonSection } from '../../api/lessons'
import type { ContentBlockDto } from '../../api/generate'

// Mock Auth0
vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => ({ getAccessTokenSilently: vi.fn().mockResolvedValue('fake-token') }),
}))

// Mock streamText
vi.mock('../../lib/streamText', () => ({
  streamText: vi.fn(),
  QuotaExceededError: class QuotaExceededError extends Error {
    resetsAt: string
    constructor(message: string, resetsAt: string) {
      super(message)
      this.name = 'QuotaExceededError'
      this.resetsAt = resetsAt
    }
  },
}))

// Mock useProfile
vi.mock('../../hooks/useProfile', () => ({
  useProfile: () => ({
    data: {
      id: '1', displayName: 'Test', teachingLanguages: [], cefrLevels: [],
      preferredStyle: '', hasCompletedOnboarding: true, hasSettings: true,
      hasStudents: false, hasLessons: false,
      generationsUsedThisMonth: 5, generationsMonthlyLimit: 50, subscriptionTier: 'Free',
    },
  }),
}))

// Mock saveContentBlock
vi.mock('../../api/generate', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/generate')>()
  return { ...actual, saveContentBlock: vi.fn() }
})

import { streamText } from '../../lib/streamText'
import * as generateApi from '../../api/generate'

const SECTIONS: LessonSection[] = [
  { id: 's1', sectionType: 'WarmUp', orderIndex: 0, notes: null, materials: [] },
  { id: 's2', sectionType: 'Presentation', orderIndex: 1, notes: null, materials: [] },
  { id: 's3', sectionType: 'Practice', orderIndex: 2, notes: null, materials: [] },
  { id: 's4', sectionType: 'Production', orderIndex: 3, notes: null, materials: [] },
  { id: 's5', sectionType: 'WrapUp', orderIndex: 4, notes: null, materials: [] },
]

const LESSON_CONTEXT = {
  language: 'Spanish',
  cefrLevel: 'A2',
  topic: 'Food vocabulary',
  studentId: 'student-1',
}

function makeBlock(sectionId: string, blockType: string): ContentBlockDto {
  return {
    id: `block-${sectionId}`,
    lessonSectionId: sectionId,
    blockType: blockType as ContentBlockDto['blockType'],
    generatedContent: '{"items":[]}',
    editedContent: null,
    isEdited: false,
    generationParams: null,
    parsedContent: null,
    createdAt: '2026-01-01T00:00:00Z',
  }
}

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

function renderButton(onBlockSaved = vi.fn()) {
  return renderWithQuery(
    <FullLessonGenerateButton
      lessonId="lesson-1"
      sections={SECTIONS}
      lessonContext={LESSON_CONTEXT}
      onBlockSaved={onBlockSaved}
    />
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('FullLessonGenerateButton', () => {
  it('renders button disabled when topic is empty', () => {
    renderWithQuery(
      <FullLessonGenerateButton
        lessonId="lesson-1"
        sections={SECTIONS}
        lessonContext={{ ...LESSON_CONTEXT, topic: '' }}
        onBlockSaved={vi.fn()}
      />
    )
    expect(screen.getByTestId('generate-full-lesson-btn')).toBeDisabled()
  })

  it('renders button disabled when language is empty', () => {
    renderWithQuery(
      <FullLessonGenerateButton
        lessonId="lesson-1"
        sections={SECTIONS}
        lessonContext={{ ...LESSON_CONTEXT, language: '' }}
        onBlockSaved={vi.fn()}
      />
    )
    expect(screen.getByTestId('generate-full-lesson-btn')).toBeDisabled()
  })

  it('renders button enabled when topic and language are present', () => {
    renderButton()
    expect(screen.getByTestId('generate-full-lesson-btn')).not.toBeDisabled()
  })

  it('clicking opens confirmation dialog with correct section count', async () => {
    const user = userEvent.setup()
    renderButton()
    await user.click(screen.getByTestId('generate-full-lesson-btn'))
    expect(screen.getByText('Generate Full Lesson?')).toBeInTheDocument()
    expect(screen.getByText(/all 5 sections/)).toBeInTheDocument()
  })

  it('confirmation dialog shows correct count for fewer sections', async () => {
    const user = userEvent.setup()
    const THREE_SECTIONS: LessonSection[] = SECTIONS.filter(
      s => ['WarmUp', 'Practice', 'WrapUp'].includes(s.sectionType)
    )
    renderWithQuery(
      <FullLessonGenerateButton
        lessonId="lesson-1"
        sections={THREE_SECTIONS}
        lessonContext={LESSON_CONTEXT}
        onBlockSaved={vi.fn()}
      />
    )
    await user.click(screen.getByTestId('generate-full-lesson-btn'))
    expect(screen.getByText(/all 3 sections/)).toBeInTheDocument()
  })

  it('canceling dialog does not call onBlockSaved', async () => {
    const user = userEvent.setup()
    const onBlockSaved = vi.fn()
    renderWithQuery(
      <FullLessonGenerateButton
        lessonId="lesson-1"
        sections={SECTIONS}
        lessonContext={LESSON_CONTEXT}
        onBlockSaved={onBlockSaved}
      />
    )
    await user.click(screen.getByTestId('generate-full-lesson-btn'))
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onBlockSaved).not.toHaveBeenCalled()
  })

  it('successful generation calls onBlockSaved 5 times with correct blockTypes', async () => {
    const user = userEvent.setup()
    const onBlockSaved = vi.fn()
    const streamMock = vi.mocked(streamText)
    const saveMock = vi.mocked(generateApi.saveContentBlock)

    streamMock.mockResolvedValue('{"items":[]}')
    saveMock.mockImplementation((_lessonId, req) =>
      Promise.resolve(makeBlock(req.lessonSectionId!, req.blockType as string))
    )

    renderWithQuery(
      <FullLessonGenerateButton
        lessonId="lesson-1"
        sections={SECTIONS}
        lessonContext={LESSON_CONTEXT}
        onBlockSaved={onBlockSaved}
      />
    )

    await user.click(screen.getByTestId('generate-full-lesson-btn'))
    await user.click(screen.getByTestId('confirm-generate-full-lesson'))

    await waitFor(() => expect(onBlockSaved).toHaveBeenCalledTimes(5), { timeout: 3000 })

    const blockTypes = onBlockSaved.mock.calls.map((c) => (c as [ContentBlockDto])[0].blockType)
    // WarmUp/Production/WrapUp use 'conversation'; Presentation uses 'grammar'; Practice uses 'exercises'
    expect(new Set(blockTypes)).toEqual(new Set(['conversation', 'grammar', 'exercises']))
  })

  it('exam-prep template uses conversation for WarmUp/WrapUp and exercises for Production', async () => {
    const user = userEvent.setup()
    const onBlockSaved = vi.fn()
    const streamMock = vi.mocked(streamText)
    const saveMock = vi.mocked(generateApi.saveContentBlock)

    streamMock.mockResolvedValue('{"items":[]}')
    saveMock.mockImplementation((_lessonId, req) =>
      Promise.resolve(makeBlock(req.lessonSectionId!, req.blockType as string))
    )

    renderWithQuery(
      <FullLessonGenerateButton
        lessonId="lesson-1"
        sections={SECTIONS}
        lessonContext={{ ...LESSON_CONTEXT, templateName: 'Exam Prep' }}
        onBlockSaved={onBlockSaved}
      />
    )

    await user.click(screen.getByTestId('generate-full-lesson-btn'))
    await user.click(screen.getByTestId('confirm-generate-full-lesson'))

    await waitFor(() => expect(onBlockSaved).toHaveBeenCalledTimes(5), { timeout: 3000 })

    const calls = onBlockSaved.mock.calls.map((c) => {
      const block = (c as [ContentBlockDto])[0]
      return { section: block.lessonSectionId, type: block.blockType }
    })
    const bySection = Object.fromEntries(calls.map(c => [c.section, c.type]))
    expect(bySection['s1']).toBe('conversation') // WarmUp: briefing conversation
    expect(bySection['s2']).toBe('grammar')      // Presentation
    expect(bySection['s3']).toBe('exercises')    // Practice
    expect(bySection['s4']).toBe('exercises')    // Production: written exam task
    expect(bySection['s5']).toBe('conversation') // WrapUp: self-assessment conversation
  })

  it('all sections show active status simultaneously during generation', async () => {
    const user = userEvent.setup()
    const resolvers: Array<(v: string) => void> = []

    vi.mocked(streamText).mockImplementation(() =>
      new Promise<string>(res => { resolvers.push(res) })
    )
    vi.mocked(generateApi.saveContentBlock).mockImplementation((_lessonId, req) =>
      Promise.resolve(makeBlock(req.lessonSectionId!, req.blockType as string))
    )

    renderButton()
    await user.click(screen.getByTestId('generate-full-lesson-btn'))
    await user.click(screen.getByTestId('confirm-generate-full-lesson'))

    // Wait for progress to appear (all sections are in-flight)
    await waitFor(() => expect(screen.getByTestId('generation-progress')).toBeInTheDocument())

    // All 5 spinners should be visible (active status)
    const spinners = screen.getAllByText((_, el) =>
      el?.tagName === 'svg' && el.classList.contains('animate-spin')
    )
    expect(spinners).toHaveLength(5)

    // Resolve all
    resolvers.forEach(r => r('{}'))
    await waitFor(() => expect(screen.getByText('Lesson generated!')).toBeInTheDocument(), { timeout: 3000 })
  })

  it('progress indicator shows completed count during generation', async () => {
    const user = userEvent.setup()
    const resolvers: Array<(v: string) => void> = []

    vi.mocked(streamText).mockImplementation(() =>
      new Promise<string>(res => { resolvers.push(res) })
    )
    vi.mocked(generateApi.saveContentBlock).mockImplementation((_lessonId, req) =>
      Promise.resolve(makeBlock(req.lessonSectionId!, req.blockType as string))
    )

    renderButton()
    await user.click(screen.getByTestId('generate-full-lesson-btn'))
    await user.click(screen.getByTestId('confirm-generate-full-lesson'))

    // While all sections are in-flight, 0 complete
    await waitFor(() => expect(screen.getByTestId('generation-progress')).toBeInTheDocument())
    expect(screen.getByText('0 / 5 complete')).toBeInTheDocument()

    // Resolve first section
    resolvers[0]('{}')
    await waitFor(() => expect(screen.getByText('1 / 5 complete')).toBeInTheDocument())
  })

  it('succeeds when lesson has fewer than 5 sections (e.g. no Production)', async () => {
    const user = userEvent.setup()
    const onBlockSaved = vi.fn()
    const streamMock = vi.mocked(streamText)
    const saveMock = vi.mocked(generateApi.saveContentBlock)

    streamMock.mockResolvedValue('{}')
    saveMock.mockImplementation((_lessonId, req) =>
      Promise.resolve(makeBlock(req.lessonSectionId!, req.blockType as string))
    )

    const FOUR_SECTIONS: LessonSection[] = SECTIONS.filter(s => s.sectionType !== 'Production')

    renderWithQuery(
      <FullLessonGenerateButton
        lessonId="lesson-1"
        sections={FOUR_SECTIONS}
        lessonContext={LESSON_CONTEXT}
        onBlockSaved={onBlockSaved}
      />
    )

    await user.click(screen.getByTestId('generate-full-lesson-btn'))
    await user.click(screen.getByTestId('confirm-generate-full-lesson'))

    await waitFor(() => expect(screen.getByText('Lesson generated!')).toBeInTheDocument(), { timeout: 3000 })
    // Only 4 blocks saved (Production skipped)
    expect(onBlockSaved).toHaveBeenCalledTimes(4)
  })

  it('progress counter reflects actual section count for partial lesson', async () => {
    const user = userEvent.setup()
    const resolvers: Array<(v: string) => void> = []

    vi.mocked(streamText).mockImplementation(() =>
      new Promise<string>(res => { resolvers.push(res) })
    )
    vi.mocked(generateApi.saveContentBlock).mockImplementation((_lessonId, req) =>
      Promise.resolve(makeBlock(req.lessonSectionId!, req.blockType as string))
    )

    const FOUR_SECTIONS: LessonSection[] = SECTIONS.filter(s => s.sectionType !== 'Production')

    renderWithQuery(
      <FullLessonGenerateButton
        lessonId="lesson-1"
        sections={FOUR_SECTIONS}
        lessonContext={LESSON_CONTEXT}
        onBlockSaved={vi.fn()}
      />
    )

    await user.click(screen.getByTestId('generate-full-lesson-btn'))
    await user.click(screen.getByTestId('confirm-generate-full-lesson'))

    await waitFor(() => expect(screen.getByTestId('generation-progress')).toBeInTheDocument())
    // Should show 0 / 4, not 0 / 5
    expect(screen.getByText('0 / 4 complete')).toBeInTheDocument()

    resolvers.forEach(r => r('{}'))
    await waitFor(() => expect(vi.mocked(generateApi.saveContentBlock)).toHaveBeenCalledTimes(4), { timeout: 3000 })
  })

  it('streamText receives correct sectionType for each section', async () => {
    const user = userEvent.setup()
    const streamMock = vi.mocked(streamText)

    streamMock.mockResolvedValue('{}')
    vi.mocked(generateApi.saveContentBlock).mockImplementation((_lessonId, req) =>
      Promise.resolve(makeBlock(req.lessonSectionId!, req.blockType as string))
    )

    renderButton()
    await user.click(screen.getByTestId('generate-full-lesson-btn'))
    await user.click(screen.getByTestId('confirm-generate-full-lesson'))

    await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(5), { timeout: 3000 })

    const calledSectionTypes = streamMock.mock.calls.map(
      (c) => (c[1] as { sectionType?: string }).sectionType
    )
    expect(calledSectionTypes).toContain('WarmUp')
    expect(calledSectionTypes).toContain('Presentation')
    expect(calledSectionTypes).toContain('Practice')
    expect(calledSectionTypes).toContain('Production')
    expect(calledSectionTypes).toContain('WrapUp')
  })

  it('Reading & Comprehension template: Presentation uses reading, Practice uses exercises', async () => {
    const user = userEvent.setup()
    const streamMock = vi.mocked(streamText)
    streamMock.mockResolvedValue('{}')
    vi.mocked(generateApi.saveContentBlock).mockImplementation((_lessonId, req) =>
      Promise.resolve(makeBlock(req.lessonSectionId!, req.blockType as string))
    )

    renderWithQuery(
      <FullLessonGenerateButton
        lessonId="lesson-1"
        sections={SECTIONS}
        lessonContext={{ ...LESSON_CONTEXT, templateName: 'Reading & Comprehension' }}
        onBlockSaved={vi.fn()}
      />
    )
    await user.click(screen.getByTestId('generate-full-lesson-btn'))
    await user.click(screen.getByTestId('confirm-generate-full-lesson'))
    await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(5), { timeout: 3000 })

    const callMap = Object.fromEntries(
      streamMock.mock.calls.map((c) => [(c[1] as { sectionType?: string }).sectionType, c[0]])
    )
    expect(callMap['Presentation']).toBe('reading')
    expect(callMap['Practice']).toBe('exercises')
    expect(callMap['WarmUp']).toBe('conversation')
    expect(callMap['Production']).toBe('conversation')
    expect(callMap['WrapUp']).toBe('conversation')
  })

  it('Writing Skills template: Production uses guided-writing', async () => {
    const user = userEvent.setup()
    const streamMock = vi.mocked(streamText)
    streamMock.mockResolvedValue('{}')
    vi.mocked(generateApi.saveContentBlock).mockImplementation((_lessonId, req) =>
      Promise.resolve(makeBlock(req.lessonSectionId!, req.blockType as string))
    )

    renderWithQuery(
      <FullLessonGenerateButton
        lessonId="lesson-1"
        sections={SECTIONS}
        lessonContext={{ ...LESSON_CONTEXT, templateName: 'Writing Skills' }}
        onBlockSaved={vi.fn()}
      />
    )
    await user.click(screen.getByTestId('generate-full-lesson-btn'))
    await user.click(screen.getByTestId('confirm-generate-full-lesson'))
    await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(5), { timeout: 3000 })

    const callMap = Object.fromEntries(
      streamMock.mock.calls.map((c) => [(c[1] as { sectionType?: string }).sectionType, c[0]])
    )
    expect(callMap['Production']).toBe('guided-writing')
    expect(callMap['Practice']).toBe('exercises')
    expect(callMap['WarmUp']).toBe('conversation')
    expect(callMap['WrapUp']).toBe('conversation')
  })

  it('Exam Prep template: WarmUp/WrapUp use conversation, Production uses exercises', async () => {
    const user = userEvent.setup()
    const streamMock = vi.mocked(streamText)
    streamMock.mockResolvedValue('{}')
    vi.mocked(generateApi.saveContentBlock).mockImplementation((_lessonId, req) =>
      Promise.resolve(makeBlock(req.lessonSectionId!, req.blockType as string))
    )

    renderWithQuery(
      <FullLessonGenerateButton
        lessonId="lesson-1"
        sections={SECTIONS}
        lessonContext={{ ...LESSON_CONTEXT, templateName: 'Exam Prep' }}
        onBlockSaved={vi.fn()}
      />
    )
    await user.click(screen.getByTestId('generate-full-lesson-btn'))
    await user.click(screen.getByTestId('confirm-generate-full-lesson'))
    await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(5), { timeout: 3000 })

    const callMap = Object.fromEntries(
      streamMock.mock.calls.map((c) => [(c[1] as { sectionType?: string }).sectionType, c[0]])
    )
    expect(callMap['WarmUp']).toBe('conversation')
    expect(callMap['WrapUp']).toBe('conversation')
    expect(callMap['Production']).toBe('exercises')
    expect(callMap['Practice']).toBe('exercises')
  })

  it('error in one section does not stop other sections from completing', async () => {
    const user = userEvent.setup()
    const streamMock = vi.mocked(streamText)

    streamMock
      .mockResolvedValueOnce('{}')          // WarmUp ok
      .mockRejectedValueOnce(new Error('AI service unavailable')) // Presentation fails
      .mockResolvedValueOnce('{}')          // Practice ok
      .mockResolvedValueOnce('{}')          // Production ok
      .mockResolvedValueOnce('{}')          // WrapUp ok

    vi.mocked(generateApi.saveContentBlock).mockImplementation((_lessonId, req) =>
      Promise.resolve(makeBlock(req.lessonSectionId!, req.blockType as string))
    )

    const onBlockSaved = vi.fn()
    renderWithQuery(
      <FullLessonGenerateButton
        lessonId="lesson-1"
        sections={SECTIONS}
        lessonContext={LESSON_CONTEXT}
        onBlockSaved={onBlockSaved}
      />
    )

    await user.click(screen.getByTestId('generate-full-lesson-btn'))
    await user.click(screen.getByTestId('confirm-generate-full-lesson'))

    await waitFor(() => expect(screen.getByText('Generation failed')).toBeInTheDocument(), { timeout: 3000 })
    expect(screen.getByText(/AI service unavailable/)).toBeInTheDocument()
    // 4 sections succeeded, only Presentation failed
    expect(onBlockSaved).toHaveBeenCalledTimes(4)
  })
})
