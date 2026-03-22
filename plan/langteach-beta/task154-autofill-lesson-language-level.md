# Task 154: Auto-fill lesson language/level from student and reorder form

## Issue
#154 — P2:should, qa:ready, Curriculum & Personalization milestone

## Changes

### File: `frontend/src/pages/LessonNew.tsx`

**1. Track auto-filled state**
Add `const [autoFilled, setAutoFilled] = useState<'language' | 'level' | 'both' | null>(null)` to track which fields were auto-filled for highlight animation.

**2. Handle student selection with auto-fill**
Replace bare `setStudentId` call with a handler:

```ts
function handleStudentChange(value: string) {
  const id = !value || value === 'none' ? undefined : value
  setStudentId(id)

  if (!id) return  // clearing student does NOT clear language/level

  const student = students.find(s => s.id === id)
  if (!student) return

  const willFillLanguage = !!student.learningLanguage
  const willFillLevel = !!student.cefrLevel

  if (willFillLanguage) setLanguage(student.learningLanguage)
  if (willFillLevel) setCefrLevel(student.cefrLevel)

  if (willFillLanguage && willFillLevel) setAutoFilled('both')
  else if (willFillLanguage) setAutoFilled('language')
  else if (willFillLevel) setAutoFilled('level')
}
```

No confirmation dialog before overwriting — just highlight. The fields are editable, so the teacher can correct any overwrite immediately. Issue says "show a brief confirmation or highlight" — we choose highlight as simpler and less disruptive.

**3. Highlight animation**
Add a CSS transition class applied to language/level selects when autoFilled is set. Use a ring highlight:

```tsx
className={cn(autoFilled === 'language' || autoFilled === 'both' ? 'ring-2 ring-indigo-400 rounded-md transition-all' : '')}
```

Clear the highlight after 2 seconds via `useEffect`:

```ts
useEffect(() => {
  if (!autoFilled) return
  const t = setTimeout(() => setAutoFilled(null), 2000)
  return () => clearTimeout(t)
}, [autoFilled])
```

**4. Reorder form fields**
New order: title → template (already step 1) → student → language/level → topic → duration → scheduled date → objectives

Move the student selector block (lines 251-268) to appear between title and the language/level grid (after line 179, before line 181).

## Acceptance criteria verification
- [x] Student selector appears before language and level
- [x] Selecting a student auto-fills language and CEFR level from student profile
- [x] Auto-filled fields remain editable (Select components stay enabled)
- [x] Clearing student does NOT clear language/level (handler returns early if id is undefined)
- [x] Visual feedback: ring highlight for 2 seconds on auto-filled fields

## Tests

### Unit tests (`LessonNew.test.tsx`)
1. Student selector renders before language select in the DOM
2. Selecting a student with learningLanguage/cefrLevel fills those fields
3. Clearing student selection leaves language/level unchanged
4. Auto-fill highlight class is applied and removed after timeout

### E2E (existing `lesson-creation.spec.ts` or new spec)
Add happy path: navigate to new lesson, pick student, verify language/level pre-filled.

## Files touched
- `frontend/src/pages/LessonNew.tsx` (reorder + auto-fill logic + highlight)
- `frontend/src/pages/LessonNew.test.tsx` (new or updated unit tests)
- `frontend/e2e/lesson-creation.spec.ts` (add auto-fill scenario, if e2e applicable)
