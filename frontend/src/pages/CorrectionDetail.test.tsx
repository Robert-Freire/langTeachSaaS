import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import CorrectionDetail from './CorrectionDetail'
import type { CorrectionDetailDto } from '@/types/correction'

const mockGet = vi.fn()
const mockGenerate = vi.fn()
const mockDownload = vi.fn()

vi.mock('@/api/corrections', () => ({
  getCorrection: (...args: unknown[]) => mockGet(...args),
  generateCorrection: (...args: unknown[]) => mockGenerate(...args),
  downloadCorrectionDocx: (...args: unknown[]) => mockDownload(...args),
}))

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/students/:id/corrections/:correctionId" element={<CorrectionDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function corregida(): CorrectionDetailDto {
  return {
    id: 'cor-1',
    studentId: 'stu-1',
    schemaVersion: 1,
    status: 'Corregida',
    assignmentTitle: 'Una tarde',
    assignmentPrompt: null,
    studentText: 'Ayer voy a casa.',
    markedUpOutput: null,
    tags: [
      { category: 'G', spannedText: 'voy', startIndex: 5, endIndex: 8, explanation: 'pasado', correctedForm: 'fui', orderIndex: 0 },
    ],
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z',
    correctedAt: '2026-05-01T00:00:00Z',
  }
}

describe('CorrectionDetail', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockGenerate.mockReset()
    mockDownload.mockReset()
  })

  it('renders Pendiente without markup or Corregir button', async () => {
    mockGet.mockResolvedValue({ ...corregida(), status: 'Pendiente', studentText: null, tags: [] })
    renderAt('/students/stu-1/corrections/cor-1')
    await waitFor(() => expect(screen.getByText(/aún está pendiente/i)).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Corregir' })).not.toBeInTheDocument()
  })

  it('renders Entregada with student text and Corregir button', async () => {
    mockGet.mockResolvedValue({ ...corregida(), status: 'Entregada', tags: [] })
    renderAt('/students/stu-1/corrections/cor-1')
    expect(await screen.findByRole('button', { name: 'Corregir' })).toBeInTheDocument()
  })

  it('switches to generating state on Corregir click', async () => {
    mockGet.mockResolvedValue({ ...corregida(), status: 'Entregada', tags: [] })
    let resolve: (v: CorrectionDetailDto) => void = () => {}
    mockGenerate.mockImplementation(() => new Promise<CorrectionDetailDto>((r) => { resolve = r }))
    renderAt('/students/stu-1/corrections/cor-1')
    fireEvent.click(await screen.findByRole('button', { name: 'Corregir' }))
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument())
    resolve(corregida())
  })

  it('shows Failed state with Retry on POST error', async () => {
    mockGet.mockResolvedValue({ ...corregida(), status: 'Entregada', tags: [] })
    mockGenerate.mockRejectedValue(new Error('boom'))
    renderAt('/students/stu-1/corrections/cor-1')
    fireEvent.click(await screen.findByRole('button', { name: 'Corregir' }))
    expect(await screen.findByRole('button', { name: /Reintentar/ })).toBeInTheDocument()
  })

  it('renders Corregida with marked-up text and Descargar button', async () => {
    mockGet.mockResolvedValue(corregida())
    renderAt('/students/stu-1/corrections/cor-1')
    await waitFor(() => expect(screen.getByTestId('marked-up-text')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /Descargar .docx/ })).toBeInTheDocument()
  })

  it('renders Corregida with zero tags as plain text', async () => {
    mockGet.mockResolvedValue({ ...corregida(), tags: [] })
    renderAt('/students/stu-1/corrections/cor-1')
    expect(await screen.findByText(/Sin observaciones/i)).toBeInTheDocument()
  })

  it('triggers .docx download on click', async () => {
    mockGet.mockResolvedValue(corregida())
    mockDownload.mockResolvedValue(undefined)
    renderAt('/students/stu-1/corrections/cor-1')
    const btn = await screen.findByRole('button', { name: /Descargar .docx/ })
    fireEvent.click(btn)
    await waitFor(() => expect(mockDownload).toHaveBeenCalledWith('stu-1', 'cor-1', 'Una tarde'))
  })

  it('shows download error inline when endpoint missing', async () => {
    mockGet.mockResolvedValue(corregida())
    mockDownload.mockRejectedValue(new Error('501'))
    renderAt('/students/stu-1/corrections/cor-1')
    fireEvent.click(await screen.findByRole('button', { name: /Descargar .docx/ }))
    expect(await screen.findByText(/Descarga aún no disponible/i)).toBeInTheDocument()
  })
})
