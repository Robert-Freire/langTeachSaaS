import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GeneratePanel } from './GeneratePanel'
import type { ContentBlockDto } from '../../api/generate'
import * as generateApi from '../../api/generate'
import type { SectionRulesMap } from '../../api/pedagogy'

const MOCK_SECTION_RULES: SectionRulesMap = {
  WarmUp: {
    A1: ['conversation'], A2: ['conversation'], B1: ['conversation'],
    B2: ['conversation'], C1: ['conversation'], C2: ['conversation'],
  },
  Presentation: {
    A1: ['grammar', 'vocabulary', 'reading', 'conversation'],
    A2: ['grammar', 'vocabulary', 'reading', 'conversation'],
    B1: ['grammar', 'vocabulary', 'reading', 'conversation'],
    B2: ['grammar', 'vocabulary', 'reading', 'conversation'],
    C1: ['grammar', 'vocabulary', 'reading', 'conversation'],
    C2: ['grammar', 'vocabulary', 'reading', 'conversation'],
  },
  Practice: {
    A1: ['exercises', 'conversation'], A2: ['exercises', 'conversation'],
    B1: ['exercises', 'conversation'], B2: ['exercises', 'conversation'],
    C1: ['exercises', 'conversation'], C2: ['exercises', 'conversation'],
  },
  Production: {
    A1: ['conversation'], A2: ['conversation'],
    B1: ['conversation', 'exercises'],
    B2: ['conversation', 'reading', 'exercises'], C1: ['conversation', 'reading', 'exercises'], C2: ['conversation', 'reading', 'exercises'],
  },
  WrapUp: {
    A1: ['conversation'], A2: ['conversation'], B1: ['conversation'],
    B2: ['conversation'], C1: ['conversation'], C2: ['conversation'],
  },
}

// Mock useSectionRules — data is static config, always available in tests
vi.mock('../../hooks/useSectionRules', () => ({
  useSectionRules: () => ({ data: MOCK_SECTION_RULES, isLoading: false }),
}))

// Mock Auth0
vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => ({
    getAccessTokenSilently: vi.fn().mockResolvedValue('test-token'),
  }),
}))

// Mock useGenerate so we can control status/output
const mockUseGenerate = vi.fn()
vi.mock('../../hooks/useGenerate', () => ({
  useGenerate: () => mockUseGenerate(),
}))

// Mock useProfile for quota data
const mockUseProfile = vi.fn()
vi.mock('../../hooks/useProfile', () => ({
  useProfile: () => mockUseProfile(),
}))

vi.mock('../../api/generate', async (importOriginal) => {
  const actual = await importOriginal<typeof generateApi>()
  return {
    ...actual,
    saveContentBlock: vi.fn(),
    deleteContentBlock: vi.fn(),
  }
})

function makeBlock(overrides: Partial<ContentBlockDto> = {}): ContentBlockDto {
  return {
    id: 'block-1',
    lessonSectionId: 'section-1',
    blockType: 'vocabulary',
    generatedContent: '{"items":[]}',
    editedContent: null,
    isEdited: false,
    generationParams: null,
    parsedContent: null,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

const defaultProps = {
  lessonId: 'lesson-1',
  sectionId: 'section-1',
  sectionType: 'Presentation' as const,
  existingBlocks: [] as ContentBlockDto[],
  lessonContext: {
    language: 'French',
    cefrLevel: 'B1',
    topic: 'Greetings',
  },
  onReplace: vi.fn(),
  onClose: vi.fn(),
}

const defaultProfile = {
  data: {
    id: '1', displayName: 'Test', teachingLanguages: [], cefrLevels: [],
    preferredStyle: '', hasCompletedOnboarding: true, hasSettings: true,
    hasStudents: false, hasLessons: false,
    generationsUsedThisMonth: 5, generationsMonthlyLimit: 50, subscriptionTier: 'Free',
  },
}

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseProfile.mockReturnValue(defaultProfile)
})

describe('GeneratePanel - streaming states', () => {
  it('shows spinner when streaming with no output yet', () => {
    mockUseGenerate.mockReturnValue({
      status: 'streaming',
      output: '',
      error: null,
      quotaExceeded: false,
      generate: vi.fn(),
      abort: vi.fn(),
    })

    renderWithQuery(<GeneratePanel {...defaultProps} />)

    const output = screen.getByTestId('generate-output')
    expect(output).toBeTruthy()
    expect(output.getAttribute('role')).toBe('status')
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('shows vocabulary renderer (not spinner) when streaming with one complete vocabulary item', () => {
    const vocabOutput = JSON.stringify({
      items: [{ word: 'bonjour', definition: 'hello' }],
    })

    mockUseGenerate.mockReturnValue({
      status: 'streaming',
      output: vocabOutput,
      error: null,
      quotaExceeded: false,
      generate: vi.fn(),
      abort: vi.fn(),
    })

    renderWithQuery(<GeneratePanel {...defaultProps} />)

    const output = screen.getByTestId('generate-output')
    expect(output.getAttribute('role')).toBeNull()
    expect(screen.getByText('bonjour')).toBeTruthy()
  })

  it('shows "Generated preview" header when done', () => {
    const vocabOutput = JSON.stringify({
      items: [{ word: 'bonjour', definition: 'hello' }],
    })

    mockUseGenerate.mockReturnValue({
      status: 'done',
      output: vocabOutput,
      error: null,
      quotaExceeded: false,
      generate: vi.fn(),
      abort: vi.fn(),
    })

    renderWithQuery(<GeneratePanel {...defaultProps} />)

    expect(screen.getByText('Generated preview')).toBeTruthy()
  })
})

describe('GeneratePanel - replace indicator', () => {
  it('does not show replace indicator when no existing blocks', () => {
    mockUseGenerate.mockReturnValue({
      status: 'idle',
      output: null,
      error: null,
      quotaExceeded: false,
      generate: vi.fn(),
      abort: vi.fn(),
    })

    renderWithQuery(<GeneratePanel {...defaultProps} existingBlocks={[]} />)

    expect(screen.queryByTestId('replace-indicator')).toBeNull()
  })

  it('shows replace indicator when existing blocks are provided', () => {
    mockUseGenerate.mockReturnValue({
      status: 'idle',
      output: null,
      error: null,
      quotaExceeded: false,
      generate: vi.fn(),
      abort: vi.fn(),
    })

    const blocks = [makeBlock(), makeBlock({ id: 'block-2' })]
    renderWithQuery(<GeneratePanel {...defaultProps} existingBlocks={blocks} />)

    const indicator = screen.getByTestId('replace-indicator')
    expect(indicator).toBeInTheDocument()
    expect(indicator.textContent).toContain('2 existing blocks')
  })

  it('shows singular text for single block', () => {
    mockUseGenerate.mockReturnValue({
      status: 'idle',
      output: null,
      error: null,
      quotaExceeded: false,
      generate: vi.fn(),
      abort: vi.fn(),
    })

    renderWithQuery(<GeneratePanel {...defaultProps} existingBlocks={[makeBlock()]} />)

    const indicator = screen.getByTestId('replace-indicator')
    expect(indicator.textContent).toContain('1 existing block')
    expect(indicator.textContent).not.toContain('blocks')
  })
})

describe('GeneratePanel - direction textarea and chips', () => {
  it('shows direction textarea when existing blocks present', () => {
    mockUseGenerate.mockReturnValue({
      status: 'idle',
      output: null,
      error: null,
      quotaExceeded: false,
      generate: vi.fn(),
      abort: vi.fn(),
    })

    renderWithQuery(<GeneratePanel {...defaultProps} existingBlocks={[makeBlock()]} />)

    expect(screen.getByTestId('direction-textarea')).toBeInTheDocument()
    expect(screen.getByTestId('direction-chips')).toBeInTheDocument()
  })

  it('does not show direction textarea when no existing blocks', () => {
    mockUseGenerate.mockReturnValue({
      status: 'idle',
      output: null,
      error: null,
      quotaExceeded: false,
      generate: vi.fn(),
      abort: vi.fn(),
    })

    renderWithQuery(<GeneratePanel {...defaultProps} existingBlocks={[]} />)

    expect(screen.queryByTestId('direction-textarea')).toBeNull()
  })

  it('clicking a direction chip sets the textarea value', async () => {
    mockUseGenerate.mockReturnValue({
      status: 'idle',
      output: null,
      error: null,
      quotaExceeded: false,
      generate: vi.fn(),
      abort: vi.fn(),
    })

    renderWithQuery(<GeneratePanel {...defaultProps} existingBlocks={[makeBlock()]} />)

    const user = userEvent.setup()
    await user.click(screen.getByTestId('direction-chip-make-it-easier'))

    const textarea = screen.getByTestId('direction-textarea') as HTMLTextAreaElement
    expect(textarea.value).toBe('Make it easier')
  })
})

describe('GeneratePanel - replace on insert', () => {
  it('shows "Replace & insert" button when existing blocks present', () => {
    mockUseGenerate.mockReturnValue({
      status: 'done',
      output: '{"items":[]}',
      error: null,
      quotaExceeded: false,
      generate: vi.fn(),
      abort: vi.fn(),
    })

    renderWithQuery(<GeneratePanel {...defaultProps} existingBlocks={[makeBlock()]} />)

    expect(screen.getByTestId('insert-btn')).toHaveTextContent('Replace & insert')
  })

  it('shows "Insert into section" when no existing blocks', () => {
    mockUseGenerate.mockReturnValue({
      status: 'done',
      output: '{"items":[]}',
      error: null,
      quotaExceeded: false,
      generate: vi.fn(),
      abort: vi.fn(),
    })

    renderWithQuery(<GeneratePanel {...defaultProps} existingBlocks={[]} />)

    expect(screen.getByTestId('insert-btn')).toHaveTextContent('Insert into section')
  })

  it('saves new block first then deletes existing blocks on replace', async () => {
    const existingBlock = makeBlock()
    const newBlock = makeBlock({ id: 'new-block' })
    vi.mocked(generateApi.deleteContentBlock).mockResolvedValue()
    vi.mocked(generateApi.saveContentBlock).mockResolvedValue(newBlock)

    mockUseGenerate.mockReturnValue({
      status: 'done',
      output: '{"items":[]}',
      error: null,
      quotaExceeded: false,
      generate: vi.fn(),
      abort: vi.fn(),
    })

    const onReplace = vi.fn()
    renderWithQuery(<GeneratePanel {...defaultProps} existingBlocks={[existingBlock]} onReplace={onReplace} />)

    const user = userEvent.setup()
    await user.click(screen.getByTestId('insert-btn'))

    await waitFor(() => {
      expect(generateApi.saveContentBlock).toHaveBeenCalled()
      expect(generateApi.deleteContentBlock).toHaveBeenCalledWith('lesson-1', 'block-1')
      expect(onReplace).toHaveBeenCalledWith(newBlock, ['block-1'])
    })
  })

  it('still completes replace when delete fails (saves new block, skips failed deletes)', async () => {
    const existingBlock = makeBlock()
    const newBlock = makeBlock({ id: 'new-block' })
    vi.mocked(generateApi.deleteContentBlock).mockRejectedValue(new Error('fail'))
    vi.mocked(generateApi.saveContentBlock).mockResolvedValue(newBlock)

    mockUseGenerate.mockReturnValue({
      status: 'done',
      output: '{"items":[]}',
      error: null,
      quotaExceeded: false,
      generate: vi.fn(),
      abort: vi.fn(),
    })

    const onReplace = vi.fn()
    renderWithQuery(<GeneratePanel {...defaultProps} existingBlocks={[existingBlock]} onReplace={onReplace} />)

    const user = userEvent.setup()
    await user.click(screen.getByTestId('insert-btn'))

    await waitFor(() => {
      // Save succeeds, delete fails gracefully, onReplace called with empty removedIds
      expect(generateApi.saveContentBlock).toHaveBeenCalled()
      expect(onReplace).toHaveBeenCalledWith(newBlock, [])
    })
  })

  it('does not delete existing blocks when panel is closed via Discard', async () => {
    const existingBlock = makeBlock()
    const onClose = vi.fn()

    mockUseGenerate.mockReturnValue({
      status: 'done',
      output: '{"items":[]}',
      error: null,
      quotaExceeded: false,
      generate: vi.fn(),
      abort: vi.fn(),
    })

    renderWithQuery(<GeneratePanel {...defaultProps} existingBlocks={[existingBlock]} onClose={onClose} />)

    const user = userEvent.setup()
    // Click the Discard link (not the Replace & insert button)
    await user.click(screen.getByText('Discard'))

    expect(onClose).toHaveBeenCalled()
    expect(generateApi.deleteContentBlock).not.toHaveBeenCalled()
    expect(generateApi.saveContentBlock).not.toHaveBeenCalled()
  })
})

describe('GeneratePanel - difficulty targeting', () => {
  it('includes targetedDifficulties in generationParams when saving', async () => {
    const difficulties = [
      { category: 'grammar', item: 'ser/estar', severity: 'high' },
    ]
    const newBlock = makeBlock({ id: 'new-block' })
    vi.mocked(generateApi.saveContentBlock).mockResolvedValue(newBlock)

    mockUseGenerate.mockReturnValue({
      status: 'done',
      output: '{"items":[]}',
      error: null,
      quotaExceeded: false,
      generate: vi.fn(),
      abort: vi.fn(),
    })

    const onReplace = vi.fn()
    renderWithQuery(
      <GeneratePanel
        {...defaultProps}
        lessonContext={{ ...defaultProps.lessonContext, studentDifficulties: difficulties }}
        onReplace={onReplace}
      />
    )

    const user = userEvent.setup()
    await user.click(screen.getByTestId('insert-btn'))

    await waitFor(() => {
      expect(generateApi.saveContentBlock).toHaveBeenCalled()
      const savedCall = vi.mocked(generateApi.saveContentBlock).mock.calls[0]
      const params = JSON.parse(savedCall[1].generationParams!)
      expect(params.targetedDifficulties).toEqual(difficulties)
    })
  })

  it('shows difficulty badges in generated preview', () => {
    const difficulties = [
      { category: 'grammar', item: 'articles', severity: 'medium' },
    ]

    mockUseGenerate.mockReturnValue({
      status: 'done',
      output: '{"items":[]}',
      error: null,
      quotaExceeded: false,
      generate: vi.fn(),
      abort: vi.fn(),
    })

    renderWithQuery(
      <GeneratePanel
        {...defaultProps}
        lessonContext={{ ...defaultProps.lessonContext, studentDifficulties: difficulties }}
      />
    )

    expect(screen.getByTestId('targeted-difficulties')).toBeInTheDocument()
    expect(screen.getByText('[grammar]')).toBeInTheDocument()
  })
})

describe('GeneratePanel - quota exhausted', () => {
  it('disables generate button when quota is exhausted', () => {
    mockUseProfile.mockReturnValue({
      data: {
        ...defaultProfile.data,
        generationsUsedThisMonth: 50,
        generationsMonthlyLimit: 50,
      },
    })

    mockUseGenerate.mockReturnValue({
      status: 'idle',
      output: null,
      error: null,
      quotaExceeded: false,
      generate: vi.fn(),
      abort: vi.fn(),
    })

    renderWithQuery(<GeneratePanel {...defaultProps} />)

    const btn = screen.getByTestId('generate-btn')
    expect(btn).toBeDisabled()
    expect(screen.getByTestId('quota-exhausted-msg')).toBeInTheDocument()
  })

  it('shows quota message when 429 was returned', () => {
    mockUseGenerate.mockReturnValue({
      status: 'error',
      output: '',
      error: 'Monthly generation limit reached. Resets on 5/1/2026.',
      quotaExceeded: true,
      generate: vi.fn(),
      abort: vi.fn(),
    })

    renderWithQuery(<GeneratePanel {...defaultProps} />)

    expect(screen.getByTestId('quota-exhausted-msg')).toBeInTheDocument()
    const btn = screen.getByTestId('generate-btn')
    expect(btn).toBeDisabled()
  })
})

describe('GeneratePanel - grammar constraints', () => {
  it('renders grammar constraints textarea', () => {
    mockUseGenerate.mockReturnValue({
      status: 'idle',
      output: null,
      error: null,
      quotaExceeded: false,
      generate: vi.fn(),
      abort: vi.fn(),
    })

    renderWithQuery(<GeneratePanel {...defaultProps} />)

    expect(screen.getByTestId('grammar-constraints-textarea')).toBeInTheDocument()
  })

  it('passes grammarConstraints to the generate call', async () => {
    const generateFn = vi.fn()
    mockUseGenerate.mockReturnValue({
      status: 'idle',
      output: null,
      error: null,
      quotaExceeded: false,
      generate: generateFn,
      abort: vi.fn(),
    })

    renderWithQuery(<GeneratePanel {...defaultProps} />)

    const user = userEvent.setup()
    const textarea = screen.getByTestId('grammar-constraints-textarea')
    await user.type(textarea, 'only regular verbs')

    await user.click(screen.getByTestId('generate-btn'))

    expect(generateFn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ grammarConstraints: 'only regular verbs' })
    )
  })

  it('does not include grammarConstraints in request when textarea is empty', async () => {
    const generateFn = vi.fn()
    mockUseGenerate.mockReturnValue({
      status: 'idle',
      output: null,
      error: null,
      quotaExceeded: false,
      generate: generateFn,
      abort: vi.fn(),
    })

    renderWithQuery(<GeneratePanel {...defaultProps} />)

    const user = userEvent.setup()
    await user.click(screen.getByTestId('generate-btn'))

    expect(generateFn).toHaveBeenCalledWith(
      expect.any(String),
      expect.not.objectContaining({ grammarConstraints: expect.anything() })
    )
  })
})

describe('GeneratePanel - task type dropdown casing', () => {
  it('displays task type in Title Case in the trigger', () => {
    mockUseGenerate.mockReturnValue({
      status: 'idle',
      output: null,
      error: null,
      quotaExceeded: false,
      generate: vi.fn(),
      abort: vi.fn(),
    })

    renderWithQuery(<GeneratePanel {...defaultProps} sectionType="Presentation" />)

    // Default task type for Presentation is "vocabulary".
    // In a real browser, Radix SelectValue shows the SelectItem label ("Vocabulary").
    // In JSDOM, it shows the raw value ("vocabulary"). Either way, the trigger contains "vocabulary".
    const label = screen.getByText('Task type')
    const trigger = label.closest('.space-y-1')!.querySelector('[data-slot="select-trigger"]')!
    expect(trigger.textContent?.toLowerCase()).toContain('vocabulary')
  })
})

describe('GeneratePanel - section content type allowlist', () => {
  function makeIdleGenerate() {
    return {
      status: 'idle',
      output: null,
      error: null,
      quotaExceeded: false,
      generate: vi.fn(),
      abort: vi.fn(),
    }
  }

  it('WarmUp A1: shows Conversation starter (read-only), no dropdown', async () => {
    mockUseGenerate.mockReturnValue(makeIdleGenerate())

    renderWithQuery(
      <GeneratePanel
        {...defaultProps}
        sectionType="WarmUp"
        lessonContext={{ ...defaultProps.lessonContext, cefrLevel: 'A1' }}
      />
    )

    const label = screen.getByText('Task type')
    const container = label.closest('.space-y-1')!

    // WarmUp has only 1 allowed type (conversation), so it renders the read-only label
    expect(container.querySelector('[data-testid="task-type-readonly"]')).toBeInTheDocument()
    expect(container.querySelector('[data-testid="task-type-readonly"]')).toHaveTextContent('Conversation starter')
    expect(container.querySelector('[data-slot="select-trigger"]')).toBeNull()
  })

  it('WarmUp B1: shows Conversation starter (read-only), no dropdown', async () => {
    mockUseGenerate.mockReturnValue(makeIdleGenerate())

    renderWithQuery(
      <GeneratePanel
        {...defaultProps}
        sectionType="WarmUp"
        lessonContext={{ ...defaultProps.lessonContext, cefrLevel: 'B1' }}
      />
    )

    // WarmUp B1 now has only 1 allowed type (conversation), so it renders read-only
    const label = screen.getByText('Task type')
    const container = label.closest('.space-y-1')!

    expect(container.querySelector('[data-testid="task-type-readonly"]')).toBeInTheDocument()
    expect(container.querySelector('[data-testid="task-type-readonly"]')).toHaveTextContent('Conversation starter')
    expect(container.querySelector('[data-slot="select-trigger"]')).toBeNull()
  })

  it('WrapUp: renders read-only label with Reflection, no dropdown', () => {
    mockUseGenerate.mockReturnValue(makeIdleGenerate())

    renderWithQuery(
      <GeneratePanel
        {...defaultProps}
        sectionType="WrapUp"
        lessonContext={{ ...defaultProps.lessonContext, cefrLevel: 'B1' }}
      />
    )

    const label = screen.getByText('Task type')
    const container = label.closest('.space-y-1')!
    expect(container.querySelector('[data-testid="task-type-readonly"]')).toBeInTheDocument()
    expect(container.querySelector('[data-testid="task-type-readonly"]')).toHaveTextContent('Reflection')
    expect(container.querySelector('[data-slot="select-trigger"]')).toBeNull()
  })

  it('Practice: shows only Exercises and Conversation options', async () => {
    mockUseGenerate.mockReturnValue(makeIdleGenerate())

    const user = userEvent.setup()
    renderWithQuery(
      <GeneratePanel
        {...defaultProps}
        sectionType="Practice"
        lessonContext={{ ...defaultProps.lessonContext, cefrLevel: 'B1' }}
      />
    )

    const label = screen.getByText('Task type')
    const container = label.closest('.space-y-1')!
    const trigger = container.querySelector('[data-slot="select-trigger"]')!
    expect(trigger).toBeTruthy()

    await user.click(trigger)

    const listbox = await screen.findByRole('listbox')
    expect(within(listbox).getByText('Exercises')).toBeInTheDocument()
    expect(within(listbox).getByText('Conversation')).toBeInTheDocument()
    expect(within(listbox).queryByText('Vocabulary')).toBeNull()
    expect(within(listbox).queryByText('Grammar')).toBeNull()
    expect(within(listbox).queryByText('Reading')).toBeNull()
    expect(within(listbox).queryByText('Homework')).toBeNull()
  })
})
