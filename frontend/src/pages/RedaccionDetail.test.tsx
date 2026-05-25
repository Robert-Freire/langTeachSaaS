import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import RedaccionDetail from './RedaccionDetail'
import type { CorrectionDetail } from '@/api/corrections'

const mockGet = vi.fn()
const mockCorregir = vi.fn()
const mockDownload = vi.fn()

vi.mock('@/api/corrections', async () => {
  const actual = await vi.importActual<typeof import('@/api/corrections')>('@/api/corrections')
  return {
    ...actual,
    getCorrection: (...args: unknown[]) => mockGet(...args),
    corregirCorrection: (...args: unknown[]) => mockCorregir(...args),
    downloadCorrectionDocx: (...args: unknown[]) => mockDownload(...args),
  }
})

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/students/:id/redacciones/:correctionId" element={<RedaccionDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function corregida(): CorrectionDetail {
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
      { category: 'G', spannedText: 'voy', startIndex: 5, endIndex: 8, explanation: 'pasado', correctedForm: 'fui', orderIndex: 0, filterStatus: 'kept' },
    ],
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z',
    correctedAt: '2026-05-01T00:00:00Z',
  }
}

describe('RedaccionDetail', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockCorregir.mockReset()
    mockDownload.mockReset()
  })

  it('renders Pendiente without markup or Corregir button', async () => {
    mockGet.mockResolvedValue({ ...corregida(), status: 'Pendiente', studentText: null, tags: [] })
    renderAt('/students/stu-1/redacciones/cor-1')
    await waitFor(() => expect(screen.getByText(/aún está pendiente/i)).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Corregir' })).not.toBeInTheDocument()
  })

  it('renders Entregada with student text and Corregir button', async () => {
    mockGet.mockResolvedValue({ ...corregida(), status: 'Entregada', tags: [] })
    renderAt('/students/stu-1/redacciones/cor-1')
    expect(await screen.findByRole('button', { name: 'Corregir' })).toBeInTheDocument()
  })

  it('switches to generating state on Corregir click', async () => {
    mockGet.mockResolvedValue({ ...corregida(), status: 'Entregada', tags: [] })
    let resolve: () => void = () => {}
    mockCorregir.mockImplementation(() => new Promise<void>((r) => { resolve = r }))
    renderAt('/students/stu-1/redacciones/cor-1')
    fireEvent.click(await screen.findByRole('button', { name: 'Corregir' }))
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument())
    resolve()
  })

  it('shows Failed state with Retry on POST error', async () => {
    mockGet.mockResolvedValue({ ...corregida(), status: 'Entregada', tags: [] })
    mockCorregir.mockRejectedValue(new Error('boom'))
    renderAt('/students/stu-1/redacciones/cor-1')
    fireEvent.click(await screen.findByRole('button', { name: 'Corregir' }))
    expect(await screen.findByRole('button', { name: /Reintentar/ })).toBeInTheDocument()
  })

  it('shows the quota block (no Retry) when corregir is refused over the monthly limit', async () => {
    mockGet.mockResolvedValue({ ...corregida(), status: 'Entregada', tags: [] })
    mockCorregir.mockRejectedValue({
      isAxiosError: true,
      response: { status: 429, data: { message: 'Monthly generation limit reached.', resetsAt: '2026-06-01T00:00:00Z' } },
    })
    renderAt('/students/stu-1/redacciones/cor-1')
    fireEvent.click(await screen.findByRole('button', { name: 'Corregir' }))
    expect(await screen.findByText(/límite mensual de generaciones/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Reintentar/ })).not.toBeInTheDocument()
  })

  it('renders Corregida with marked-up text and Descargar button', async () => {
    mockGet.mockResolvedValue(corregida())
    renderAt('/students/stu-1/redacciones/cor-1')
    await waitFor(() => expect(screen.getByTestId('marked-up-text')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /Descargar .docx/ })).toBeInTheDocument()
  })

  it('renders Corregida with zero tags as plain text', async () => {
    mockGet.mockResolvedValue({ ...corregida(), tags: [] })
    renderAt('/students/stu-1/redacciones/cor-1')
    expect(await screen.findByText(/Sin observaciones/i)).toBeInTheDocument()
  })

  it('triggers .docx download on click', async () => {
    mockGet.mockResolvedValue(corregida())
    mockDownload.mockResolvedValue(undefined)
    renderAt('/students/stu-1/redacciones/cor-1')
    const btn = await screen.findByRole('button', { name: /Descargar .docx/ })
    fireEvent.click(btn)
    await waitFor(() => expect(mockDownload).toHaveBeenCalledWith('stu-1', 'cor-1', 'Una tarde', 'student'))
  })

  it('shows download error inline when endpoint missing', async () => {
    mockGet.mockResolvedValue(corregida())
    mockDownload.mockRejectedValue(new Error('501'))
    renderAt('/students/stu-1/redacciones/cor-1')
    fireEvent.click(await screen.findByRole('button', { name: /Descargar .docx/ }))
    expect(await screen.findByText(/Descarga aún no disponible/i)).toBeInTheDocument()
  })

  describe('above-level errors (teacher view, #1351)', () => {
    function withAboveLevel(): CorrectionDetail {
      return {
        ...corregida(),
        studentText: 'Ayer voy a casa aunque hubiera preferido quedarme.',
        tags: [
          { category: 'G', spannedText: 'voy', startIndex: 5, endIndex: 8, explanation: 'pasado', correctedForm: 'fui', orderIndex: 0, filterStatus: 'kept' },
          { category: 'G', spannedText: 'hubiera', startIndex: 23, endIndex: 30, explanation: 'subjuntivo avanzado', correctedForm: 'habría', orderIndex: 1, filterStatus: 'removed' },
        ],
      }
    }

    it('hides the view toggle when there are no above-level errors', async () => {
      mockGet.mockResolvedValue(corregida())
      renderAt('/students/stu-1/redacciones/cor-1')
      await screen.findByRole('button', { name: /Descargar .docx/ })
      expect(screen.queryByRole('group', { name: /Vista de errores/i })).not.toBeInTheDocument()
    })

    it('shows the toggle and reveals the above-level error only in teacher view', async () => {
      mockGet.mockResolvedValue(withAboveLevel())
      renderAt('/students/stu-1/redacciones/cor-1')
      // Default (student) view: above-level span hidden.
      await screen.findByRole('group', { name: /Vista de errores/i })
      expect(screen.queryByLabelText(/por encima del nivel/i)).not.toBeInTheDocument()
      // Switch to teacher view.
      fireEvent.click(screen.getByRole('button', { name: /Todos los errores/i }))
      expect(await screen.findByLabelText(/por encima del nivel/i)).toBeInTheDocument()
    })

    it('downloads the complete version with view=teacher', async () => {
      mockGet.mockResolvedValue(withAboveLevel())
      mockDownload.mockResolvedValue(undefined)
      renderAt('/students/stu-1/redacciones/cor-1')
      fireEvent.click(await screen.findByRole('button', { name: /Versión completa/i }))
      await waitFor(() => expect(mockDownload).toHaveBeenCalledWith('stu-1', 'cor-1', 'Una tarde', 'teacher'))
    })
  })

  describe('server-driven Corrigiendo (fresh page load mid-correction)', () => {
    it('renders spinner branch when data.status is Corrigiendo and viewState is idle', async () => {
      mockGet.mockResolvedValue({ ...corregida(), status: 'Corrigiendo', tags: [] })
      renderAt('/students/stu-1/redacciones/cor-1')
      const btn = await screen.findByRole('button', { name: /Corrigiendo/ })
      expect(btn).toBeDisabled()
    })

    it('shows slow hint after 60 seconds when arriving mid-correction', async () => {
      vi.useFakeTimers()
      try {
        mockGet.mockResolvedValue({ ...corregida(), status: 'Corrigiendo', tags: [] })
        renderAt('/students/stu-1/redacciones/cor-1')
        // advance just enough to flush the initial query resolution without looping the refetch interval
        await act(async () => { await vi.advanceTimersByTimeAsync(100) })
        expect(screen.queryByTestId('hint-slow')).not.toBeInTheDocument()
        act(() => vi.advanceTimersByTime(60_001))
        expect(screen.getByTestId('hint-slow')).toBeInTheDocument()
      } finally {
        vi.useRealTimers()
      }
    })
  })

  describe('slow-correction UX hints', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    async function renderGenerating() {
      mockGet.mockResolvedValue({ ...corregida(), status: 'Entregada', tags: [] })
      mockCorregir.mockImplementation(() => new Promise(() => {}))
      renderAt('/students/stu-1/redacciones/cor-1')
      // react-query may schedule state updates via setTimeout(0); runAllTimersAsync
      // fires those timers AND flushes the resulting promise chain.
      await act(async () => { await vi.runAllTimersAsync() })
      fireEvent.click(screen.getByRole('button', { name: 'Corregir' }))
      await act(async () => {})  // flush onMutate state update + useEffect timer registration
    }

    it('shows slow hint after 60 seconds in generating state', async () => {
      await renderGenerating()

      expect(screen.queryByTestId('hint-slow')).not.toBeInTheDocument()

      act(() => vi.advanceTimersByTime(60_001))

      expect(screen.getByTestId('hint-slow')).toBeInTheDocument()
      expect(screen.queryByTestId('hint-very-slow')).not.toBeInTheDocument()
    })

    it('shows very-slow hint after 4 minutes in generating state', async () => {
      await renderGenerating()

      act(() => vi.advanceTimersByTime(4 * 60_000 + 1))

      expect(screen.getByTestId('hint-very-slow')).toBeInTheDocument()
    })
  })
})
