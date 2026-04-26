import { newId } from '@/lib/newId'
import type { Student, Difficulty, ShortTermObjective, TeachingTodo, StudentFormData } from '@/api/students'
import type { ExtractedStudentProfile, ExtractedObjective, ExtractedDifficulty } from '@/api/studentExtraction'

const DEFAULT_LEARNING_LANGUAGE = 'Spanish'

export interface DrawerRow {
  id: string
  fieldKey: string
  label: string
  badge: 'CHANGED' | 'ADDED' | 'NEW'
  currentValue: string | null
  value: string
  /** Original extracted metadata — preserved so edits to value don't lose targetDate/competency/subcategory */
  extractedObjective?: ExtractedObjective
  extractedDifficulty?: ExtractedDifficulty
}

export type VoiceMergePatch = {
  cefrLevel?: string
  officialCefrLevel?: string | null
  profession?: string | null
  reasonForStudying?: string | null
  birthYear?: number | null
  countryOfResidence?: string | null
  cityOfResidence?: string | null
  nativeLanguages?: string[]
  spokenLanguages?: string[]
  interests?: string[]
  shortTermObjectives?: ShortTermObjective[]
  difficulties?: Difficulty[]
  teachingTodos?: TeachingTodo[]
}

export function buildDrawerRows(extracted: ExtractedStudentProfile, student: Student): DrawerRow[] {
  const rows: DrawerRow[] = []

  function addScalar(
    fieldKey: string,
    label: string,
    extractedVal: string | number | null | undefined,
    currentVal: string | number | null | undefined
  ) {
    if (extractedVal == null || extractedVal === '') return
    const extStr = String(extractedVal)
    const currStr = currentVal != null ? String(currentVal) : null
    if (currStr !== null && currStr.toLowerCase() === extStr.toLowerCase()) return
    rows.push({
      id: newId(),
      fieldKey,
      label,
      badge: currStr != null ? 'CHANGED' : 'NEW',
      currentValue: currStr,
      value: extStr,
    })
  }

  addScalar('cefrLevel', 'CEFR Level', extracted.cefrLevel, student.level.cefrLevel)
  addScalar('officialCefrLevel', 'Official CEFR', extracted.officialCefrLevel, student.level.officialCefrLevel)
  addScalar('profession', 'Profession', extracted.profession, student.identity.profession)
  addScalar('reasonForStudying', 'Reason for Studying', extracted.reasonForStudying, student.profile.reasonForStudying)
  addScalar('birthYear', 'Birth Year', extracted.birthYear, student.identity.birthYear)
  addScalar('countryOfResidence', 'Country of Residence', extracted.countryOfResidence, student.identity.countryOfResidence)
  addScalar('cityOfResidence', 'City of Residence', extracted.cityOfResidence, student.identity.cityOfResidence)

  for (const lang of extracted.nativeLanguages) {
    rows.push({ id: newId(), fieldKey: 'nativeLanguages', label: 'Native Language', badge: 'ADDED', currentValue: null, value: lang })
  }
  for (const lang of extracted.spokenLanguages) {
    rows.push({ id: newId(), fieldKey: 'spokenLanguages', label: 'Spoken Language', badge: 'ADDED', currentValue: null, value: lang })
  }
  for (const interest of extracted.interests) {
    rows.push({ id: newId(), fieldKey: 'interests', label: 'Interest', badge: 'ADDED', currentValue: null, value: interest })
  }
  for (const obj of extracted.shortTermObjectives) {
    rows.push({
      id: newId(),
      fieldKey: 'shortTermObjectives',
      label: 'Short-term Objective',
      badge: 'ADDED',
      currentValue: null,
      value: obj.targetDate ? `${obj.text} (by ${obj.targetDate})` : obj.text,
      extractedObjective: obj,
    })
  }
  for (const diff of extracted.difficulties) {
    rows.push({
      id: newId(),
      fieldKey: 'difficulties',
      label: 'Difficulty',
      badge: 'ADDED',
      currentValue: null,
      value: diff.description,
      extractedDifficulty: diff,
    })
  }
  for (const todo of extracted.teachingTodoTexts) {
    rows.push({ id: newId(), fieldKey: 'teachingTodos', label: 'Idea for Next Class', badge: 'ADDED', currentValue: null, value: todo })
  }

  return rows
}

export function mergeExtractedIntoStudent(
  confirmedRows: DrawerRow[],
  student: Student
): VoiceMergePatch {
  const patch: VoiceMergePatch = {}

  const has = (fieldKey: string) => confirmedRows.some((r) => r.fieldKey === fieldKey)
  const rowValue = (fieldKey: string) => confirmedRows.find((r) => r.fieldKey === fieldKey)?.value ?? null

  if (has('cefrLevel')) patch.cefrLevel = rowValue('cefrLevel')!
  if (has('officialCefrLevel')) patch.officialCefrLevel = rowValue('officialCefrLevel')
  if (has('profession')) patch.profession = rowValue('profession')
  if (has('reasonForStudying')) patch.reasonForStudying = rowValue('reasonForStudying')
  if (has('countryOfResidence')) patch.countryOfResidence = rowValue('countryOfResidence')
  if (has('cityOfResidence')) patch.cityOfResidence = rowValue('cityOfResidence')
  if (has('birthYear')) {
    const v = rowValue('birthYear')?.trim() ?? ''
    const parsed = parseInt(v, 10)
    patch.birthYear = /^\d{4}$/.test(v) && Number.isFinite(parsed) ? parsed : null
  }

  const confirmedNativeLangs = confirmedRows.filter((r) => r.fieldKey === 'nativeLanguages').map((r) => r.value)
  if (confirmedNativeLangs.length > 0) {
    const existing = student.languages.nativeLanguages
    const deduped = [...existing]
    for (const lang of confirmedNativeLangs) {
      if (!deduped.some((l) => l.toLowerCase() === lang.toLowerCase())) deduped.push(lang)
    }
    patch.nativeLanguages = deduped
  }

  const confirmedSpokenLangs = confirmedRows.filter((r) => r.fieldKey === 'spokenLanguages').map((r) => r.value)
  if (confirmedSpokenLangs.length > 0) {
    const existing = student.languages.spokenLanguages
    const deduped = [...existing]
    for (const lang of confirmedSpokenLangs) {
      if (!deduped.some((l) => l.toLowerCase() === lang.toLowerCase())) deduped.push(lang)
    }
    patch.spokenLanguages = deduped
  }

  const confirmedInterests = confirmedRows.filter((r) => r.fieldKey === 'interests').map((r) => r.value)
  if (confirmedInterests.length > 0) {
    const existing = student.profile.interests
    const deduped = [...existing]
    for (const item of confirmedInterests) {
      if (!deduped.some((i) => i.toLowerCase() === item.toLowerCase())) deduped.push(item)
    }
    patch.interests = deduped
  }

  const confirmedObjectives = confirmedRows.filter((r) => r.fieldKey === 'shortTermObjectives')
  if (confirmedObjectives.length > 0) {
    const existing = student.profile.shortTermObjectives
    const toAdd: ShortTermObjective[] = []
    for (const row of confirmedObjectives) {
      if (!existing.some((e) => e.text.toLowerCase() === row.value.toLowerCase())) {
        toAdd.push({
          id: newId(),
          text: row.value,
          targetDate: row.extractedObjective?.targetDate ?? null,
          objectiveType: 'other',
        })
      }
    }
    patch.shortTermObjectives = [...existing, ...toAdd]
  }

  const confirmedDifficulties = confirmedRows.filter((r) => r.fieldKey === 'difficulties')
  if (confirmedDifficulties.length > 0) {
    const existing = student.profile.difficulties
    const toAdd: Difficulty[] = []
    for (const row of confirmedDifficulties) {
      if (!existing.some((e) => e.description.toLowerCase() === row.value.toLowerCase())) {
        toAdd.push({
          id: newId(),
          description: row.value,
          competency: row.extractedDifficulty?.competency ?? 'general',
          subcategory: row.extractedDifficulty?.subcategory ?? 'general',
          severity: 'medium',
          trend: 'stable',
          status: 'Active',
        })
      }
    }
    patch.difficulties = [...existing, ...toAdd]
  }

  const confirmedTodos = confirmedRows.filter((r) => r.fieldKey === 'teachingTodos')
  if (confirmedTodos.length > 0) {
    const existing = student.profile.teachingTodos
    const toAdd: TeachingTodo[] = confirmedTodos.map((row) => ({
      id: newId(),
      text: row.value,
      createdAt: new Date().toISOString(),
      sourceSessionLogId: null,
      status: 'pending',
      coveredInSessionLogId: null,
    }))
    patch.teachingTodos = [...existing, ...toAdd]
  }

  return patch
}

export function buildCreateDrawerRows(extracted: ExtractedStudentProfile): DrawerRow[] {
  const rows: DrawerRow[] = []

  function addNew(fieldKey: string, label: string, value: string | number | null | undefined) {
    if (value == null || value === '') return
    rows.push({ id: newId(), fieldKey, label, badge: 'NEW', currentValue: null, value: String(value) })
  }

  addNew('name', 'Name', extracted.name)
  addNew('cefrLevel', 'CEFR Level', extracted.cefrLevel)
  addNew('profession', 'Profession', extracted.profession)
  addNew('reasonForStudying', 'Reason for Studying', extracted.reasonForStudying)
  addNew('birthYear', 'Birth Year', extracted.birthYear)
  addNew('countryOfResidence', 'Country of Residence', extracted.countryOfResidence)
  addNew('cityOfResidence', 'City of Residence', extracted.cityOfResidence)

  for (const lang of extracted.nativeLanguages) {
    rows.push({ id: newId(), fieldKey: 'nativeLanguages', label: 'Native Language', badge: 'NEW', currentValue: null, value: lang })
  }
  for (const lang of extracted.spokenLanguages) {
    rows.push({ id: newId(), fieldKey: 'spokenLanguages', label: 'Spoken Language', badge: 'NEW', currentValue: null, value: lang })
  }
  for (const interest of extracted.interests) {
    rows.push({ id: newId(), fieldKey: 'interests', label: 'Interest', badge: 'NEW', currentValue: null, value: interest })
  }
  for (const obj of extracted.shortTermObjectives) {
    rows.push({
      id: newId(),
      fieldKey: 'shortTermObjectives',
      label: 'Short-term Objective',
      badge: 'NEW',
      currentValue: null,
      value: obj.targetDate ? `${obj.text} (by ${obj.targetDate})` : obj.text,
      extractedObjective: obj,
    })
  }
  for (const diff of extracted.difficulties) {
    rows.push({
      id: newId(),
      fieldKey: 'difficulties',
      label: 'Difficulty',
      badge: 'NEW',
      currentValue: null,
      value: diff.description,
      extractedDifficulty: diff,
    })
  }
  for (const todo of extracted.teachingTodoTexts) {
    rows.push({ id: newId(), fieldKey: 'teachingTodos', label: 'Idea for Next Class', badge: 'NEW', currentValue: null, value: todo })
  }

  return rows
}

export function buildCreateRequestFromRows(rows: DrawerRow[]): StudentFormData {
  const get = (key: string) => rows.find(r => r.fieldKey === key)?.value ?? null
  const getAll = (key: string) => rows.filter(r => r.fieldKey === key).map(r => r.value)

  const birthYearStr = get('birthYear')?.trim() ?? ''
  const birthYearParsed = parseInt(birthYearStr, 10)
  const birthYear = /^\d{4}$/.test(birthYearStr) && Number.isFinite(birthYearParsed) ? birthYearParsed : null

  return {
    name: get('name') ?? '',
    learningLanguage: DEFAULT_LEARNING_LANGUAGE,
    cefrLevel: get('cefrLevel') ?? 'A1',
    interests: getAll('interests'),
    nativeLanguages: getAll('nativeLanguages'),
    spokenLanguages: getAll('spokenLanguages'),
    learningGoals: [],
    weaknesses: [],
    difficulties: rows.filter(r => r.fieldKey === 'difficulties').map(r => ({
      id: newId(),
      description: r.value,
      competency: r.extractedDifficulty?.competency ?? 'general',
      subcategory: r.extractedDifficulty?.subcategory ?? 'general',
      severity: 'medium',
      trend: 'stable',
      status: 'Active',
    })),
    birthYear,
    profession: get('profession'),
    countryOfOrigin: null,
    cityOfOrigin: null,
    countryOfResidence: get('countryOfResidence'),
    cityOfResidence: get('cityOfResidence'),
    reasonForStudying: get('reasonForStudying'),
    officialCefrLevel: get('officialCefrLevel'),
    shortTermObjectives: rows.filter(r => r.fieldKey === 'shortTermObjectives').map(r => ({
      id: newId(),
      text: r.extractedObjective?.text ?? r.value,
      targetDate: r.extractedObjective?.targetDate ?? null,
      objectiveType: 'other' as const,
    })),
    teachingTodos: rows.filter(r => r.fieldKey === 'teachingTodos').map(r => ({
      id: newId(),
      text: r.value,
      createdAt: new Date().toISOString(),
      sourceSessionLogId: null,
      status: 'pending',
      coveredInSessionLogId: null,
    })),
    isActive: true,
    isCorporate: false,
    rate: null,
    skillLevelOverrides: {},
  }
}
