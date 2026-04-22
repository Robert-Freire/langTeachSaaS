import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MultiSelect } from './multi-select'

const OPTIONS = [
  { value: 'es', label: 'Spanish' },
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
]

function renderSelect(selected: string[]) {
  return render(
    <MultiSelect
      options={OPTIONS}
      selected={selected}
      onChange={() => {}}
      placeholder="Select languages"
      triggerId="test-trigger"
      chipTestId="test-chip"
    />
  )
}

describe('MultiSelect trigger summary', () => {
  it('shows placeholder when nothing is selected', () => {
    renderSelect([])
    expect(screen.getByTestId('test-trigger')).toHaveTextContent('Select languages')
  })

  it('shows the language name when 1 is selected', () => {
    renderSelect(['es'])
    expect(screen.getByTestId('test-trigger')).toHaveTextContent('Spanish')
  })

  it('shows "FirstLanguage +1 more" when 2 are selected', () => {
    renderSelect(['es', 'en'])
    expect(screen.getByTestId('test-trigger')).toHaveTextContent('Spanish +1 more')
  })

  it('shows "FirstLanguage +2 more" when 3 are selected', () => {
    renderSelect(['es', 'en', 'fr'])
    expect(screen.getByTestId('test-trigger')).toHaveTextContent('Spanish +2 more')
  })
})
