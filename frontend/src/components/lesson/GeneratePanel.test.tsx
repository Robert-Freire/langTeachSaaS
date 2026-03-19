import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GeneratePanel } from './GeneratePanel'

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

const defaultProps = {
  lessonId: 'lesson-1',
  sectionId: 'section-1',
  sectionType: 'Presentation' as const,
  lessonContext: {
    language: 'French',
    cefrLevel: 'B1',
    topic: 'Greetings',
  },
  onInsert: vi.fn(),
  onClose: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GeneratePanel – streaming states', () => {
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
    // Spinner has role="status"
    expect(output.getAttribute('role')).toBe('status')
    // No vocabulary table rendered
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
    expect(output.getAttribute('role')).toBeNull() // not a status spinner
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
