import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RedaccionesTab } from './RedaccionesTab'
import * as correctionsApi from '../../api/corrections'
import type { CorrectionDetail, CorrectionSummary } from '../../api/corrections'

vi.mock('../../api/corrections')

const STUDENT_ID = 'student-1'

const pendiente: CorrectionSummary = {
  id: 'c-pend',
  assignmentTitle: 'Mi rutina',
  status: 'Pendiente',
  createdAt: '2026-05-06T10:00:00Z',
  correctedAt: null,
}
const entregada: CorrectionSummary = {
  id: 'c-ent',
  assignmentTitle: 'Carta a un extraterrestre',
  status: 'Entregada',
  createdAt: '2026-05-07T10:00:00Z',
  correctedAt: null,
}
const corregida: CorrectionSummary = {
  id: 'c-cor',
  assignmentTitle: 'Una redacción muy larga sobre una experiencia inolvidable de mi infancia',
  status: 'Corregida',
  createdAt: '2026-05-04T10:00:00Z',
  correctedAt: '2026-05-04T11:00:00Z',
}

const detail: CorrectionDetail = {
  id: 'c-pend',
  studentId: STUDENT_ID,
  schemaVersion: 1,
  status: 'Pendiente',
  assignmentTitle: 'Mi rutina',
  assignmentPrompt: null,
  studentText: null,
  markedUpOutput: null,
  tags: [],
  createdAt: '2026-05-06T10:00:00Z',
  updatedAt: '2026-05-06T10:00:00Z',
  correctedAt: null,
}

function wrapper(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('RedaccionesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders empty state with CTA when no corrections', async () => {
    vi.mocked(correctionsApi.listCorrections).mockResolvedValue([])
    wrapper(<RedaccionesTab studentId={STUDENT_ID} />)

    expect(await screen.findByTestId('redacciones-empty')).toBeInTheDocument()
    expect(screen.getByText(/Aún no hay redacciones/)).toBeInTheDocument()
    expect(screen.getByTestId('redacciones-empty-cta')).toBeInTheDocument()
  })

  it('renders list with correct status badges', async () => {
    vi.mocked(correctionsApi.listCorrections).mockResolvedValue([pendiente, entregada, corregida])
    wrapper(<RedaccionesTab studentId={STUDENT_ID} />)

    expect(await screen.findByTestId('redacciones-list')).toBeInTheDocument()
    expect(screen.getByTestId('redaccion-status-c-pend')).toHaveTextContent('Pendiente')
    expect(screen.getByTestId('redaccion-status-c-ent')).toHaveTextContent('Entregada')
    expect(screen.getByTestId('redaccion-status-c-cor')).toHaveTextContent('Corregida')
  })

  it('does NOT render Corregir on Pendiente cards', async () => {
    vi.mocked(correctionsApi.listCorrections).mockResolvedValue([pendiente])
    wrapper(<RedaccionesTab studentId={STUDENT_ID} />)

    await screen.findByTestId('redaccion-card-c-pend')
    expect(screen.queryByTestId('redaccion-corregir-c-pend')).not.toBeInTheDocument()
  })

  it('renders Corregir on Entregada cards; clicking it fires corregirCorrection', async () => {
    const corrigiendoDetail: CorrectionDetail = {
      ...detail,
      id: 'c-ent',
      status: 'Corrigiendo',
    }
    vi.mocked(correctionsApi.listCorrections).mockResolvedValue([entregada])
    vi.mocked(correctionsApi.corregirCorrection).mockResolvedValue(corrigiendoDetail)
    wrapper(<RedaccionesTab studentId={STUDENT_ID} />)

    const button = await screen.findByTestId('redaccion-corregir-c-ent')
    fireEvent.click(button)

    await waitFor(() => {
      expect(correctionsApi.corregirCorrection).toHaveBeenCalledWith(STUDENT_ID, 'c-ent')
    })
  })

  it('shows generation error when corregir rejects with backend message', async () => {
    vi.mocked(correctionsApi.listCorrections).mockResolvedValue([entregada])
    vi.mocked(correctionsApi.corregirCorrection).mockRejectedValue({
      response: { status: 501, data: { message: 'AI correction generation is not implemented yet.' } },
    })
    wrapper(<RedaccionesTab studentId={STUDENT_ID} />)

    fireEvent.click(await screen.findByTestId('redaccion-corregir-c-ent'))
    expect(await screen.findByTestId('redacciones-generation-error')).toHaveTextContent(
      'AI correction generation is not implemented yet.',
    )
  })

  it('create form Save is enabled even with blank title', async () => {
    vi.mocked(correctionsApi.listCorrections).mockResolvedValue([])
    wrapper(<RedaccionesTab studentId={STUDENT_ID} />)

    fireEvent.click(await screen.findByTestId('redacciones-empty-cta'))

    const save = screen.getByTestId('correction-drawer-save')
    expect(save).not.toBeDisabled()
  })

  it('submitting create form with blank title auto-generates Redacción YYYY-MM-DD', async () => {
    vi.mocked(correctionsApi.listCorrections).mockResolvedValue([])
    vi.mocked(correctionsApi.createCorrection).mockResolvedValue({ ...detail, id: 'new' })
    wrapper(<RedaccionesTab studentId={STUDENT_ID} />)

    fireEvent.click(await screen.findByTestId('redacciones-empty-cta'))
    // leave title blank, just click save
    fireEvent.click(screen.getByTestId('correction-drawer-save'))

    await waitFor(() => {
      const call = vi.mocked(correctionsApi.createCorrection).mock.calls[0]
      const body = call[1] as { assignmentTitle?: string }
      expect(body.assignmentTitle).toMatch(/^Redacción \d{4}-\d{2}-\d{2}$/)
    })
  })

  it('submitting create form calls createCorrection with trimmed title and optional fields', async () => {
    vi.mocked(correctionsApi.listCorrections).mockResolvedValue([])
    vi.mocked(correctionsApi.createCorrection).mockResolvedValue({
      ...detail,
      id: 'new',
      assignmentTitle: 'Carta',
    })
    wrapper(<RedaccionesTab studentId={STUDENT_ID} />)

    fireEvent.click(await screen.findByTestId('redacciones-empty-cta'))
    fireEvent.change(screen.getByTestId('correction-drawer-title'), {
      target: { value: '  Carta  ' },
    })
    fireEvent.change(screen.getByTestId('correction-drawer-prompt'), {
      target: { value: 'Escribe sobre tu rutina' },
    })
    fireEvent.click(screen.getByTestId('correction-drawer-save'))

    await waitFor(() => {
      expect(correctionsApi.createCorrection).toHaveBeenCalledWith(STUDENT_ID, {
        assignmentTitle: 'Carta',
        assignmentPrompt: 'Escribe sobre tu rutina',
        studentText: null,
      })
    })
  })

  it('Cancel discards form, no create call', async () => {
    vi.mocked(correctionsApi.listCorrections).mockResolvedValue([])
    wrapper(<RedaccionesTab studentId={STUDENT_ID} />)

    fireEvent.click(await screen.findByTestId('redacciones-empty-cta'))
    fireEvent.change(screen.getByTestId('correction-drawer-title'), { target: { value: 'Carta' } })
    fireEvent.click(screen.getByTestId('correction-drawer-cancel'))

    expect(correctionsApi.createCorrection).not.toHaveBeenCalled()
    expect(screen.queryByTestId('correction-drawer')).not.toBeInTheDocument()
  })

  it('renders loading skeleton while fetching', () => {
    vi.mocked(correctionsApi.listCorrections).mockReturnValue(new Promise(() => {}))
    wrapper(<RedaccionesTab studentId={STUDENT_ID} />)
    expect(screen.getByTestId('redacciones-loading')).toBeInTheDocument()
  })

  it('renders error state with Retry that refetches', async () => {
    vi.mocked(correctionsApi.listCorrections)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce([pendiente])
    wrapper(<RedaccionesTab studentId={STUDENT_ID} />)

    expect(await screen.findByTestId('redacciones-error')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Reintentar'))

    expect(await screen.findByTestId('redaccion-card-c-pend')).toBeInTheDocument()
  })

  it('list fetch is scoped to the current student', async () => {
    vi.mocked(correctionsApi.listCorrections).mockResolvedValue([])
    wrapper(<RedaccionesTab studentId="other-student-42" />)

    await screen.findByTestId('redacciones-empty')
    expect(correctionsApi.listCorrections).toHaveBeenCalledWith('other-student-42')
    expect(correctionsApi.listCorrections).not.toHaveBeenCalledWith(STUDENT_ID)
  })

  it('truncates long titles with ellipsis class', async () => {
    vi.mocked(correctionsApi.listCorrections).mockResolvedValue([corregida])
    wrapper(<RedaccionesTab studentId={STUDENT_ID} />)

    const title = await screen.findByTestId(`redaccion-title-${corregida.id}`)
    expect(title.className).toContain('truncate')
    expect(title).toHaveAttribute('title', corregida.assignmentTitle)
  })

  it('Corregida card navigates to the detail route on click', async () => {
    vi.mocked(correctionsApi.listCorrections).mockResolvedValue([corregida])
    wrapper(<RedaccionesTab studentId={STUDENT_ID} />)

    const card = await screen.findByTestId(`redaccion-card-${corregida.id}`)
    expect(card.className).toContain('cursor-pointer')
    expect(screen.queryByTestId(`redaccion-edit-${corregida.id}`)).not.toBeInTheDocument()
    expect(screen.queryByTestId(`redaccion-corregir-${corregida.id}`)).not.toBeInTheDocument()
  })

  it('PENDIENTE edit: pasting text and saving calls updateCorrection with studentText', async () => {
    vi.mocked(correctionsApi.listCorrections).mockResolvedValue([pendiente])
    vi.mocked(correctionsApi.getCorrection).mockResolvedValue(detail)
    vi.mocked(correctionsApi.updateCorrection).mockResolvedValue({ ...detail, status: 'Entregada', studentText: 'Gavin text' })
    wrapper(<RedaccionesTab studentId={STUDENT_ID} />)

    fireEvent.click(await screen.findByTestId('redaccion-edit-c-pend'))
    fireEvent.change(await screen.findByTestId('correction-drawer-text'), {
      target: { value: 'Gavin text' },
    })
    fireEvent.click(screen.getByTestId('correction-drawer-save'))

    await waitFor(() => {
      expect(correctionsApi.updateCorrection).toHaveBeenCalledWith(
        STUDENT_ID,
        'c-pend',
        expect.objectContaining({ studentText: 'Gavin text' }),
      )
    })
  })

  it('PENDIENTE edit: save button shows "Guardar y marcar como entregada" when text is present', async () => {
    vi.mocked(correctionsApi.listCorrections).mockResolvedValue([pendiente])
    vi.mocked(correctionsApi.getCorrection).mockResolvedValue(detail)
    wrapper(<RedaccionesTab studentId={STUDENT_ID} />)

    fireEvent.click(await screen.findByTestId('redaccion-edit-c-pend'))
    await screen.findByTestId('correction-drawer-text')
    expect(screen.getByTestId('correction-drawer-save')).toHaveTextContent('Guardar')

    fireEvent.change(screen.getByTestId('correction-drawer-text'), {
      target: { value: 'Gavin text' },
    })
    expect(screen.getByTestId('correction-drawer-save')).toHaveTextContent('Guardar y marcar como entregada')
  })

  it('create with text: clicking Corregir calls createCorrection then corregirCorrection', async () => {
    vi.mocked(correctionsApi.listCorrections).mockResolvedValue([])
    vi.mocked(correctionsApi.createCorrection).mockResolvedValue({ ...detail, id: 'new-id', status: 'Entregada' })
    vi.mocked(correctionsApi.corregirCorrection).mockResolvedValue({ ...detail, id: 'new-id', status: 'Corrigiendo' })
    wrapper(<RedaccionesTab studentId={STUDENT_ID} />)

    fireEvent.click(await screen.findByTestId('redacciones-empty-cta'))
    fireEvent.change(screen.getByTestId('correction-drawer-title'), { target: { value: 'Carta' } })
    fireEvent.change(screen.getByTestId('correction-drawer-text'), { target: { value: 'Gavin text' } })

    expect(screen.getByTestId('correction-drawer-save')).toHaveTextContent('Corregir')
    fireEvent.click(screen.getByTestId('correction-drawer-save'))

    await waitFor(() => {
      expect(correctionsApi.createCorrection).toHaveBeenCalledWith(STUDENT_ID, expect.objectContaining({ studentText: 'Gavin text' }))
    })
    await waitFor(() => {
      expect(correctionsApi.corregirCorrection).toHaveBeenCalledWith(STUDENT_ID, 'new-id')
    })
  })

  it('create without text: clicking Guardar does NOT call corregirCorrection', async () => {
    vi.mocked(correctionsApi.listCorrections).mockResolvedValue([])
    vi.mocked(correctionsApi.createCorrection).mockResolvedValue({ ...detail, id: 'new-id' })
    wrapper(<RedaccionesTab studentId={STUDENT_ID} />)

    fireEvent.click(await screen.findByTestId('redacciones-empty-cta'))
    fireEvent.change(screen.getByTestId('correction-drawer-title'), { target: { value: 'Carta' } })

    expect(screen.getByTestId('correction-drawer-save')).toHaveTextContent('Guardar')
    fireEvent.click(screen.getByTestId('correction-drawer-save'))

    await waitFor(() => {
      expect(correctionsApi.createCorrection).toHaveBeenCalled()
    })
    expect(correctionsApi.corregirCorrection).not.toHaveBeenCalled()
  })

  it('Delete removes the card via mutation and refetch', async () => {
    vi.mocked(correctionsApi.listCorrections)
      .mockResolvedValueOnce([pendiente])
      .mockResolvedValueOnce([])
    vi.mocked(correctionsApi.deleteCorrection).mockResolvedValue()
    wrapper(<RedaccionesTab studentId={STUDENT_ID} />)

    fireEvent.click(await screen.findByTestId('redaccion-delete-c-pend'))

    await waitFor(() => {
      expect(correctionsApi.deleteCorrection).toHaveBeenCalledWith(STUDENT_ID, 'c-pend')
    })
    await waitFor(() => {
      expect(screen.queryByTestId('redaccion-card-c-pend')).not.toBeInTheDocument()
    })
  })
})
