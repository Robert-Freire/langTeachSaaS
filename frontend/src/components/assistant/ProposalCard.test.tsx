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

  it('newStudent type: uses teal accent', () => {
    const newStudentPayload = JSON.stringify({ name: 'Sofía', learningLanguage: 'inglés', cefrLevel: 'B1' })
    const { container } = renderCard(makeProposal({ type: 'newStudent', field: 'profile', label: 'New Student', oldValue: null, newValue: newStudentPayload }))
    expect(container.querySelector('.bg-teal-500')).toBeInTheDocument()
  })

  it('newStudent type: renders inline field inputs instead of diff', () => {
    const newStudentPayload = JSON.stringify({ name: 'Sofía', learningLanguage: 'inglés', cefrLevel: 'B1' })
    renderCard(makeProposal({ type: 'newStudent', field: 'profile', label: 'New Student', oldValue: null, newValue: newStudentPayload }))
    expect(screen.getByDisplayValue('Sofía')).toBeInTheDocument()
    expect(screen.getByDisplayValue('inglés')).toBeInTheDocument()
  })

  it('newStudent type: calls onEdit when a field is changed', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    const newStudentPayload = JSON.stringify({ name: 'Sofía', learningLanguage: 'inglés', cefrLevel: 'B1' })
    renderCard(
      makeProposal({ type: 'newStudent', field: 'profile', label: 'New Student', oldValue: null, newValue: newStudentPayload }),
      { onEdit },
    )
    // Component is fully controlled: typing appends to the current prop value
    const nameInput = screen.getByDisplayValue('Sofía')
    await user.type(nameInput, 'X')
    expect(onEdit).toHaveBeenCalled()
    const lastCall = onEdit.mock.calls[onEdit.mock.calls.length - 1]
    expect(lastCall[0]).toBe('p1')
    // The name field has the original value plus the typed character
    expect(JSON.parse(lastCall[1]).name).toBe('SofíaX')
  })
})
