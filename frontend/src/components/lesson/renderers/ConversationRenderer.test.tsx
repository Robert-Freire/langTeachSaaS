import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { ConversationRenderer } from './ConversationRenderer'
import type { ConversationContent } from '../../../types/contentTypes'

function makeContent(overrides?: Partial<ConversationContent['scenarios'][0]>): ConversationContent {
  return {
    scenarios: [{
      setup: 'You are at a restaurant.',
      roleA: 'Waiter',
      roleB: 'Customer',
      roleAPhrases: ['Here is your table.', 'Can I take your order?'],
      roleBPhrases: ["I'd like the pasta.", 'What do you recommend?'],
      ...overrides,
    }],
  }
}

const raw = (c: ConversationContent) => JSON.stringify(c)

describe('ConversationRenderer.Student — role selection', () => {
  it('shows (You)/(Partner) badges with role A auto-selected', () => {
    const content = makeContent()
    render(<ConversationRenderer.Student rawContent={raw(content)} parsedContent={content} />)

    expect(screen.getByTestId('student-role-a-0')).toHaveTextContent('(You)')
    expect(screen.getByTestId('student-role-b-0')).toHaveTextContent('(Partner)')
  })

  it('keeps role selected when tapped again (no deselect)', async () => {
    const content = makeContent()
    render(<ConversationRenderer.Student rawContent={raw(content)} parsedContent={content} />)

    await userEvent.click(screen.getByTestId('student-role-a-0'))
    await userEvent.click(screen.getByTestId('student-role-a-0'))
    expect(screen.getByTestId('student-role-a-0')).toHaveTextContent('(You)')
  })

  it('clears checked phrases when role changes', async () => {
    const content = makeContent()
    render(<ConversationRenderer.Student rawContent={raw(content)} parsedContent={content} />)

    // Select role A so phrase chips are visible
    await userEvent.click(screen.getByTestId('student-role-a-0'))
    const chip = screen.getByTestId('student-phrase-chip-0-0')
    await userEvent.click(chip)
    expect(chip).toHaveClass('line-through')

    // Switch to role B — checks should clear
    await userEvent.click(screen.getByTestId('student-role-b-0'))
    // New chips for role B — none should be checked
    const newChip = screen.getByTestId('student-phrase-chip-0-0')
    expect(newChip).not.toHaveClass('line-through')
  })

  it('shows Your Phrases section immediately with role A auto-selected', () => {
    const content = makeContent()
    render(<ConversationRenderer.Student rawContent={raw(content)} parsedContent={content} />)

    expect(screen.getByText('Your Phrases')).toBeInTheDocument()
    expect(screen.getByTestId('student-role-a-0')).toHaveTextContent('(You)')
  })
})

describe('ConversationRenderer.Student — phrase checklist', () => {
  it('toggles line-through and checkmark on phrase chip click', async () => {
    const content = makeContent()
    render(<ConversationRenderer.Student rawContent={raw(content)} parsedContent={content} />)

    // Select a role to show phrase chips
    await userEvent.click(screen.getByTestId('student-role-a-0'))
    const chip = screen.getByTestId('student-phrase-chip-0-0')

    await userEvent.click(chip)
    expect(chip).toHaveClass('line-through')
    expect(chip).toHaveTextContent('✓')

    await userEvent.click(chip)
    expect(chip).not.toHaveClass('line-through')
    expect(chip).not.toHaveTextContent('✓')
  })
})

describe('ConversationRenderer.Student — backward compatibility', () => {
  it('does not crash when roleAPhrases/roleBPhrases are undefined (old format)', () => {
    const legacyContent = {
      scenarios: [{
        setup: 'Old lesson.',
        roleA: 'Waiter',
        roleB: 'Customer',
        keyPhrases: ["I'd like to order..."],
      }],
    }
    expect(() =>
      render(
        <ConversationRenderer.Student
          rawContent={JSON.stringify(legacyContent)}
          parsedContent={legacyContent}
        />
      )
    ).not.toThrow()
    // Legacy phrases should still be visible
    expect(screen.getByText("I'd like to order...")).toBeInTheDocument()
  })

  it('renders ungrouped fallback for old keyPhrases content', () => {
    const legacyContent = {
      scenarios: [{
        setup: 'Old lesson.',
        roleA: 'Waiter',
        roleB: 'Customer',
        keyPhrases: ['Phrase A', 'Phrase B'],
      }],
    }
    render(
      <ConversationRenderer.Student
        rawContent={JSON.stringify(legacyContent)}
        parsedContent={legacyContent}
      />
    )
    expect(screen.getByText('Phrase A')).toBeInTheDocument()
    expect(screen.getByText('Phrase B')).toBeInTheDocument()
  })
})
