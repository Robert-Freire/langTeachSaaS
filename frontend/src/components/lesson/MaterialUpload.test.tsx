import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MaterialUpload } from './MaterialUpload'

const mockUploadMaterial = vi.fn()

vi.mock('../../api/materials', () => ({
  uploadMaterial: (...args: unknown[]) => mockUploadMaterial(...args),
}))

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('MaterialUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders upload button', () => {
    renderWithProviders(<MaterialUpload lessonId="l1" sectionId="s1" />)
    expect(screen.getByTestId('material-upload-btn')).toBeInTheDocument()
    expect(screen.getByText('Upload file')).toBeInTheDocument()
  })

  it('rejects invalid file types with error message', async () => {
    renderWithProviders(<MaterialUpload lessonId="l1" sectionId="s1" />)
    const input = screen.getByTestId('material-file-input') as HTMLInputElement

    const invalidFile = new File(['content'], 'doc.txt', { type: 'text/plain' })

    // applyAccept: false bypasses the browser-level accept filter so our onChange validation runs
    await act(async () => {
      await userEvent.upload(input, invalidFile, { applyAccept: false })
    })

    expect(screen.getByTestId('material-upload-error')).toHaveTextContent('Unsupported file type')
    expect(mockUploadMaterial).not.toHaveBeenCalled()
  })

  it('rejects files over 10MB with error message', async () => {
    renderWithProviders(<MaterialUpload lessonId="l1" sectionId="s1" />)
    const input = screen.getByTestId('material-file-input') as HTMLInputElement

    const largeContent = new ArrayBuffer(11 * 1024 * 1024)
    const largeFile = new File([largeContent], 'big.png', { type: 'image/png' })

    await act(async () => {
      await userEvent.upload(input, largeFile)
    })

    expect(screen.getByTestId('material-upload-error')).toHaveTextContent('too large')
    expect(mockUploadMaterial).not.toHaveBeenCalled()
  })

  it('calls upload API on valid file selection', async () => {
    mockUploadMaterial.mockResolvedValue({
      id: 'mat-1',
      fileName: 'test.png',
      contentType: 'image/png',
      sizeBytes: 1024,
      previewUrl: 'http://localhost/test.png',
      createdAt: '2026-03-21T00:00:00Z',
    })

    renderWithProviders(<MaterialUpload lessonId="l1" sectionId="s1" />)
    const input = screen.getByTestId('material-file-input') as HTMLInputElement

    const validFile = new File(['image-data'], 'test.png', { type: 'image/png' })

    await act(async () => {
      await userEvent.upload(input, validFile)
    })

    expect(mockUploadMaterial).toHaveBeenCalledWith('l1', 's1', expect.any(File))
  })
})
