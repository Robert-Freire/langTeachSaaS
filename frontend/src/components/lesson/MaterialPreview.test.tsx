import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MaterialPreview } from './MaterialPreview'
import type { Material } from '../../api/materials'

const mockDeleteMaterial = vi.fn()

vi.mock('../../api/materials', () => ({
  deleteMaterial: (...args: unknown[]) => mockDeleteMaterial(...args),
}))

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

const imageMaterial: Material = {
  id: 'mat-1',
  fileName: 'photo.jpg',
  contentType: 'image/jpeg',
  sizeBytes: 2048,
  previewUrl: 'http://localhost:10000/photo.jpg',
  createdAt: '2026-03-21T00:00:00Z',
}

const pdfMaterial: Material = {
  id: 'mat-2',
  fileName: 'worksheet.pdf',
  contentType: 'application/pdf',
  sizeBytes: 5 * 1024 * 1024,
  previewUrl: 'http://localhost:10000/worksheet.pdf',
  createdAt: '2026-03-21T00:00:00Z',
}

describe('MaterialPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders image preview for image files', () => {
    renderWithProviders(<MaterialPreview material={imageMaterial} lessonId="l1" sectionId="s1" />)
    expect(screen.getByTestId('material-thumbnail')).toBeInTheDocument()
    expect(screen.getByTestId('material-filename')).toHaveTextContent('photo.jpg')
  })

  it('renders PDF indicator for PDF files', () => {
    renderWithProviders(<MaterialPreview material={pdfMaterial} lessonId="l1" sectionId="s1" />)
    expect(screen.queryByTestId('material-thumbnail')).not.toBeInTheDocument()
    expect(screen.getByTestId('material-filename')).toHaveTextContent('worksheet.pdf')
    expect(screen.getByText('5.0 MB')).toBeInTheDocument()
  })

  it('delete button shows confirmation dialog and calls API on confirm', async () => {
    mockDeleteMaterial.mockResolvedValue(undefined)
    renderWithProviders(<MaterialPreview material={imageMaterial} lessonId="l1" sectionId="s1" />)

    const deleteBtn = screen.getByTestId('material-delete-btn')
    await act(async () => {
      await userEvent.click(deleteBtn)
    })

    // Confirmation dialog should appear
    expect(screen.getByText('Delete "photo.jpg"?')).toBeInTheDocument()

    // Click Delete to confirm
    const confirmBtn = screen.getByTestId('confirm-delete-material')
    await act(async () => {
      await userEvent.click(confirmBtn)
    })

    expect(mockDeleteMaterial).toHaveBeenCalledWith('l1', 's1', 'mat-1')
  })

  it('delete confirmation dialog Cancel does not call API', async () => {
    renderWithProviders(<MaterialPreview material={imageMaterial} lessonId="l1" sectionId="s1" />)

    const deleteBtn = screen.getByTestId('material-delete-btn')
    await act(async () => {
      await userEvent.click(deleteBtn)
    })

    // Click Cancel
    const cancelBtn = screen.getByRole('button', { name: /cancel/i })
    await act(async () => {
      await userEvent.click(cancelBtn)
    })

    expect(mockDeleteMaterial).not.toHaveBeenCalled()
  })

  it('download button has correct href', () => {
    renderWithProviders(<MaterialPreview material={imageMaterial} lessonId="l1" sectionId="s1" />)
    const downloadBtn = screen.getByTestId('material-download-btn')
    expect(downloadBtn).toHaveAttribute('href', imageMaterial.previewUrl)
  })

  it('falls back to file icon when image fails to load', () => {
    renderWithProviders(<MaterialPreview material={imageMaterial} lessonId="l1" sectionId="s1" />)
    const img = screen.getByTestId('material-thumbnail')

    // Simulate image load error
    act(() => {
      img.dispatchEvent(new Event('error'))
    })

    // Thumbnail should be gone, replaced by file icon
    expect(screen.queryByTestId('material-thumbnail')).not.toBeInTheDocument()
  })
})
