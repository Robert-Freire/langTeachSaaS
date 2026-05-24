import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Download, Loader2, RefreshCw, ThumbsDown, ThumbsUp } from 'lucide-react'
import {
  corregirCorrection,
  downloadCorrectionDocx,
  getCorrection,
  submitCorrectionFeedback,
  type CorrectionDetail,
} from '../api/corrections'
import { getStudent } from '../api/students'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { MarkedUpText } from '@/components/corrections/MarkedUpText'
import { ChipLegend } from '@/components/corrections/ChipLegend'
import { STATUS_BADGE, STATUS_LABEL, estimateCorrectionMinutes } from '@/lib/correction-status'
import { logger } from '../lib/logger'

type ViewState = 'idle' | 'generating' | 'failed'
type ElapsedHint = 'none' | 'slow' | 'very-slow'

export default function RedaccionDetail() {
  const { id, correctionId } = useParams<{ id: string; correctionId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [viewState, setViewState] = useState<ViewState>('idle')
  const [elapsedHint, setElapsedHint] = useState<ElapsedHint>('none')
  const [downloadError, setDownloadError] = useState<string | null>(null)
  // 'student' = level-filtered (the view the student receives, default). 'teacher' = every
  // error detected, including above-level ones the filter suppressed (#1351).
  const [errorView, setErrorView] = useState<'student' | 'teacher'>('student')

  const studentId = id
  const queryKey = ['correction', studentId, correctionId]

  const { data, isLoading, isError } = useQuery<CorrectionDetail>({
    queryKey,
    queryFn: () => getCorrection(studentId!, correctionId!),
    enabled: !!studentId && !!correctionId,
    refetchInterval: (q) => (q.state.data?.status === 'Encolada' || q.state.data?.status === 'Corrigiendo') ? 3000 : false,
  })

  const { data: student } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => getStudent(studentId!),
    enabled: !!studentId,
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

  useEffect(() => {
    const isInProgress = viewState === 'generating' || data?.status === 'Encolada' || data?.status === 'Corrigiendo'
    if (!isInProgress) return
    const slowTimer = setTimeout(() => setElapsedHint('slow'), 60_000)
    const verySlowTimer = setTimeout(() => setElapsedHint('very-slow'), 4 * 60_000)
    return () => {
      clearTimeout(slowTimer)
      clearTimeout(verySlowTimer)
      setElapsedHint('none')
    }
  }, [viewState, data?.status])

  const estimatedMinutes = data?.studentText && student
    ? estimateCorrectionMinutes(data.studentText.split(/\s+/).filter(Boolean).length, student.level.cefrLevel)
    : null

  const onDownload = async (view: 'student' | 'teacher' = 'student') => {
    if (!data) return
    setDownloadError(null)
    try {
      await downloadCorrectionDocx(studentId!, correctionId!, data.assignmentTitle, view)
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
  const isFallida = data.status === 'CorreccionFallida'

  const breadcrumbLabel = student ? `${student.name} / Redacciones` : 'Redacciones'

  // Above-level errors are persisted but hidden from the student default view. The toggle
  // and the teacher download only appear when there is something extra to reveal (#1351).
  const hasAboveLevel = data.tags.some((t) => t.filterStatus === 'removed')
  const visibleTags = errorView === 'teacher'
    ? data.tags
    : data.tags.filter((t) => t.filterStatus !== 'removed')

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          to={`/students/${studentId}?tab=redacciones`}
          className="inline-flex items-center text-sm text-zinc-600 hover:text-zinc-900"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          {breadcrumbLabel}
        </Link>
        <div className="flex items-center gap-2">
          <StatusPill status={data.status} viewState={viewState} />
          {isCorregida && (
            <Button variant="outline" size="sm" onClick={() => onDownload('student')}>
              <Download className="mr-2 h-4 w-4" />
              {hasAboveLevel ? 'Versión del estudiante' : 'Descargar .docx'}
            </Button>
          )}
          {isCorregida && hasAboveLevel && (
            <Button variant="outline" size="sm" onClick={() => onDownload('teacher')}>
              <Download className="mr-2 h-4 w-4" />
              Versión completa
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">{data.assignmentTitle}</h1>
        {data.assignmentPrompt && (
          <p className="text-sm text-zinc-600">{data.assignmentPrompt}</p>
        )}
        {isCorregida && data.tags.length > 0 && <ChipLegend />}
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

      {isFallida && data.studentText && (
        <div className="space-y-4">
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            La corrección automática no se pudo completar. Puedes volver a intentarlo.
          </div>
          <ReadingColumn text={data.studentText} />
          <Button onClick={() => corregir.mutate()} disabled={corregir.isPending}>
            Reintentar corrección
          </Button>
        </div>
      )}

      {isEntregada && data.studentText && viewState === 'idle' && (
        <div className="space-y-4">
          <ReadingColumn text={data.studentText} />
          <Button onClick={() => corregir.mutate()} disabled={corregir.isPending}>
            Corregir
          </Button>
        </div>
      )}

      {(viewState === 'generating' || data.status === 'Encolada' || data.status === 'Corrigiendo') && data.studentText && (
        <div className="space-y-4">
          <ReadingColumn text={data.studentText} />
          <Button disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Corrigiendo
          </Button>
          {elapsedHint === 'none' && estimatedMinutes !== null && (
            <p data-testid="hint-estimate" className="text-sm text-zinc-500">
              Esto tardará aproximadamente {estimatedMinutes} minuto{estimatedMinutes === 1 ? '' : 's'}.
              {' '}Puedes cerrar esta pestaña o ir a otra parte de Atelier; te avisamos cuando esté listo.
            </p>
          )}
          {elapsedHint === 'slow' && (
            <p data-testid="hint-slow" className="text-sm text-zinc-500">
              Esto puede tardar hasta 3 minutos para textos largos. Puedes esperar aquí.
            </p>
          )}
          {elapsedHint === 'very-slow' && (
            <p data-testid="hint-very-slow" className="text-sm text-zinc-500">
              Seguimos procesando.{' '}
              <Link
                to={`/students/${studentId}?tab=redacciones`}
                className="underline hover:text-zinc-800"
              >
                Puedes volver a la lista
              </Link>{' '}
              y revisar más tarde.
            </p>
          )}
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
          {hasAboveLevel && (
            <ErrorViewToggle view={errorView} onChange={setErrorView} />
          )}
          {errorView === 'teacher' && (
            <p className="text-sm text-zinc-500">
              Mostrando todos los errores detectados. Las marcas por encima del nivel (subrayado discontinuo)
              {' '}no se muestran al estudiante.
            </p>
          )}
          {visibleTags.length === 0 ? (
            <>
              <ReadingColumn text={data.studentText} />
              <p className="text-sm text-zinc-600">Sin observaciones, todo correcto.</p>
            </>
          ) : (
            <MarkedUpText studentText={data.studentText} tags={visibleTags} />
          )}
          <CorrectionFeedback studentId={studentId!} correctionId={correctionId!} />
        </>
      )}
    </div>
  )
}

interface ErrorViewToggleProps {
  view: 'student' | 'teacher'
  onChange: (view: 'student' | 'teacher') => void
}

function ErrorViewToggle({ view, onChange }: ErrorViewToggleProps) {
  const options: { value: 'student' | 'teacher'; label: string }[] = [
    { value: 'student', label: 'Nivel del estudiante' },
    { value: 'teacher', label: 'Todos los errores' },
  ]
  return (
    <div role="group" aria-label="Vista de errores" className="inline-flex bg-[#F4F2FD] p-1 rounded-xl">
      {options.map((opt) => {
        const active = view === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              active ? 'bg-white text-[#3525CD] shadow-sm' : 'text-zinc-500 hover:text-[#3525CD]'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

type FeedbackInputState = 'idle' | 'down-open'

interface CorrectionFeedbackProps {
  studentId: string
  correctionId: string
}

function CorrectionFeedback({ studentId, correctionId }: CorrectionFeedbackProps) {
  const [inputState, setInputState] = useState<FeedbackInputState>('idle')
  const inputRef = useRef<HTMLInputElement>(null)

  const mutation = useMutation({
    mutationFn: (body: { rating: 'up' | 'down'; reason?: string | null }) =>
      submitCorrectionFeedback(studentId, correctionId, body),
    onError: (err) => logger.error('CorrectionFeedback', 'submit failed', err),
  })

  function handleDown() {
    const reason = inputRef.current?.value?.trim() || undefined
    mutation.mutate({ rating: 'down', reason: reason ?? null })
  }

  if (mutation.isSuccess) {
    return (
      <p className="text-sm text-zinc-500" role="status">
        Gracias por tu feedback.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-500">¿Fue útil esta corrección?</p>
      {inputState !== 'down-open' && (
        <div className="flex items-center gap-3">
          <button
            aria-label="Positivo"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate({ rating: 'up' })}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-zinc-400 transition-colors hover:text-emerald-600 disabled:opacity-50"
          >
            <ThumbsUp className="h-4 w-4" />
          </button>
          <button
            aria-label="Mejorable"
            disabled={mutation.isPending}
            onClick={() => setInputState('down-open')}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-zinc-400 transition-colors hover:text-red-500 disabled:opacity-50"
          >
            <ThumbsDown className="h-4 w-4" />
          </button>
          {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />}
        </div>
      )}
      {inputState === 'down-open' && (
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            autoFocus
            maxLength={500}
            placeholder="¿Qué mejorarías?"
            disabled={mutation.isPending}
            onKeyDown={(e) => e.key === 'Enter' && handleDown()}
            className="flex-1 h-8 text-sm"
          />
          <Button
            size="sm"
            variant="ghost"
            disabled={mutation.isPending}
            onClick={handleDown}
          >
            Enviar
          </Button>
          <button
            aria-label="Cancelar"
            disabled={mutation.isPending}
            onClick={() => setInputState('idle')}
            className="text-xs text-zinc-400 hover:text-zinc-600"
          >
            Cancelar
          </button>
        </div>
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
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide ${STATUS_BADGE[status]}`}
    >
      {STATUS_LABEL[status]}
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
