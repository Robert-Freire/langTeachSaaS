import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { exportLessonPdf, type ExportMode } from '@/api/export'
import { logger } from '@/lib/logger'

interface ExportButtonProps {
  lessonId: string
}

export function ExportButton({ lessonId }: ExportButtonProps) {
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const handleExport = async (mode: ExportMode) => {
    setLoading(true)
    setOpen(false)
    try {
      await exportLessonPdf(lessonId, mode)
    } catch (err) {
      logger.error('ExportButton', 'PDF export failed', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            disabled={loading}
            aria-label="Export PDF"
            data-testid="export-pdf-btn"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
            ) : (
              <Download className="h-4 w-4 text-zinc-500" />
            )}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-48 p-1">
        <button
          className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-zinc-100 transition-colors"
          onClick={() => handleExport('teacher')}
          data-testid="export-teacher"
        >
          Teacher Copy
        </button>
        <button
          className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-zinc-100 transition-colors"
          onClick={() => handleExport('student')}
          data-testid="export-student"
        >
          Student Handout
        </button>
      </PopoverContent>
    </Popover>
  )
}
