import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
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
}))

// Mock saveContentBlock
vi.mock('../../api/generate', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/generate')>()
  return { ...actual, saveContentBlock: vi.fn() }
})

import { streamText } from '../../lib/streamText'
import * as generateApi from '../../api/generate'

const SECTIONS: LessonSection[] = [
  { id: 's1', sectionType: 'WarmUp', orderIndex: 0, notes: null },
  { id: 's2', sectionType: 'Presentation', orderIndex: 1, notes: null },
  { id: 's3', sectionType: 'Practice', orderIndex: 2, notes: null },
  { id: 's4', sectionType: 'Production', orderIndex: 3, notes: null },
  { id: 's5', sectionType: 'WrapUp', orderIndex: 4, notes: null },
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

function renderButton(onBlockSaved = vi.fn()) {
  return render(
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
    render(
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
    render(
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

  it('clicking opens confirmation dialog', async () => {
    const user = userEvent.setup()
    renderButton()
    await user.click(screen.getByTestId('generate-full-lesson-btn'))
    expect(screen.getByText('Generate Full Lesson?')).toBeInTheDocument()
    expect(screen.getByText(/This will generate content/)).toBeInTheDocument()
  })

  it('canceling dialog does not call onBlockSaved', async () => {
    const user = userEvent.setup()
    const onBlockSaved = vi.fn()
    render(
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

    render(
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
    expect(blockTypes).toEqual(['vocabulary', 'grammar', 'exercises', 'conversation', 'homework'])
  })

  it('progress indicator shows section count during generation', async () => {
    const user = userEvent.setup()
    let resolveFirst: (v: string) => void
    const firstStreamPromise = new Promise<string>(res => { resolveFirst = res })

    vi.mocked(streamText).mockReturnValueOnce(firstStreamPromise).mockResolvedValue('{}')
    vi.mocked(generateApi.saveContentBlock).mockImplementation((_lessonId, req) =>
      Promise.resolve(makeBlock(req.lessonSectionId!, req.blockType as string))
    )

    renderButton()
    await user.click(screen.getByTestId('generate-full-lesson-btn'))
    await user.click(screen.getByTestId('confirm-generate-full-lesson'))

    // While first section is in-flight, progress indicator should be visible
    await waitFor(() => expect(screen.getByTestId('generation-progress')).toBeInTheDocument())
    expect(screen.getByText('1 / 5')).toBeInTheDocument()

    resolveFirst!('{}')
    await waitFor(() => expect(vi.mocked(generateApi.saveContentBlock)).toHaveBeenCalledTimes(5), { timeout: 3000 })
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

    render(
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
    const blockTypes = onBlockSaved.mock.calls.map((c) => (c as [ContentBlockDto])[0].blockType)
    expect(blockTypes).not.toContain('conversation')
  })

  it('progress counter reflects actual section count for partial lesson', async () => {
    const user = userEvent.setup()
    let resolveFirst: (v: string) => void
    const firstStreamPromise = new Promise<string>(res => { resolveFirst = res })

    vi.mocked(streamText).mockReturnValueOnce(firstStreamPromise).mockResolvedValue('{}')
    vi.mocked(generateApi.saveContentBlock).mockImplementation((_lessonId, req) =>
      Promise.resolve(makeBlock(req.lessonSectionId!, req.blockType as string))
    )

    const FOUR_SECTIONS: LessonSection[] = SECTIONS.filter(s => s.sectionType !== 'Production')

    render(
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
    // Should show 1 / 4, not 1 / 5
    expect(screen.getByText('1 / 4')).toBeInTheDocument()

    resolveFirst!('{}')
    await waitFor(() => expect(vi.mocked(generateApi.saveContentBlock)).toHaveBeenCalledTimes(4), { timeout: 3000 })
  })

  it('error during section 2 stops generation and shows error state', async () => {
    const user = userEvent.setup()
    const streamMock = vi.mocked(streamText)

    streamMock
      .mockResolvedValueOnce('{}')          // WarmUp ok
      .mockRejectedValueOnce(new Error('AI service unavailable')) // Presentation fails

    vi.mocked(generateApi.saveContentBlock).mockImplementation((_lessonId, req) =>
      Promise.resolve(makeBlock(req.lessonSectionId!, req.blockType as string))
    )

    const onBlockSaved = vi.fn()
    render(
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
    expect(screen.getByText('AI service unavailable')).toBeInTheDocument()
    // Only WarmUp should have saved
    expect(onBlockSaved).toHaveBeenCalledTimes(1)
  })
})
