import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { relativeTime } from '@/utils/formatDate'
import {
  listCorrections,
  getCorrection,
  createCorrection,
  updateCorrection,
  deleteCorrection,
  corregirCorrection,
  type CorrectionStatus,
  type CorrectionSummary,
  type CreateCorrectionRequest,
} from '@/api/corrections'

interface RedaccionesTabProps {
  studentId: string
}

const STATUS_BADGE: Record<CorrectionStatus, string> = {
  Pendiente: 'bg-zinc-100 text-zinc-700',
  Entregada: 'bg-indigo-50 text-indigo-700',
  Corrigiendo: 'bg-amber-50 text-amber-800',
  Corregida: 'bg-emerald-50 text-emerald-800',
  CorreccionFallida: 'bg-red-50 text-red-700',
}

const STATUS_LABEL: Record<CorrectionStatus, string> = {
  Pendiente: 'Pendiente',
  Entregada: 'Entregada',
  Corrigiendo: 'Corrigiendo',
  Corregida: 'Corregida',
  CorreccionFallida: 'Error al corregir',
}

const TITLE_MAX = 200
const PROMPT_MAX = 2000
const TEXT_MAX = 10_000

export function RedaccionesTab({ studentId }: RedaccionesTabProps) {
  const queryClient = useQueryClient()
  const [drawerState, setDrawerState] = useState<
    | { mode: 'closed' }
    | { mode: 'create' }
    | { mode: 'edit'; id: string }
  >({ mode: 'closed' })
  const [corregirError, setCorregirError] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['corrections', studentId],
    queryFn: () => listCorrections(studentId),
    refetchInterval: (query) =>
      query.state.data?.some((c) => c.status === 'Corrigiendo') ? 3000 : false,
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['corrections', studentId] })
  }

  const corregirMutation = useMutation({
    mutationFn: (id: string) => corregirCorrection(studentId, id),
    onMutate: () => { setCorregirError(null) },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'No se pudo iniciar la corrección.'
      setCorregirError(msg)
    },
    onSuccess: (detail) => {
      queryClient.setQueryData(
        ['corrections', studentId],
        (old: CorrectionSummary[] | undefined) =>
          old?.map((c) => (c.id === detail.id ? { ...c, status: detail.status } : c)) ?? old,
      )
      invalidate()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCorrection(studentId, id),
    onSuccess: () => invalidate(),
  })

  function openCreate() {
    setDrawerState({ mode: 'create' })
  }
  function openEdit(id: string) {
    setDrawerState({ mode: 'edit', id })
  }
  function closeDrawer() {
    setDrawerState({ mode: 'closed' })
  }

  return (
    <div className="space-y-5 pt-2" data-testid="redacciones-tab">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Redacciones</h2>
        {data && data.length > 0 && (
          <Button size="sm" onClick={openCreate} data-testid="redacciones-new-button">
            Nueva redacción
          </Button>
        )}
      </div>

      {corregirError && (
        <div
          className="flex items-start justify-between gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
          data-testid="redacciones-generation-error"
          role="alert"
        >
          <span>{corregirError}</span>
          <button
            onClick={() => setCorregirError(null)}
            aria-label="Descartar"
            className="shrink-0 rounded p-0.5 text-red-500 hover:bg-red-100"
            data-testid="redacciones-generation-error-dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {isLoading && (
        <div className="space-y-3" data-testid="redacciones-loading">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-4 space-y-2 ring-1 ring-[#C7C4D8]/10"
            >
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div
          className="flex flex-col items-center justify-center py-16 gap-3"
          data-testid="redacciones-error"
        >
          <p className="text-sm text-zinc-500">No se pudieron cargar las redacciones.</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Reintentar
          </Button>
        </div>
      )}

      {!isLoading && !isError && data && data.length === 0 && (
        <div
          className="flex flex-col items-center justify-center text-center py-20 gap-4"
          data-testid="redacciones-empty"
        >
          <p className="font-manrope text-[3.5rem] font-bold text-[#1A1B22] leading-tight">
            Aún no hay redacciones
          </p>
          <p className="text-sm text-zinc-500 max-w-sm">
            Crea una nueva redacción para empezar a registrar el trabajo escrito de este alumno.
          </p>
          <Button size="sm" onClick={openCreate} data-testid="redacciones-empty-cta">
            Nueva redacción
          </Button>
        </div>
      )}

      {!isLoading && !isError && data && data.length > 0 && (
        <div className="space-y-3" data-testid="redacciones-list">
          {data.map((c) => (
            <CorrectionCard
              key={c.id}
              correction={c}
              studentId={studentId}
              onCorregir={() => corregirMutation.mutate(c.id)}
              onEdit={() => openEdit(c.id)}
              onDelete={() => deleteMutation.mutate(c.id)}
            />
          ))}
        </div>
      )}

      {drawerState.mode !== 'closed' && (
        <CorrectionDrawer
          studentId={studentId}
          editId={drawerState.mode === 'edit' ? drawerState.id : null}
          onClose={closeDrawer}
          onSaved={() => {
            invalidate()
            closeDrawer()
          }}
          onCorregirError={(msg) => setCorregirError(msg)}
        />
      )}
    </div>
  )
}

interface CorrectionCardProps {
  correction: CorrectionSummary
  studentId: string
  onCorregir: () => void
  onEdit: () => void
  onDelete: () => void
}

function CorrectionCard({
  correction,
  studentId,
  onCorregir,
  onEdit,
  onDelete,
}: CorrectionCardProps) {
  const navigate = useNavigate()
  const { id, assignmentTitle, status, createdAt } = correction
  const isCorregida = status === 'Corregida'
  const isCorrigiendo = status === 'Corrigiendo'
  const isFallida = status === 'CorreccionFallida'
  const showCorregir = status === 'Entregada' || isFallida

  function openDetail() {
    navigate(`/students/${studentId}/redacciones/${id}`)
  }

  return (
    <div
      className={`bg-white rounded-2xl p-4 ring-1 ring-[#C7C4D8]/10 ${
        isCorregida ? 'cursor-pointer hover:bg-[#F4F2FD] transition-colors' : ''
      }`}
      onClick={isCorregida ? openDetail : undefined}
      data-testid={`redaccion-card-${id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-semibold text-[#1A1B22] truncate"
            title={assignmentTitle}
            data-testid={`redaccion-title-${id}`}
          >
            {assignmentTitle}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 text-[0.6875rem] font-semibold tracking-wide uppercase px-2.5 py-1 rounded-full ${STATUS_BADGE[status]}`}
              data-testid={`redaccion-status-${id}`}
            >
              {isCorrigiendo && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />}
              {isFallida && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}
              {STATUS_LABEL[status]}
            </span>
            <span className="text-xs text-zinc-400" data-testid={`redaccion-date-${id}`}>
              {relativeTime(createdAt)}
            </span>
          </div>
        </div>
        <div
          className="flex items-center gap-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {showCorregir && (
            <Button
              size="sm"
              onClick={onCorregir}
              data-testid={`redaccion-corregir-${id}`}
            >
              {isFallida ? 'Reintentar' : 'Corregir'}
            </Button>
          )}
          {!isCorregida && !isCorrigiendo && (
            <Button
              variant={showCorregir ? 'secondary' : 'ghost'}
              size="sm"
              onClick={onEdit}
              data-testid={`redaccion-edit-${id}`}
            >
              Editar
            </Button>
          )}
          {!isCorregida && !isCorrigiendo && (
            <Button
              variant={showCorregir ? 'secondary' : 'ghost'}
              size="sm"
              onClick={onDelete}
              data-testid={`redaccion-delete-${id}`}
            >
              Eliminar
            </Button>
          )}
          {isCorregida && <ChevronRight className="h-5 w-5 text-zinc-400" />}
        </div>
      </div>
    </div>
  )
}

interface CorrectionDrawerProps {
  studentId: string
  editId: string | null
  onClose: () => void
  onSaved: () => void
  onCorregirError: (msg: string) => void
}

function CorrectionDrawer({ studentId, editId, onClose, onSaved, onCorregirError }: CorrectionDrawerProps) {
  const queryClient = useQueryClient()
  const isEdit = editId != null
  const [title, setTitle] = useState('')
  const [prompt, setPrompt] = useState('')
  const [text, setText] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [textLockedError, setTextLockedError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [statusFromLoad, setStatusFromLoad] = useState<CorrectionStatus | null>(null)

  const detailQuery = useQuery({
    queryKey: ['corrections', studentId, editId],
    queryFn: () => getCorrection(studentId, editId as string),
    enabled: isEdit,
  })

  const detail = detailQuery.data
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    if (isEdit && detail && !hydrated) {
      setTitle(detail.assignmentTitle)
      setPrompt(detail.assignmentPrompt ?? '')
      setText(detail.studentText ?? '')
      setStatusFromLoad(detail.status)
      setHydrated(true)
    }
  }, [isEdit, detail, hydrated])

  const trimmedTitle = title.trim()
  const titleValid = trimmedTitle.length > 0 && trimmedTitle.length <= TITLE_MAX
  const studentTextLocked = isEdit && statusFromLoad === 'Corregida'
  const titleOk = isEdit ? titleValid : trimmedTitle.length <= TITLE_MAX
  const canSave = titleOk && !isSaving && (!isEdit || hydrated)

  const isPendienteEdit = isEdit && statusFromLoad === 'Pendiente'
  const hasText = text.trim().length > 0
  const saveLabel = !isEdit && hasText
    ? 'Corregir'
    : isPendienteEdit && hasText
      ? 'Guardar y marcar como entregada'
      : 'Guardar'

  async function handleSave() {
    if (!canSave) return
    setSubmitError(null)
    setTextLockedError(null)
    setIsSaving(true)
    try {
      if (isEdit && detail) {
        const body: CreateCorrectionRequest = {}
        if (trimmedTitle !== detail.assignmentTitle) body.assignmentTitle = trimmedTitle
        const promptVal = prompt.trim() ? prompt : null
        if (promptVal !== (detail.assignmentPrompt ?? null)) {
          body.assignmentPrompt = prompt.length > 0 ? prompt : null
        }
        if (!studentTextLocked) {
          body.studentText = text.length > 0 ? text : null
        }
        if (Object.keys(body).length === 0) {
          onSaved()
          return
        }
        await updateCorrection(studentId, editId as string, body)
      } else {
        const now = new Date()
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
        const effectiveTitle = trimmedTitle || `Redacción ${today}`
        const newCorrection = await createCorrection(studentId, {
          assignmentTitle: effectiveTitle,
          assignmentPrompt: prompt.length > 0 ? prompt : null,
          studentText: text.length > 0 ? text : null,
        })
        if (text.trim().length > 0) {
          try {
            const detail = await corregirCorrection(studentId, newCorrection.id)
            queryClient.setQueryData(
              ['corrections', studentId],
              (old: CorrectionSummary[] | undefined) =>
                old?.map((c) => (c.id === detail.id ? { ...c, status: detail.status } : c)) ?? old,
            )
          } catch (corregirErr: unknown) {
            // Correction was saved as Entregada; close the drawer and surface the error
            // so the teacher knows AI generation didn't start and can retry from the card.
            const msg =
              (corregirErr as { response?: { data?: { message?: string } } })?.response?.data?.message ??
              'No se pudo iniciar la corrección.'
            onCorregirError(msg)
          }
        }
      }
      onSaved()
    } catch (err: unknown) {
      const response = (err as { response?: { status?: number; data?: { errors?: Record<string, string[]>; message?: string } } })
        ?.response
      const status = response?.status
      const errors = response?.data?.errors
      if (status === 400 && errors) {
        const studentTextErrs = errors.StudentText ?? errors.studentText
        if (studentTextErrs && studentTextErrs.length > 0) {
          setTextLockedError(studentTextErrs[0])
          setIsSaving(false)
          return
        }
      }
      setSubmitError(response?.data?.message ?? 'No se pudo guardar la redacción.')
    } finally {
      setIsSaving(false)
    }
  }

  const detailLoading = isEdit && detailQuery.isLoading
  const detailError = isEdit && detailQuery.isError

  return (
    <div className="fixed inset-0 z-50 flex justify-end" data-testid="correction-drawer">
      <div
        className="absolute inset-0 bg-black/20"
        onClick={isSaving ? undefined : onClose}
        data-testid="correction-drawer-backdrop"
      />
      <div
        className="relative flex flex-col w-full sm:w-[520px] h-full overflow-hidden bg-white"
        data-testid="correction-drawer-panel"
      >
        <div className="flex items-center justify-between px-6 py-4 bg-zinc-50/60">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? 'Editar redacción' : 'Nueva redacción'}
          </h2>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Cerrar"
            data-testid="correction-drawer-close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {detailLoading && (
            <div className="space-y-3" data-testid="correction-drawer-loading">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-20 w-full" />
            </div>
          )}

          {detailError && (
            <div className="text-sm text-red-600">No se pudo cargar la redacción.</div>
          )}

          {!detailLoading && !detailError && (
            <>
              <div className="space-y-1.5">
                <label
                  htmlFor="redaccion-title"
                  className="text-[10px] font-bold tracking-widest uppercase text-gray-400"
                >
                  Título
                </label>
                <Input
                  id="redaccion-title"
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
                  placeholder="p. ej. Carta a un extraterrestre"
                  data-testid="correction-drawer-title"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="redaccion-prompt"
                  className="text-[10px] font-bold tracking-widest uppercase text-gray-400"
                >
                  Consigna (opcional)
                </label>
                <Textarea
                  id="redaccion-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value.slice(0, PROMPT_MAX))}
                  placeholder="Notas sobre el ejercicio"
                  rows={3}
                  data-testid="correction-drawer-prompt"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="redaccion-text"
                  className="text-[10px] font-bold tracking-widest uppercase text-gray-400"
                >
                  Texto del alumno (opcional)
                </label>
                <Textarea
                  id="redaccion-text"
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, TEXT_MAX))}
                  placeholder="Pega el texto del alumno aquí"
                  rows={10}
                  className="resize-y max-h-[50vh]"
                  disabled={studentTextLocked}
                  data-testid="correction-drawer-text"
                />
                <p className="text-xs text-zinc-500">
                  {studentTextLocked
                    ? 'El texto no se puede modificar una vez generada la corrección.'
                    : 'Si ya tienes el texto del alumno, pégalo aquí. Lo puedes añadir más tarde.'}
                </p>
                {textLockedError && (
                  <p className="text-xs text-red-600" data-testid="correction-drawer-text-error">
                    {textLockedError}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col gap-2 px-6 py-4 bg-zinc-50/60">
          {submitError && (
            <p className="text-sm text-red-500 text-right" data-testid="correction-drawer-error">
              {submitError}
            </p>
          )}
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
              data-testid="correction-drawer-cancel"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!canSave}
              className="min-w-[120px]"
              data-testid="correction-drawer-save"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : saveLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
