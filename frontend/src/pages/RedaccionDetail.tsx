import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Download, Loader2, RefreshCw } from 'lucide-react'
import {
  corregirCorrection,
  downloadCorrectionDocx,
  getCorrection,
  type CorrectionDetail,
} from '../api/corrections'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { MarkedUpText } from '@/components/corrections/MarkedUpText'
import { logger } from '../lib/logger'

type ViewState = 'idle' | 'generating' | 'failed'

export default function RedaccionDetail() {
  const { id, correctionId } = useParams<{ id: string; correctionId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [viewState, setViewState] = useState<ViewState>('idle')
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const studentId = id
  const queryKey = ['correction', studentId, correctionId]

  const { data, isLoading, isError } = useQuery<CorrectionDetail>({
    queryKey,
    queryFn: () => getCorrection(studentId!, correctionId!),
    enabled: !!studentId && !!correctionId,
  })

  const corregir = useMutation({
    mutationFn: () => corregirCorrection(studentId!, correctionId!),
    onMutate: () => setViewState('generating'),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey })
      setViewState('idle')
    },
    onError: (err) => {
      logger.error('RedaccionDetail', 'Generation failed', err)
      setViewState('failed')
    },
  })

  const onDownload = async () => {
    if (!data) return
    setDownloadError(null)
    try {
      await downloadCorrectionDocx(studentId!, correctionId!, data.assignmentTitle)
    } catch (err) {
      logger.error('RedaccionDetail', '.docx download failed', err)
      setDownloadError('Descarga aún no disponible')
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 p-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="mx-auto w-full max-w-3xl p-6">
        <p className="text-zinc-700">No se pudo cargar la corrección.</p>
        <Button variant="ghost" onClick={() => navigate(-1)} className="mt-3">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>
    )
  }

  const isCorregida = data.status === 'Corregida'
  const isEntregada = data.status === 'Entregada'
  const isPendiente = data.status === 'Pendiente'

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          to={`/students/${studentId}?tab=redacciones`}
          className="inline-flex items-center text-sm text-zinc-600 hover:text-zinc-900"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Redacciones
        </Link>
        <div className="flex items-center gap-2">
          <StatusPill status={data.status} viewState={viewState} />
          {isCorregida && (
            <Button variant="outline" size="sm" onClick={onDownload}>
              <Download className="mr-2 h-4 w-4" />
              Descargar .docx
            </Button>
          )}
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">{data.assignmentTitle}</h1>
        {data.assignmentPrompt && (
          <p className="mt-1 text-sm text-zinc-600">{data.assignmentPrompt}</p>
        )}
      </div>

      {downloadError && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {downloadError}
        </div>
      )}

      {isPendiente && (
        <p className="text-sm text-zinc-600">
          Esta redacción aún está pendiente. El estudiante todavía no ha entregado el texto.
        </p>
      )}

      {isEntregada && data.studentText && viewState === 'idle' && (
        <div className="space-y-4">
          <ReadingColumn text={data.studentText} />
          <Button onClick={() => corregir.mutate()} disabled={corregir.isPending}>
            Corregir
          </Button>
        </div>
      )}

      {viewState === 'generating' && data.studentText && (
        <div className="space-y-4">
          <ReadingColumn text={data.studentText} />
          <Button disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Corrigiendo
          </Button>
        </div>
      )}

      {viewState === 'failed' && data.studentText && (
        <div className="space-y-4">
          <ReadingColumn text={data.studentText} />
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            <p className="font-medium">No se pudo generar la corrección.</p>
            <p className="mt-1">Inténtalo de nuevo. Si el problema persiste, vuelve más tarde.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => corregir.mutate()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
          </div>
        </div>
      )}

      {isCorregida && data.studentText && (
        <>
          {data.tags.length === 0 ? (
            <>
              <ReadingColumn text={data.studentText} />
              <p className="text-sm text-zinc-600">Sin observaciones, todo correcto.</p>
            </>
          ) : (
            <MarkedUpText studentText={data.studentText} tags={data.tags} />
          )}
        </>
      )}
    </div>
  )
}

interface StatusPillProps {
  status: CorrectionDetail['status']
  viewState: ViewState
}

function StatusPill({ status, viewState }: StatusPillProps) {
  if (viewState === 'generating') {
    return (
      <span
        role="status"
        aria-label="Corrigiendo en curso"
        className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-amber-800"
      >
        <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
        Corrigiendo
      </span>
    )
  }
  if (viewState === 'failed') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-red-800">
        Error
      </span>
    )
  }
  const palette: Record<typeof status, string> = {
    Pendiente: 'bg-zinc-100 text-zinc-700',
    Entregada: 'bg-indigo-50 text-indigo-700',
    Corrigiendo: 'bg-amber-50 text-amber-800',
    Corregida: 'bg-emerald-50 text-emerald-800',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide ${palette[status]}`}
    >
      {status}
    </span>
  )
}

function ReadingColumn({ text }: { text: string }) {
  return (
    <div className="prose prose-zinc max-w-prose text-base leading-relaxed text-zinc-800">
      <p className="whitespace-pre-wrap">{text}</p>
    </div>
  )
}
