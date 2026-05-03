import { useState } from 'react'
import { Pencil, X, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Student } from '@/api/students'
import type { ExtractedStudentProfile } from '@/api/studentExtraction'
import { buildDrawerRows, buildCreateDrawerRows, mergeExtractedIntoStudent } from '@/lib/voiceUpdateMerge'
import type { DrawerRow, VoiceMergePatch } from '@/lib/voiceUpdateMerge'

type RowBadge = DrawerRow['badge']

const BADGE_STYLES: Record<RowBadge, string> = {
  CHANGED: 'bg-amber-50 text-amber-700',
  ADDED: 'bg-indigo-50 text-indigo-600',
  NEW: 'bg-emerald-50 text-emerald-700',
}

function isEmptyExtraction(extracted: ExtractedStudentProfile, includeNameCheck = false): boolean {
  if (includeNameCheck && extracted.name) return false
  return (
    !extracted.cefrLevel && !extracted.officialCefrLevel && !extracted.profession &&
    !extracted.reasonForStudying && !extracted.birthYear && !extracted.countryOfResidence &&
    !extracted.cityOfResidence && extracted.nativeLanguages.length === 0 &&
    extracted.spokenLanguages.length === 0 && extracted.interests.length === 0 &&
    extracted.shortTermObjectives.length === 0 && extracted.difficulties.length === 0 &&
    extracted.teachingTodoTexts.length === 0
  )
}

type VoiceUpdateDrawerBaseProps = {
  extracted: ExtractedStudentProfile
  saving: boolean
  saveError?: string | null
  onClose: () => void
}

type VoiceUpdateDrawerUpdateProps = VoiceUpdateDrawerBaseProps & {
  mode?: 'update'
  student: Student
  onSave: (patch: VoiceMergePatch) => void
}

type VoiceUpdateDrawerCreateProps = VoiceUpdateDrawerBaseProps & {
  mode: 'create'
  onSave: (rows: DrawerRow[]) => void
}

export type VoiceUpdateDrawerProps = VoiceUpdateDrawerUpdateProps | VoiceUpdateDrawerCreateProps

export function VoiceUpdateDrawer(props: VoiceUpdateDrawerProps) {
  const { extracted, saving, saveError, onClose } = props
  const isCreateMode = props.mode === 'create'

  const [rows, setRows] = useState<DrawerRow[]>(() =>
    isCreateMode
      ? buildCreateDrawerRows(extracted)
      : buildDrawerRows(extracted, (props as VoiceUpdateDrawerUpdateProps).student)
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const isEmpty = isEmptyExtraction(extracted, isCreateMode)

  const nameRow = isCreateMode ? rows.find(r => r.fieldKey === 'name') : undefined
  const hasValidName = !isCreateMode || (nameRow != null && nameRow.value.trim().length > 0)
  const showNameWarning = isCreateMode && rows.length > 0 && !hasValidName

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id))
    if (editingId === id) setEditingId(null)
  }

  function startEdit(row: DrawerRow) {
    setEditingId(row.id)
    setEditValue(row.value)
  }

  function commitEdit(id: string) {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, value: editValue } : r))
    setEditingId(null)
  }

  function handleSave() {
    if (isCreateMode) {
      (props as VoiceUpdateDrawerCreateProps).onSave(rows)
    } else {
      const updateProps = props as VoiceUpdateDrawerUpdateProps
      updateProps.onSave(mergeExtractedIntoStudent(rows, updateProps.student))
    }
  }

  const ctaLabel = isCreateMode ? 'Create student' : `Save ${rows.length} change${rows.length === 1 ? '' : 's'}`
  const saveDisabled = saving || rows.length === 0 || !hasValidName

  return (
    <div className="fixed inset-0 z-50 flex justify-end" data-testid="voice-update-drawer">
      <div
        className="absolute inset-0 bg-black/20"
        onClick={saving ? undefined : onClose}
        data-testid="drawer-backdrop"
      />
      <div
        className="relative flex flex-col w-full sm:w-[480px] h-full overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.80)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
        data-testid="drawer-panel"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white/60">
          <h2 className="text-base font-semibold text-gray-900">Review extracted data</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            data-testid="drawer-close"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12" data-testid="empty-extraction">
              <p className="text-sm text-gray-500">
                Nothing was extracted. Try speaking more clearly about the student.
              </p>
              <Button variant="ghost" size="sm" onClick={onClose}>
                Dismiss
              </Button>
            </div>
          ) : (
            rows.map((row) => (
              <div
                key={row.id}
                className="flex items-start gap-3 rounded-xl px-4 py-3 bg-white/70"
                data-testid={`drawer-row-${row.fieldKey}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-semibold tracking-widest uppercase text-gray-400">
                      {row.label}
                    </span>
                    <span
                      className={`text-[10px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-md ${BADGE_STYLES[row.badge]}`}
                      data-testid={`badge-${row.badge}`}
                    >
                      {row.badge}
                    </span>
                  </div>
                  {row.badge === 'CHANGED' && row.currentValue && (
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-sm text-gray-400 line-through">{row.currentValue}</span>
                      <ChevronRight className="h-3 w-3 text-gray-300 shrink-0" />
                    </div>
                  )}
                  {editingId === row.id ? (
                    <Input
                      autoFocus
                      className="h-auto w-full text-sm text-indigo-700 font-medium bg-indigo-50 border-0 ring-1 ring-indigo-200 focus-visible:ring-indigo-400 rounded-lg px-2 py-1"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => commitEdit(row.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(row.id) }}
                      data-testid={`edit-input-${row.id}`}
                    />
                  ) : (
                    <span className="text-sm text-indigo-700 font-medium" data-testid={`row-value-${row.id}`}>
                      {row.value}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0 mt-0.5">
                  <button
                    onClick={() => startEdit(row)}
                    className="rounded-lg p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    data-testid={`edit-row-${row.id}`}
                    aria-label="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => removeRow(row.id)}
                    className="rounded-lg p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    data-testid={`remove-row-${row.id}`}
                    aria-label="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {!isEmpty && (
          <div className="flex flex-col gap-2 px-6 py-4 bg-white/60">
            {showNameWarning && (
              <p className="text-sm text-amber-600" data-testid="name-required-warning">
                Name is required to create a student.
              </p>
            )}
            {saveError && <p className="text-sm text-red-500 text-right" data-testid="save-error">{saveError}</p>}
            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={onClose} disabled={saving} data-testid="drawer-cancel">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saveDisabled}
                className="min-w-[120px]"
                data-testid="drawer-save"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  ctaLabel
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
