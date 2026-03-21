import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Download, Trash2, Loader2 } from 'lucide-react'
import { deleteMaterial, type Material } from '../../api/materials'
import { Button } from '@/components/ui/button'

interface MaterialPreviewProps {
  material: Material
  lessonId: string
  sectionId: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function MaterialPreview({ material, lessonId, sectionId }: MaterialPreviewProps) {
  const queryClient = useQueryClient()
  const isImage = material.contentType.startsWith('image/')
  const previewUrl = material.previewUrl

  const { mutate: doDelete, isPending: isDeleting } = useMutation({
    mutationFn: () => deleteMaterial(lessonId, sectionId, material.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson', lessonId] })
    },
  })

  return (
    <div
      className="flex items-center gap-3 rounded-md border p-2 bg-muted/30"
      data-testid={`material-preview-${material.id}`}
    >
      {isImage && previewUrl ? (
        <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
          <img
            src={previewUrl}
            alt={material.fileName}
            className="h-12 w-12 rounded object-cover border"
            data-testid="material-thumbnail"
          />
        </a>
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded border bg-muted shrink-0">
          <FileText className="h-6 w-6 text-muted-foreground" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" data-testid="material-filename">
          {material.fileName}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(material.sizeBytes)}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {previewUrl && (
          <a
            href={previewUrl}
            download={material.fileName}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent hover:text-accent-foreground"
            data-testid="material-download-btn"
          >
            <Download className="h-4 w-4" />
          </a>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => doDelete()}
          disabled={isDeleting}
          data-testid="material-delete-btn"
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
}
