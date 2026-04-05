import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TopicTagsInput } from './TopicTagsInput'
import type { TopicTag } from '../../api/sessionLogs'

// Mock the ui/select module since it uses base-ui which doesn't work in jsdom
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange }: { children: React.ReactNode; onValueChange?: (v: string) => void }) => (
    <div data-testid="select-root" onClick={() => onValueChange?.('grammar')}>{children}</div>
  ),
  SelectTrigger: ({ children, ...props }: { children: React.ReactNode; [k: string]: unknown }) => (
    <button type="button" {...props}>{children}</button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-value={value}>{children}</div>
  ),
}))

describe('TopicTagsInput', () => {
  it('renders empty with no tags', () => {
    render(<TopicTagsInput value={[]} onChange={vi.fn()} />)
    expect(screen.getByTestId('topic-tags-input')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Remove tag/i })).not.toBeInTheDocument()
  })

  it('add button is disabled when tag name is empty', () => {
    render(<TopicTagsInput value={[]} onChange={vi.fn()} />)
    expect(screen.getByTestId('topic-tag-add')).toBeDisabled()
  })

  it('calls onChange with new tag when Add is clicked', () => {
    const onChange = vi.fn()
    render(<TopicTagsInput value={[]} onChange={onChange} />)
    fireEvent.change(screen.getByTestId('topic-tag-name'), { target: { value: 'preterito indefinido' } })
    fireEvent.click(screen.getByTestId('topic-tag-add'))
    expect(onChange).toHaveBeenCalledWith([{ tag: 'preterito indefinido' }])
  })

  it('calls onChange with new tag on Enter key', () => {
    const onChange = vi.fn()
    render(<TopicTagsInput value={[]} onChange={onChange} />)
    const input = screen.getByTestId('topic-tag-name')
    fireEvent.change(input, { target: { value: 'viajes' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith([{ tag: 'viajes' }])
  })

  it('removes a tag when remove button is clicked', () => {
    const onChange = vi.fn()
    const tags: TopicTag[] = [{ tag: 'grammar topic' }]
    render(<TopicTagsInput value={tags} onChange={onChange} />)
    fireEvent.click(screen.getByTestId('topic-tag-remove-0'))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('renders existing tags', () => {
    const tags: TopicTag[] = [
      { tag: 'ser/estar' },
      { tag: 'viajes', category: 'vocabulary' },
    ]
    render(<TopicTagsInput value={tags} onChange={vi.fn()} />)
    expect(screen.getByText('ser/estar')).toBeInTheDocument()
    expect(screen.getByText('viajes')).toBeInTheDocument()
    expect(screen.getByText('(Vocabulary)')).toBeInTheDocument()
  })

  it('renders all four curriculum-aligned category options', () => {
    const { container } = render(<TopicTagsInput value={[]} onChange={vi.fn()} />)
    const items = container.querySelectorAll('[data-value]')
    const values = Array.from(items).map((el) => el.getAttribute('data-value'))
    expect(values).toContain('grammar')
    expect(values).toContain('vocabulary')
    expect(values).toContain('competency')
    expect(values).toContain('communicativeFunction')
    expect(values).toHaveLength(4)
  })
})
