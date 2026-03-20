import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GeneratePanel } from './GeneratePanel'
import type { ContentBlockDto } from '../../api/generate'
import * as generateApi from '../../api/generate'

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

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GeneratePanel - streaming states', () => {
  it('shows spinner when streaming with no output yet', () => {
    mockUseGenerate.mockReturnValue({
      status: 'streaming',
      output: '',
      error: null,
      generate: vi.fn(),
      abort: vi.fn(),
    })

    render(<GeneratePanel {...defaultProps} />)

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
      generate: vi.fn(),
      abort: vi.fn(),
    })

    render(<GeneratePanel {...defaultProps} />)

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
      generate: vi.fn(),
      abort: vi.fn(),
    })

    render(<GeneratePanel {...defaultProps} />)

    expect(screen.getByText('Generated preview')).toBeTruthy()
  })
})

describe('GeneratePanel - replace indicator', () => {
  it('does not show replace indicator when no existing blocks', () => {
    mockUseGenerate.mockReturnValue({
      status: 'idle',
      output: null,
      error: null,
      generate: vi.fn(),
      abort: vi.fn(),
    })

    render(<GeneratePanel {...defaultProps} existingBlocks={[]} />)

    expect(screen.queryByTestId('replace-indicator')).toBeNull()
  })

  it('shows replace indicator when existing blocks are provided', () => {
    mockUseGenerate.mockReturnValue({
      status: 'idle',
      output: null,
      error: null,
      generate: vi.fn(),
      abort: vi.fn(),
    })

    const blocks = [makeBlock(), makeBlock({ id: 'block-2' })]
    render(<GeneratePanel {...defaultProps} existingBlocks={blocks} />)

    const indicator = screen.getByTestId('replace-indicator')
    expect(indicator).toBeInTheDocument()
    expect(indicator.textContent).toContain('2 existing blocks')
  })

  it('shows singular text for single block', () => {
    mockUseGenerate.mockReturnValue({
      status: 'idle',
      output: null,
      error: null,
      generate: vi.fn(),
      abort: vi.fn(),
    })

    render(<GeneratePanel {...defaultProps} existingBlocks={[makeBlock()]} />)

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
      generate: vi.fn(),
      abort: vi.fn(),
    })

    render(<GeneratePanel {...defaultProps} existingBlocks={[makeBlock()]} />)

    expect(screen.getByTestId('direction-textarea')).toBeInTheDocument()
    expect(screen.getByTestId('direction-chips')).toBeInTheDocument()
  })

  it('does not show direction textarea when no existing blocks', () => {
    mockUseGenerate.mockReturnValue({
      status: 'idle',
      output: null,
      error: null,
      generate: vi.fn(),
      abort: vi.fn(),
    })

    render(<GeneratePanel {...defaultProps} existingBlocks={[]} />)

    expect(screen.queryByTestId('direction-textarea')).toBeNull()
  })

  it('clicking a direction chip sets the textarea value', async () => {
    mockUseGenerate.mockReturnValue({
      status: 'idle',
      output: null,
      error: null,
      generate: vi.fn(),
      abort: vi.fn(),
    })

    render(<GeneratePanel {...defaultProps} existingBlocks={[makeBlock()]} />)

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
      generate: vi.fn(),
      abort: vi.fn(),
    })

    render(<GeneratePanel {...defaultProps} existingBlocks={[makeBlock()]} />)

    expect(screen.getByTestId('insert-btn')).toHaveTextContent('Replace & insert')
  })

  it('shows "Insert into section" when no existing blocks', () => {
    mockUseGenerate.mockReturnValue({
      status: 'done',
      output: '{"items":[]}',
      error: null,
      generate: vi.fn(),
      abort: vi.fn(),
    })

    render(<GeneratePanel {...defaultProps} existingBlocks={[]} />)

    expect(screen.getByTestId('insert-btn')).toHaveTextContent('Insert into section')
  })

  it('deletes existing blocks then saves new block on replace', async () => {
    const existingBlock = makeBlock()
    const newBlock = makeBlock({ id: 'new-block' })
    vi.mocked(generateApi.deleteContentBlock).mockResolvedValue()
    vi.mocked(generateApi.saveContentBlock).mockResolvedValue(newBlock)

    mockUseGenerate.mockReturnValue({
      status: 'done',
      output: '{"items":[]}',
      error: null,
      generate: vi.fn(),
      abort: vi.fn(),
    })

    const onReplace = vi.fn()
    render(<GeneratePanel {...defaultProps} existingBlocks={[existingBlock]} onReplace={onReplace} />)

    const user = userEvent.setup()
    await user.click(screen.getByTestId('insert-btn'))

    await waitFor(() => {
      expect(generateApi.deleteContentBlock).toHaveBeenCalledWith('lesson-1', 'block-1')
      expect(generateApi.saveContentBlock).toHaveBeenCalled()
      expect(onReplace).toHaveBeenCalledWith(newBlock, ['block-1'])
    })
  })

  it('shows error and does not save if delete fails', async () => {
    const existingBlock = makeBlock()
    vi.mocked(generateApi.deleteContentBlock).mockRejectedValue(new Error('fail'))

    mockUseGenerate.mockReturnValue({
      status: 'done',
      output: '{"items":[]}',
      error: null,
      generate: vi.fn(),
      abort: vi.fn(),
    })

    render(<GeneratePanel {...defaultProps} existingBlocks={[existingBlock]} />)

    const user = userEvent.setup()
    await user.click(screen.getByTestId('insert-btn'))

    await waitFor(() => {
      expect(screen.getByText('Failed to replace existing content. Please try again.')).toBeInTheDocument()
    })
    expect(generateApi.saveContentBlock).not.toHaveBeenCalled()
  })
})
