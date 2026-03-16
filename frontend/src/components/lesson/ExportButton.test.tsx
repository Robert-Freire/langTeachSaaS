import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ExportButton } from './ExportButton'

vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => ({ getAccessTokenSilently: vi.fn().mockResolvedValue('fake-token') }),
}))

vi.mock('../../api/export', () => ({
  exportLessonPdf: vi.fn(),
}))

import { exportLessonPdf } from '../../api/export'

const mockedExport = vi.mocked(exportLessonPdf)

describe('ExportButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedExport.mockResolvedValue(undefined)
  })

  it('renders the export button', () => {
    render(<ExportButton lessonId="abc-123" />)
    expect(screen.getByTestId('export-pdf-btn')).toBeInTheDocument()
  })

  it('opens dropdown on click and shows both options', async () => {
    const user = userEvent.setup()
    render(<ExportButton lessonId="abc-123" />)
    await user.click(screen.getByTestId('export-pdf-btn'))
    expect(screen.getByTestId('export-teacher')).toBeInTheDocument()
    expect(screen.getByTestId('export-student')).toBeInTheDocument()
  })

  it('calls exportLessonPdf with teacher mode', async () => {
    const user = userEvent.setup()
    render(<ExportButton lessonId="abc-123" />)
    await user.click(screen.getByTestId('export-pdf-btn'))
    await user.click(screen.getByTestId('export-teacher'))
    await waitFor(() => {
      expect(mockedExport).toHaveBeenCalledWith('abc-123', 'teacher')
    })
  })

  it('calls exportLessonPdf with student mode', async () => {
    const user = userEvent.setup()
    render(<ExportButton lessonId="abc-123" />)
    await user.click(screen.getByTestId('export-pdf-btn'))
    await user.click(screen.getByTestId('export-student'))
    await waitFor(() => {
      expect(mockedExport).toHaveBeenCalledWith('abc-123', 'student')
    })
  })
})
