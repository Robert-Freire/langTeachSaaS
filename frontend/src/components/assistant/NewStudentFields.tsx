import { useMemo } from 'react'
import type { NewStudentData } from '@/api/assistant'

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

interface Props {
  value: string
  proposalId: string
  onEdit: (id: string, newValue: string) => void
}

export default function NewStudentFields({ value, proposalId, onEdit }: Props) {
  const fields = useMemo<NewStudentData>(() => {
    try { return JSON.parse(value) as NewStudentData }
    catch { return { name: '' } }
  }, [value])

  const update = (patch: Partial<NewStudentData>) => {
    onEdit(proposalId, JSON.stringify({ ...fields, ...patch }))
  }

  return (
    <div className="space-y-2 text-sm font-inter">
      <FieldRow
        label="Name"
        required
        value={fields.name}
        onChange={v => update({ name: v })}
      />
      <FieldRow
        label="Learning Language"
        required
        value={fields.learningLanguage ?? ''}
        onChange={v => update({ learningLanguage: v || null })}
      />
      <SelectRow
        label="CEFR Level"
        required
        value={fields.cefrLevel ?? ''}
        options={CEFR_LEVELS}
        onChange={v => update({ cefrLevel: v || null })}
      />
      <FieldRow
        label="Profession"
        value={fields.profession ?? ''}
        onChange={v => update({ profession: v || null })}
      />
      <FieldRow
        label="City"
        value={fields.cityOfResidence ?? ''}
        onChange={v => update({ cityOfResidence: v || null })}
      />
      <FieldRow
        label="Native Language(s)"
        value={fields.nativeLanguages?.join(', ') ?? ''}
        onChange={v => update({ nativeLanguages: v ? v.split(',').map(s => s.trim()).filter(Boolean) : [] })}
        placeholder="e.g. Spanish, Catalan"
      />
      <FieldRow
        label="Reason for Studying"
        value={fields.reasonForStudying ?? ''}
        onChange={v => update({ reasonForStudying: v || null })}
      />
    </div>
  )
}

interface FieldRowProps {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  placeholder?: string
}

function FieldRow({ label, value, onChange, required, placeholder }: FieldRowProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-32 shrink-0 text-xs text-zinc-500 font-inter">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 text-xs text-zinc-800 border border-zinc-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white min-w-0"
      />
    </div>
  )
}

interface SelectRowProps {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
  required?: boolean
}

function SelectRow({ label, value, options, onChange, required }: SelectRowProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-32 shrink-0 text-xs text-zinc-500 font-inter">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="flex-1 text-xs text-zinc-800 border border-zinc-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white min-w-0"
      >
        <option value="">-- select --</option>
        {options.map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  )
}
