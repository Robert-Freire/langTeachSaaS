import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ContentEditorParseError } from './ContentEditorParseError'

describe('ContentEditorParseError', () => {
  it('shows unexpected format message by default', () => {
    render(<ContentEditorParseError rawContent="{}" onChange={vi.fn()} />)
    expect(screen.getByText(/unexpected format/i)).toBeInTheDocument()
  })

  it('shows incomplete message when isIncomplete is true', () => {
    render(<ContentEditorParseError rawContent="{" onChange={vi.fn()} isIncomplete />)
    expect(screen.getByText(/generation was incomplete/i)).toBeInTheDocument()
  })

  it('calls onRegenerate when Regenerate button is clicked', async () => {
    const onRegenerate = vi.fn()
    render(<ContentEditorParseError rawContent="{}" onChange={vi.fn()} onRegenerate={onRegenerate} />)
    await userEvent.click(screen.getByTestId('parse-error-regenerate-btn'))
    expect(onRegenerate).toHaveBeenCalledOnce()
  })

  it('does not render Regenerate button when onRegenerate is not provided', () => {
    render(<ContentEditorParseError rawContent="{}" onChange={vi.fn()} />)
    expect(screen.queryByTestId('parse-error-regenerate-btn')).not.toBeInTheDocument()
  })

  it('hides the raw textarea by default', () => {
    render(<ContentEditorParseError rawContent="{}" onChange={vi.fn()} />)
    expect(screen.queryByTestId('parse-error-raw-textarea')).not.toBeInTheDocument()
  })

  it('shows raw textarea after clicking Edit manually', async () => {
    render(<ContentEditorParseError rawContent='{"x":1}' onChange={vi.fn()} />)
    await userEvent.click(screen.getByTestId('parse-error-toggle-raw-btn'))
    expect(screen.getByTestId('parse-error-raw-textarea')).toBeInTheDocument()
    expect(screen.getByDisplayValue('{"x":1}')).toBeInTheDocument()
  })

  it('toggles label between Edit manually and Hide raw content', async () => {
    render(<ContentEditorParseError rawContent="{}" onChange={vi.fn()} />)
    const btn = screen.getByTestId('parse-error-toggle-raw-btn')
    expect(btn).toHaveTextContent('Edit manually')
    await userEvent.click(btn)
    expect(btn).toHaveTextContent('Hide raw content')
    await userEvent.click(btn)
    expect(btn).toHaveTextContent('Edit manually')
  })

  it('calls onChange when the raw textarea value changes', async () => {
    const onChange = vi.fn()
    render(<ContentEditorParseError rawContent="{}" onChange={onChange} />)
    await userEvent.click(screen.getByTestId('parse-error-toggle-raw-btn'))
    await userEvent.type(screen.getByTestId('parse-error-raw-textarea'), 'x')
    expect(onChange).toHaveBeenCalled()
  })
})
