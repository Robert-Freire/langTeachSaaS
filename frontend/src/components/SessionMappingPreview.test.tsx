import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SessionMappingPreview } from './SessionMappingPreview'
import type { SessionMappingResult } from '../api/curricula'

const EXACT_MAPPING: SessionMappingResult = {
  strategy: 'exact',
  sessionCount: 2,
  unitCount: 2,
  sessions: [
    { sessionIndex: 1, unitRef: 'Nosotros', subFocus: 'Nosotros', rationale: '1 session per unit', grammarFocus: 'El género' },
    { sessionIndex: 2, unitRef: 'Quiero aprender', subFocus: 'Quiero aprender', rationale: '1 session per unit', grammarFocus: null },
  ],
  excludedUnits: [],
}

const EXPAND_MAPPING: SessionMappingResult = {
  strategy: 'expand',
  sessionCount: 6,
  unitCount: 2,
  sessions: [
    { sessionIndex: 1, unitRef: 'Nosotros', subFocus: 'Nosotros: Introduction', rationale: 'Unit spans sessions 1–3', grammarFocus: 'El género' },
    { sessionIndex: 2, unitRef: 'Nosotros', subFocus: 'Nosotros: Practice', rationale: 'Unit spans sessions 1–3', grammarFocus: 'El género' },
    { sessionIndex: 3, unitRef: 'Nosotros', subFocus: 'Nosotros: Production', rationale: 'Unit spans sessions 1–3', grammarFocus: 'El género' },
    { sessionIndex: 4, unitRef: 'Quiero aprender', subFocus: 'Quiero aprender: Introduction', rationale: 'Unit spans sessions 4–6', grammarFocus: null },
    { sessionIndex: 5, unitRef: 'Quiero aprender', subFocus: 'Quiero aprender: Practice', rationale: 'Unit spans sessions 4–6', grammarFocus: null },
    { sessionIndex: 6, unitRef: 'Quiero aprender', subFocus: 'Quiero aprender: Production', rationale: 'Unit spans sessions 4–6', grammarFocus: null },
  ],
  excludedUnits: [],
}

const COMPRESS_MAPPING: SessionMappingResult = {
  strategy: 'compress',
  sessionCount: 2,
  unitCount: 5,
  sessions: [
    { sessionIndex: 1, unitRef: 'Unit 1', subFocus: 'Unit 1', rationale: 'Covers units 1–2 of 5', grammarFocus: null },
    { sessionIndex: 2, unitRef: 'Unit 2', subFocus: 'Unit 2', rationale: 'Covers units 1–2 of 5', grammarFocus: null },
  ],
  excludedUnits: ['Unit 3', 'Unit 4', 'Unit 5'],
}

describe('SessionMappingPreview', () => {
  it('renders with data-testid', () => {
    render(<SessionMappingPreview mapping={EXACT_MAPPING} />)
    expect(screen.getByTestId('session-mapping-preview')).toBeInTheDocument()
  })

  it('shows exact strategy label', () => {
    render(<SessionMappingPreview mapping={EXACT_MAPPING} />)
    expect(screen.getByText('1 session per template unit')).toBeInTheDocument()
  })

  it('shows expand strategy label', () => {
    render(<SessionMappingPreview mapping={EXPAND_MAPPING} />)
    expect(screen.getByText('Units spread across sessions for deeper practice')).toBeInTheDocument()
  })

  it('shows compress strategy label', () => {
    render(<SessionMappingPreview mapping={COMPRESS_MAPPING} />)
    expect(screen.getByText('Partial coverage — limited by session count')).toBeInTheDocument()
  })

  it('lists all sessions for exact mapping', () => {
    render(<SessionMappingPreview mapping={EXACT_MAPPING} />)
    expect(screen.getByText('Nosotros')).toBeInTheDocument()
    expect(screen.getByText('Quiero aprender')).toBeInTheDocument()
  })

  it('shows sub-focus labels for expand strategy', () => {
    render(<SessionMappingPreview mapping={EXPAND_MAPPING} />)
    expect(screen.getByText('Nosotros: Introduction')).toBeInTheDocument()
    expect(screen.getByText('Nosotros: Production')).toBeInTheDocument()
  })

  it('shows rationale for expand strategy', () => {
    render(<SessionMappingPreview mapping={EXPAND_MAPPING} />)
    expect(screen.getByText('Unit spans sessions 1–3')).toBeInTheDocument()
  })

  it('shows excluded units callout for compress strategy', () => {
    render(<SessionMappingPreview mapping={COMPRESS_MAPPING} />)
    const excluded = screen.getByTestId('excluded-units')
    expect(excluded).toBeInTheDocument()
    expect(excluded.textContent).toContain('Unit 3')
    expect(excluded.textContent).toContain('Unit 4')
    expect(excluded.textContent).toContain('Unit 5')
  })

  it('does not show excluded units callout when none excluded', () => {
    render(<SessionMappingPreview mapping={EXACT_MAPPING} />)
    expect(screen.queryByTestId('excluded-units')).not.toBeInTheDocument()
  })
})
