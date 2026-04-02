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

  it('hides block-level Regenerate button when parsedContent is null (error state)', () => {
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
    expect(screen.queryByTestId('regenerate-btn')).not.toBeInTheDocument()
  })

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

describe('ContentBlock - targeted difficulties', () => {
  it('renders difficulty badges when generationParams contains targetedDifficulties', () => {
    const params = JSON.stringify({
      targetedDifficulties: [
        { category: 'grammar', item: 'ser/estar', severity: 'high' },
      ],
    })
    const block = makeBlock({ generationParams: params })
    render(
      <ContentBlock
        block={block}
        lessonId="lesson-1"
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onRegenerate={vi.fn()}
      />
    )

    expect(screen.getByTestId('targeted-difficulties')).toBeInTheDocument()
    expect(screen.getByText('[grammar]')).toBeInTheDocument()
    expect(screen.getByText('ser/estar')).toBeInTheDocument()
  })

  it('does not render difficulty badges when generationParams has no difficulties', () => {
    const block = makeBlock({ generationParams: JSON.stringify({ lessonId: 'abc' }) })
    render(
      <ContentBlock
        block={block}
        lessonId="lesson-1"
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onRegenerate={vi.fn()}
      />
    )

    expect(screen.queryByTestId('targeted-difficulties')).toBeNull()
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

describe('ContentBlock - learning targets', () => {
  it('renders learning target badges when learningTargets prop is provided', () => {
    const block = makeBlock()
    render(
      <ContentBlock
        block={block}
        lessonId="lesson-1"
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onRegenerate={vi.fn()}
        learningTargets={['Subjunctive mood', 'Speaking']}
      />
    )
    expect(screen.getByTestId('learning-targets')).toBeInTheDocument()
    expect(screen.getByText('Subjunctive mood')).toBeInTheDocument()
    expect(screen.getByText('Speaking')).toBeInTheDocument()
  })

  it('renders labels as read-only badges when learningTargets is provided but onUpdateLearningTargets is not', () => {
    const block = makeBlock()
    render(
      <ContentBlock
        block={block}
        lessonId="lesson-1"
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onRegenerate={vi.fn()}
        learningTargets={['Grammar', 'Reading']}
      />
    )
    expect(screen.getByTestId('learning-targets')).toBeInTheDocument()
    expect(screen.getByText('Grammar')).toBeInTheDocument()
    expect(screen.getByText('Reading')).toBeInTheDocument()
    expect(screen.queryByTestId('edit-targets-btn')).toBeNull()
  })

  it('does not render targets area when learningTargets is null and no onUpdateLearningTargets', () => {
    const block = makeBlock()
    render(
      <ContentBlock
        block={block}
        lessonId="lesson-1"
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onRegenerate={vi.fn()}
        learningTargets={null}
      />
    )
    expect(screen.queryByTestId('learning-targets')).toBeNull()
  })

  it('shows "Edit targets" button when onUpdateLearningTargets is provided', () => {
    const block = makeBlock()
    render(
      <ContentBlock
        block={block}
        lessonId="lesson-1"
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onRegenerate={vi.fn()}
        learningTargets={[]}
        onUpdateLearningTargets={vi.fn()}
      />
    )
    expect(screen.getByTestId('edit-targets-btn')).toBeInTheDocument()
  })

  it('clicking Edit targets opens tag editor with existing labels', async () => {
    const user = userEvent.setup()
    const block = makeBlock()
    render(
      <ContentBlock
        block={block}
        lessonId="lesson-1"
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onRegenerate={vi.fn()}
        learningTargets={['Grammar']}
        onUpdateLearningTargets={vi.fn()}
      />
    )
    await user.click(screen.getByTestId('edit-targets-btn'))
    expect(screen.getByTestId('new-tag-input')).toBeInTheDocument()
    expect(screen.getByText('Grammar')).toBeInTheDocument()
  })

  it('pressing Enter in input adds a new tag to the draft', async () => {
    const user = userEvent.setup()
    const block = makeBlock()
    render(
      <ContentBlock
        block={block}
        lessonId="lesson-1"
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onRegenerate={vi.fn()}
        learningTargets={[]}
        onUpdateLearningTargets={vi.fn()}
      />
    )
    await user.click(screen.getByTestId('edit-targets-btn'))
    const input = screen.getByTestId('new-tag-input')
    await user.type(input, 'New label{Enter}')
    expect(screen.getByText('New label')).toBeInTheDocument()
  })

  it('clicking Save calls onUpdateLearningTargets with updated labels', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn().mockResolvedValue(undefined)
    const block = makeBlock()
    render(
      <ContentBlock
        block={block}
        lessonId="lesson-1"
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onRegenerate={vi.fn()}
        learningTargets={['Grammar']}
        onUpdateLearningTargets={onUpdate}
      />
    )
    await user.click(screen.getByTestId('edit-targets-btn'))
    await user.click(screen.getByTestId('save-targets-btn'))
    expect(onUpdate).toHaveBeenCalledWith(['Grammar'])
  })

  it('save failure keeps edit mode open and shows error', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn().mockRejectedValue(new Error('Network error'))
    const block = makeBlock()
    render(
      <ContentBlock
        block={block}
        lessonId="lesson-1"
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onRegenerate={vi.fn()}
        learningTargets={[]}
        onUpdateLearningTargets={onUpdate}
      />
    )
    await user.click(screen.getByTestId('edit-targets-btn'))
    await user.click(screen.getByTestId('save-targets-btn'))
    await waitFor(() => {
      expect(screen.getByText('Failed to save learning targets. Please try again.')).toBeInTheDocument()
    })
    expect(screen.getByTestId('new-tag-input')).toBeInTheDocument() // still in edit mode
  })
})

describe('ContentBlock - learning-target editing state reset on navigation', () => {
  it('resets editing state when block.id changes (lesson navigation)', async () => {
    const user = userEvent.setup()
    const block = makeBlock({ id: 'block-1' })
    const onUpdate = vi.fn().mockResolvedValue(undefined)
    const { rerender } = render(
      <ContentBlock
        block={block}
        lessonId="lesson-1"
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onRegenerate={vi.fn()}
        learningTargets={['grammar']}
        onUpdateLearningTargets={onUpdate}
      />
    )

    // Open editing mode
    await user.click(screen.getByTestId('edit-targets-btn'))
    expect(screen.getByTestId('new-tag-input')).toBeInTheDocument()

    // Navigate to a different lesson/block — block.id changes
    rerender(
      <ContentBlock
        block={makeBlock({ id: 'block-2', generatedContent: '{"scenarios":[{"setup":"new"}]}' })}
        lessonId="lesson-2"
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onRegenerate={vi.fn()}
        learningTargets={['vocabulary']}
        onUpdateLearningTargets={onUpdate}
      />
    )

    // Editing state should be reset — new-tag-input should not be visible
    expect(screen.queryByTestId('new-tag-input')).toBeNull()
  })
})

describe('ContentBlock - grammar warnings', () => {
  it('renders grammar warnings banner when warnings are present', () => {
    const block = makeBlock({
      grammarWarnings: [
        { ruleId: 'ser-estar-de-acuerdo', correction: "Use 'estar' not 'ser' with 'de acuerdo'", severity: 'high', matchedText: 'eres de acuerdo' },
      ],
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
    expect(screen.getByTestId('grammar-warnings')).toBeInTheDocument()
    expect(screen.getByText(/eres de acuerdo/)).toBeInTheDocument()
    expect(screen.getByText(/estar.*not.*ser.*de acuerdo/i)).toBeInTheDocument()
  })

  it('does not render warnings banner when grammarWarnings is null', () => {
    const block = makeBlock({ grammarWarnings: null })
    render(
      <ContentBlock
        block={block}
        lessonId="lesson-1"
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onRegenerate={vi.fn()}
      />
    )
    expect(screen.queryByTestId('grammar-warnings')).not.toBeInTheDocument()
  })

  it('does not render warnings banner when grammarWarnings is empty array', () => {
    const block = makeBlock({ grammarWarnings: [] })
    render(
      <ContentBlock
        block={block}
        lessonId="lesson-1"
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onRegenerate={vi.fn()}
      />
    )
    expect(screen.queryByTestId('grammar-warnings')).not.toBeInTheDocument()
  })

  it('shows correct severity badge for each warning', () => {
    const block = makeBlock({
      grammarWarnings: [
        { ruleId: 'por-purpose-clause', correction: "Use 'para' for purpose", severity: 'medium', matchedText: 'por mejorar' },
        { ruleId: 'ser-estar-de-acuerdo', correction: "Use estar", severity: 'high', matchedText: 'eres de acuerdo' },
      ],
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
    const badges = screen.getAllByTestId('grammar-warning-severity')
    expect(badges).toHaveLength(2)
    expect(badges[0].textContent).toBe('medium')
    expect(badges[1].textContent).toBe('high')
  })
})
