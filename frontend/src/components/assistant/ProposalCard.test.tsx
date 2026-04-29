import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect } from 'vitest'
import ProposalCard from './ProposalCard'
import type { ProposalWithStatus } from '@/hooks/useAtelierAssistant'

function makeProposal(overrides: Partial<ProposalWithStatus> = {}): ProposalWithStatus {
  return {
    id: 'p1',
    type: 'student',
    field: 'cefrLevel',
    label: 'CEFR Level',
    oldValue: 'A2',
    newValue: 'B1',
    status: 'proposed',
    undoVisible: false,
    ...overrides,
  }
}

function renderCard(proposal: ProposalWithStatus, handlers = {}) {
  const props = {
    onApply: vi.fn(),
    onDismiss: vi.fn(),
    onUndo: vi.fn(),
    onRetry: vi.fn(),
    onModify: vi.fn(),
    onRedirectToChat: vi.fn(),
    ...handlers,
  }
  return { ...render(<ProposalCard proposal={proposal} {...props} />), props }
}

describe('ProposalCard', () => {
  it('proposed: shows Apply and Dismiss buttons', () => {
    renderCard(makeProposal({ status: 'proposed' }))
    expect(screen.getByTestId('apply-btn-p1')).toBeInTheDocument()
    expect(screen.getByTestId('dismiss-btn-p1')).toBeInTheDocument()
  })

  it('proposed: shows diff with old and new value', () => {
    renderCard(makeProposal({ oldValue: 'A2', newValue: 'B1' }))
    expect(screen.getByText('A2')).toBeInTheDocument()
    expect(screen.getByText('B1')).toBeInTheDocument()
    expect(screen.getByText('A2').className).toContain('line-through')
  })

  it('proposed: shows only new value when no old value', () => {
    renderCard(makeProposal({ oldValue: null, newValue: 'Review passive voice' }))
    expect(screen.getByText('Review passive voice')).toBeInTheDocument()
    expect(screen.queryByText('→')).not.toBeInTheDocument()
  })

  it('proposed: calls onApply with id when Apply clicked', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    renderCard(makeProposal(), { onApply })
    await user.click(screen.getByTestId('apply-btn-p1'))
    expect(onApply).toHaveBeenCalledWith('p1')
  })

  it('proposed: calls onDismiss with id when Dismiss clicked', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    renderCard(makeProposal(), { onDismiss })
    await user.click(screen.getByTestId('dismiss-btn-p1'))
    expect(onDismiss).toHaveBeenCalledWith('p1')
  })

  it('applied: shows Applied pill, no action buttons', () => {
    renderCard(makeProposal({ status: 'applied' }))
    expect(screen.getByText(/applied/i)).toBeInTheDocument()
    expect(screen.queryByTestId('apply-btn-p1')).not.toBeInTheDocument()
    expect(screen.queryByTestId('dismiss-btn-p1')).not.toBeInTheDocument()
  })

  it('dismissed: shows Dismissed pill and reduced opacity', () => {
    renderCard(makeProposal({ status: 'dismissed', undoVisible: false }))
    expect(screen.getByText(/dismissed/i)).toBeInTheDocument()
    expect(screen.getByTestId('proposal-card-p1').className).toContain('opacity-40')
  })

  it('dismissed: shows Undo button when undoVisible is true', () => {
    renderCard(makeProposal({ status: 'dismissed', undoVisible: true }))
    expect(screen.getByTestId('undo-btn-p1')).toBeInTheDocument()
  })

  it('dismissed: hides Undo button when undoVisible is false', () => {
    renderCard(makeProposal({ status: 'dismissed', undoVisible: false }))
    expect(screen.queryByTestId('undo-btn-p1')).not.toBeInTheDocument()
  })

  it('dismissed: calls onUndo with id when Undo clicked', async () => {
    const user = userEvent.setup()
    const onUndo = vi.fn()
    renderCard(makeProposal({ status: 'dismissed', undoVisible: true }), { onUndo })
    await user.click(screen.getByTestId('undo-btn-p1'))
    expect(onUndo).toHaveBeenCalledWith('p1')
  })

  it('error: shows Error pill, error message, Retry and Dismiss buttons', () => {
    renderCard(makeProposal({ status: 'error', errorMessage: 'Network error' }))
    expect(screen.getAllByText(/error/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Network error')).toBeInTheDocument()
    expect(screen.getByTestId('retry-btn-p1')).toBeInTheDocument()
  })

  it('error: calls onRetry with id when Retry clicked', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    renderCard(makeProposal({ status: 'error' }), { onRetry })
    await user.click(screen.getByTestId('retry-btn-p1'))
    expect(onRetry).toHaveBeenCalledWith('p1')
  })

  it('session type: uses Calendar icon config (violet accent)', () => {
    const { container } = renderCard(makeProposal({ type: 'session' }))
    expect(container.querySelector('.bg-violet-500')).toBeInTheDocument()
  })

  it('todo type: uses CheckSquare icon config (emerald accent)', () => {
    const { container } = renderCard(makeProposal({ type: 'todo', oldValue: null, newValue: 'Review passive voice' }))
    expect(container.querySelector('.bg-emerald-500')).toBeInTheDocument()
  })

  it('proposed: shows Modify button', () => {
    renderCard(makeProposal({ status: 'proposed' }))
    expect(screen.getByTestId('modify-btn-p1')).toBeInTheDocument()
  })

  it('applied: does not show Modify button', () => {
    renderCard(makeProposal({ status: 'applied' }))
    expect(screen.queryByTestId('modify-btn-p1')).not.toBeInTheDocument()
  })

  it('dismissed: does not show Modify button', () => {
    renderCard(makeProposal({ status: 'dismissed', undoVisible: false }))
    expect(screen.queryByTestId('modify-btn-p1')).not.toBeInTheDocument()
  })

  it('clicking Modify shows inline input with current value', async () => {
    const user = userEvent.setup()
    renderCard(makeProposal({ status: 'proposed', newValue: 'B1' }))
    await user.click(screen.getByTestId('modify-btn-p1'))
    const input = screen.getByTestId('modify-input-p1') as HTMLInputElement
    expect(input).toBeInTheDocument()
    expect(input.value).toBe('B1')
  })

  it('Enter in inline input commits and calls onModify', async () => {
    const user = userEvent.setup()
    const onModify = vi.fn()
    renderCard(makeProposal({ status: 'proposed', newValue: 'B1' }), { onModify })
    await user.click(screen.getByTestId('modify-btn-p1'))
    const input = screen.getByTestId('modify-input-p1')
    await user.clear(input)
    await user.type(input, 'B2')
    await user.keyboard('{Enter}')
    expect(onModify).toHaveBeenCalledWith('p1', 'B2')
    expect(screen.queryByTestId('modify-input-p1')).not.toBeInTheDocument()
  })

  it('Escape in inline input cancels without calling onModify', async () => {
    const user = userEvent.setup()
    const onModify = vi.fn()
    renderCard(makeProposal({ status: 'proposed', newValue: 'B1' }), { onModify })
    await user.click(screen.getByTestId('modify-btn-p1'))
    await user.type(screen.getByTestId('modify-input-p1'), 'B2')
    await user.keyboard('{Escape}')
    expect(onModify).not.toHaveBeenCalled()
    expect(screen.queryByTestId('modify-input-p1')).not.toBeInTheDocument()
  })

  it('Save button commits and calls onModify', async () => {
    const user = userEvent.setup()
    const onModify = vi.fn()
    renderCard(makeProposal({ status: 'proposed', newValue: 'B1' }), { onModify })
    await user.click(screen.getByTestId('modify-btn-p1'))
    const input = screen.getByTestId('modify-input-p1')
    await user.clear(input)
    await user.type(input, 'B2')
    await user.click(screen.getByTestId('modify-save-btn-p1'))
    expect(onModify).toHaveBeenCalledWith('p1', 'B2')
  })

  it('Cancel button exits edit mode without calling onModify', async () => {
    const user = userEvent.setup()
    const onModify = vi.fn()
    renderCard(makeProposal({ status: 'proposed', newValue: 'B1' }), { onModify })
    await user.click(screen.getByTestId('modify-btn-p1'))
    await user.click(screen.getByTestId('modify-cancel-btn-p1'))
    expect(onModify).not.toHaveBeenCalled()
    expect(screen.queryByTestId('modify-input-p1')).not.toBeInTheDocument()
  })

  it('Wrong entity button calls onRedirectToChat with prefill and exits edit mode', async () => {
    const user = userEvent.setup()
    const onRedirectToChat = vi.fn()
    renderCard(makeProposal({ status: 'proposed', type: 'session', field: 'title' }), { onRedirectToChat })
    await user.click(screen.getByTestId('modify-btn-p1'))
    await user.click(screen.getByTestId('redirect-to-chat-btn-p1'))
    expect(onRedirectToChat).toHaveBeenCalledWith(expect.stringContaining('student profile'))
    expect(screen.queryByTestId('modify-input-p1')).not.toBeInTheDocument()
  })

  it('empty value on Enter does not call onModify', async () => {
    const user = userEvent.setup()
    const onModify = vi.fn()
    renderCard(makeProposal({ status: 'proposed', newValue: 'B1' }), { onModify })
    await user.click(screen.getByTestId('modify-btn-p1'))
    const input = screen.getByTestId('modify-input-p1')
    await user.clear(input)
    await user.keyboard('{Enter}')
    expect(onModify).not.toHaveBeenCalled()
  })
})
