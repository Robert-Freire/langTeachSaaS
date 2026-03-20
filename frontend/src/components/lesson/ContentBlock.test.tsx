import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ContentBlock } from './ContentBlock'
import type { ContentBlockDto } from '../../api/generate'
import * as generateApi from '../../api/generate'

// Minimal renderer that just echoes parsedContent as JSON for inspection
vi.mock('./contentRegistry', () => ({
  getRenderer: () => ({
    Editor: ({ parsedContent, onChange }: { parsedContent: unknown; onChange: (v: string) => void }) => (
      <div>
        <span data-testid="parsed-snapshot">{JSON.stringify(parsedContent)}</span>
        <button onClick={() => onChange('{"edited":true}')}>trigger-change</button>
      </div>
    ),
    Preview: ({ parsedContent }: { parsedContent: unknown }) => (
      <span data-testid="preview-snapshot">{JSON.stringify(parsedContent)}</span>
    ),
    Student: () => null,
  }),
}))

vi.mock('./ContentErrorBoundary', () => ({
  ContentErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('../../api/generate', async (importOriginal) => {
  const actual = await importOriginal<typeof generateApi>()
  return {
    ...actual,
    updateEditedContent: vi.fn(),
    deleteContentBlock: vi.fn(),
    resetEditedContent: vi.fn(),
  }
})

function makeBlock(overrides: Partial<ContentBlockDto> = {}): ContentBlockDto {
  return {
    id: 'block-1',
    lessonSectionId: 'section-1',
    blockType: 'conversation',
    generatedContent: '{"scenarios":[{"setup":"test"}]}',
    editedContent: null,
    isEdited: false,
    generationParams: null,
    parsedContent: { scenarios: [{ setup: 'test' }] },
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('ContentBlock - parsedContent derivation', () => {
  it('derives parsedContent from local value, not stale block prop', async () => {
    const block = makeBlock()
    render(
      <ContentBlock
        block={block}
        lessonId="lesson-1"
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onRegenerate={vi.fn()}
      />
    )

    // Initial parsedContent matches generatedContent
    expect(screen.getByTestId('parsed-snapshot').textContent).toContain('test')

    // Simulate editor change
    await userEvent.click(screen.getByText('trigger-change'))
    expect(screen.getByTestId('parsed-snapshot').textContent).toBe('{"edited":true}')
  })

  it('strips markdown code fences before parsing', () => {
    const block = makeBlock({
      generatedContent: '```json\n{"scenarios":[{"setup":"fenced"}]}\n```',
      parsedContent: null,
    })
    render(
      <ContentBlock
        block={block}
        lessonId="lesson-1"
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onRegenerate={vi.fn()}
      />
    )
    expect(screen.getByTestId('parsed-snapshot').textContent).toContain('fenced')
  })

  it('returns null parsedContent when value is not valid JSON', () => {
    const block = makeBlock({ generatedContent: 'not json at all', parsedContent: null })
    render(
      <ContentBlock
        block={block}
        lessonId="lesson-1"
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onRegenerate={vi.fn()}
      />
    )
    expect(screen.getByTestId('parsed-snapshot').textContent).toBe('null')
  })
})

describe('ContentBlock - regenerate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls onRegenerate when clicking Regenerate button', async () => {
    const block = makeBlock()
    const onRegenerate = vi.fn()
    render(
      <ContentBlock
        block={block}
        lessonId="lesson-1"
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onRegenerate={onRegenerate}
      />
    )

    await userEvent.click(screen.getByTestId('regenerate-btn'))
    expect(onRegenerate).toHaveBeenCalledWith()
  })
})

describe('ContentBlock - dirty / save state', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows Save button only when dirty', async () => {
    const block = makeBlock()
    render(
      <ContentBlock
        block={block}
        lessonId="lesson-1"
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onRegenerate={vi.fn()}
      />
    )
    expect(screen.queryByTestId('save-btn')).toBeNull()

    await userEvent.click(screen.getByText('trigger-change'))
    expect(screen.getByTestId('save-btn')).toBeInTheDocument()
  })

  it('clears Unsaved changes badge after successful save', async () => {
    const block = makeBlock()
    const updated = makeBlock({ editedContent: '{"edited":true}', isEdited: true })
    vi.mocked(generateApi.updateEditedContent).mockResolvedValue(updated)

    const onUpdate = vi.fn()
    const props = { block, lessonId: 'lesson-1', onUpdate, onDelete: vi.fn(), onRegenerate: vi.fn() }
    const { rerender } = render(<ContentBlock {...props} />)

    await userEvent.click(screen.getByText('trigger-change'))
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()

    await userEvent.click(screen.getByTestId('save-btn'))
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith(updated))

    // Simulate parent re-rendering with the saved block
    rerender(<ContentBlock {...props} block={updated} />)

    expect(screen.queryByText('Unsaved changes')).toBeNull()
    expect(screen.queryByText('Modified')).toBeNull()
  })

  it('does not show Modified badge when block.isEdited is true but not dirty', () => {
    const block = makeBlock({
      editedContent: '{"scenarios":[{"setup":"test"}]}',
      generatedContent: '{"scenarios":[{"setup":"test"}]}',
      isEdited: true,
    })
    render(
      <ContentBlock
        block={block}
        lessonId="lesson-1"
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onRegenerate={vi.fn()}
      />
    )
    expect(screen.queryByText('Modified')).toBeNull()
    expect(screen.queryByText('Unsaved changes')).toBeNull()
  })
})
