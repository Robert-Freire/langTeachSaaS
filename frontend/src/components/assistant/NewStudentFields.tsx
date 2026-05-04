import type { NewStudentData } from '@/api/assistant'
import { CEFR_LEVELS } from '@/lib/cefr-colors'
import { Input } from '@/components/ui/input'

interface Props {
  payload: NewStudentData
  proposalId: string
  onEditPayload: (id: string, payload: NewStudentData) => void
}

export default function NewStudentFields({ payload, proposalId, onEditPayload }: Props) {
  const update = (patch: Partial<NewStudentData>) => {
    onEditPayload(proposalId, { ...payload, ...patch })
  }

  return (
    <div className="space-y-2.5">
      <FieldRow
        label="Name"
        required
        value={payload.name}
        onChange={v => update({ name: v })}
      />
      <FieldRow
        label="Learning Language"
        required
        value={payload.learningLanguage ?? ''}
        onChange={v => update({ learningLanguage: v || null })}
      />
      <SelectRow
        label="CEFR Level"
        required
        value={payload.cefrLevel ?? ''}
        options={CEFR_LEVELS}
        onChange={v => update({ cefrLevel: v || null })}
      />
      <FieldRow
        label="Profession"
        value={payload.profession ?? ''}
        onChange={v => update({ profession: v || null })}
      />
      <FieldRow
        label="City"
        value={payload.cityOfResidence ?? ''}
        onChange={v => update({ cityOfResidence: v || null })}
      />
      <FieldRow
        label="Native Language(s)"
        value={payload.nativeLanguages?.join(', ') ?? ''}
        onChange={v => update({ nativeLanguages: v ? v.split(',').map(s => s.trim()).filter(Boolean) : [] })}
        placeholder="e.g. Spanish, Catalan"
      />
      <FieldRow
        label="Reason for Studying"
        value={payload.reasonForStudying ?? ''}
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
    <div className="space-y-0.5">
      <label className="text-xs font-medium text-zinc-500 font-inter">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <Input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-7 text-xs"
      />
    </div>
  )
}

interface SelectRowProps {
  label: string
  value: string
  options: readonly string[]
  onChange: (v: string) => void
  required?: boolean
}

function SelectRow({ label, value, options, onChange, required }: SelectRowProps) {
  return (
    <div className="space-y-0.5">
      <label className="text-xs font-medium text-zinc-500 font-inter">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-7 w-full text-xs text-zinc-800 rounded-lg border border-input bg-transparent px-2.5 py-1 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors"
      >
        <option value="">-- select --</option>
        {options.map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  )
}
