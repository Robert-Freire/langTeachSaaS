import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, Loader2 } from 'lucide-react'
import { uploadMaterial } from '../../api/materials'
import { Button } from '@/components/ui/button'

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
const ALLOWED_EXTENSIONS = '.pdf,.jpg,.jpeg,.png,.webp'

interface MaterialUploadProps {
  lessonId: string
  sectionId: string
}

export function MaterialUpload({ lessonId, sectionId }: MaterialUploadProps) {
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const { mutate: doUpload, isPending } = useMutation({
    mutationFn: (file: File) => uploadMaterial(lessonId, sectionId, file),
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['lesson', lessonId] })
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setError(message)
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Unsupported file type. Allowed: PDF, JPEG, PNG, WebP.')
      e.target.value = ''
      return
    }

    if (file.size > MAX_SIZE_BYTES) {
      setError('File is too large. Maximum size is 10 MB.')
      e.target.value = ''
      return
    }

    doUpload(file)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_EXTENSIONS}
          onChange={handleFileChange}
          className="hidden"
          data-testid="material-file-input"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => fileInputRef.current?.click()}
          data-testid="material-upload-btn"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-1" />
          )}
          {isPending ? 'Uploading...' : 'Upload file'}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive" data-testid="material-upload-error">{error}</p>
      )}
    </div>
  )
}
