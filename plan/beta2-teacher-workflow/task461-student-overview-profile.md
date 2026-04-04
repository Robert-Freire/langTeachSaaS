# Task 461: Student Overview Tab — Surface Profile Data, L1 on Cards, Lesson CTA

## Issue
https://github.com/Robert-Freire/langTeachSaaS/issues/461

## Goal
Fix the student Overview tab (nearly empty) to show all profile data in read-only mode, improve the student list cards to show native language (L1) instead of the redundant target language, and add a "Create lesson" CTA on the overview.

## Acceptance Criteria
- [ ] Overview tab shows all profile fields in read-only layout
- [ ] Import metadata prefix stripped from notes display
- [ ] Completeness widget does not show misleading low percentages for imported students
- [ ] "AI Personalization" renamed to "Teaching Context" in the edit form
- [ ] Student list cards show native language (L1) when available
- [ ] Lesson History removed from edit form (belongs in History tab)
- [ ] "Create lesson" CTA on student overview navigates to `/lessons/new?studentId=<id>`
- [ ] Existing e2e tests pass; new tests for overview rendering

## Current State

### StudentDetail.tsx (Overview tab)
The Overview tab renders:
- `<StudentProfileSummary>` — a compact completeness widget (checkboxes + % bar). This is a mini summary, NOT a full profile read-only display.
- `<LessonHistoryCard>` and `<StudentCoursesCard>` in a grid.

### StudentProfileSummary.tsx
Shows: name, level, language, and completeness checkboxes (nativeLanguage, cefrLevel, interests, learningGoals, weaknesses, difficulties). Has a % complete bar. This is the "17% complete" widget Isaac flagged.

### StudentForm.tsx (Edit form)
Shows all profile data in editable form, organized in cards:
- "Basic Info" (name, language, cefrLevel)
- "Interests"
- "AI Personalization" (nativeLanguage, learningGoals, weaknesses, difficulties)
- "Notes"
- At bottom: `<StudentCoursesCard>` and `<LessonHistoryCard>` (read-only data shown in edit form — wrong per Finding 7)

### Students.tsx (Student list cards)
Shows: name, `learningLanguage` badge (redundant), CEFR badge, `nativeLanguage` badge (if set, as "X speaker"), interests.

### Student data model (api/students.ts)
Fields: id, name, learningLanguage, cefrLevel, interests, notes, nativeLanguage, learningGoals, weaknesses, difficulties[], createdAt, updatedAt.

### Notes format (from issue)
Notes from Excel import contain prefixes like:
- `[Excel import YYYY-MM-DD]` — strip completely from display
- `Preply test: ...` — render as "Assessment notes" subsection
- `Student info: ...` — render as "Background" subsection

### Completeness widget problem (Finding 5)
`computeProfileCompleteness` in `studentProfileUtils.ts` checks 6 structured fields (nativeLanguage, cefrLevel, interests, learningGoals, weaknesses, difficulties). When data is in notes but not in structured fields, score is low (e.g., 17%). Fix: if `notes` is populated with rich content (Preply/Student info prefixes, or note length > 50 chars), treat notes as fulfilling some of those fields for display purposes, or simply hide the widget when notes have substantial content.

### LessonNew.tsx
Already supports `?studentId=<id>` query param to pre-select a student. No backend change needed.

## Plan

### 1. Create `StudentProfileOverview` component

New file: `frontend/src/components/student/StudentProfileOverview.tsx`

A read-only display card for all student profile fields. Shows:
- Section header: "Teaching Context" (same rename as the edit form)
- Native language (or "Not specified")
- Learning goals (comma-separated chips or "None")
- Areas to improve / weaknesses (chips or "None")
- Specific difficulties (list or "None")
- Notes (with import metadata stripped and subsections rendered)
- An "Edit profile" link to `/students/:id/edit`

Notes display logic (pure function, extracted for testability):
```ts
function formatNotes(raw: string | null): { importStripped: string; sections: {label: string; text: string}[] } | null
```
- Strip `[Excel import YYYY-MM-DD]` prefix (regex: `/^\[Excel import \d{4}-\d{2}-\d{2}\]\s*/`)
- If remaining text contains `Preply test:` and/or `Student info:`, parse into labeled sections
- Return structured data for rendering

### 2. Update `StudentDetail.tsx` — Overview tab

Replace the Overview tab content:
- Keep `<StudentProfileSummary>` but conditionally hide/adjust it (see item 3)
- Add `<StudentProfileOverview student={student} />` ABOVE the cards grid
- Add "Create lesson" button: `<Button onClick={() => navigate(\`/lessons/new?studentId=${student.id}\`)}>New lesson</Button>`
- Keep `<LessonHistoryCard>` and `<StudentCoursesCard>` in the grid (they're appropriate in overview)

Layout of Overview tab:
```
[StudentProfileOverview (read-only profile data + Edit profile link)]
[New lesson CTA button]
[LessonHistoryCard | StudentCoursesCard grid]
```

### 3. Fix completeness widget (`StudentProfileSummary`)

Add a `hasRichNotes` boolean prop to `StudentProfileSummary`. When true, hide the completeness bar and "X% complete" label entirely. The checklist of structured fields remains visible so teachers know what's still missing.

Updated component signature:
```ts
interface Props {
  student: Student
  hasRichNotes?: boolean
}
```

Caller (`StudentDetail.tsx`) passes `hasRichNotes={!!student.notes && student.notes.length > 100}`.

This avoids misleading teachers while keeping the structured-field checklist useful. No changes needed to `studentProfileUtils.ts`.

### 4. Update `StudentForm.tsx` — rename section + remove lesson history

Two changes:
1. Rename card title from "AI Personalization" to "Teaching Context"
2. Remove subtitle "Used to personalize AI-generated lesson content for this student"
3. Remove `<LessonHistoryCard>` from the bottom of the edit form (keep `<StudentCoursesCard>` since it's relevant to editing)

### 5. Update `Students.tsx` — L1 on cards

The student list card already shows `nativeLanguage` as "X speaker" badge when set, and `learningLanguage` badge always. Per Finding 6:
- Keep L1 badge as-is (already shows "Portuguese speaker" etc.)
- The target language badge (`learningLanguage`) is redundant for a Spanish teacher. Make it secondary: show only if no nativeLanguage is set, or move it after L1. Simplest approach: show L1 prominently (already done), and de-emphasize learningLanguage by showing it only when nativeLanguage is not set, OR keep both but make learningLanguage a lighter style.

Actually on re-reading the issue: "Show L1 instead of or alongside target language, especially once L1 is populated." The current code already shows both. The issue is that the learningLanguage badge ("Spanish") dominates and L1 is secondary. Flip the order: show L1 first, then learningLanguage second (or hide learningLanguage when L1 is shown, since all students learn the same language).

Implementation: swap order — show nativeLanguage badge before learningLanguage badge. Also change nativeLanguage badge text from "X speaker" to "Native: X" per the issue.

### 6. Unit tests

**`StudentProfileOverview.test.tsx`:**
- Renders all profile fields
- Strips import metadata from notes
- Renders Preply/Student info as labeled sections
- Shows "Not specified" for empty fields
- "Edit profile" link navigates to edit

**Update `StudentDetail.test.tsx`:**
- Overview tab shows `StudentProfileOverview`
- "New lesson" button navigates to `/lessons/new?studentId=student-1`

**Update `Students.test.tsx`:**
- Assert native language badge text is `"Native: Portuguese"` (not the old `"X speaker"` format)
- Target language badge still appears

### 7. E2e test additions (in `students.spec.ts`)

Add a test for student detail overview rendering:
- Navigate to `/students/:id`
- Verify overview shows profile fields (name, level, native language section)
- Verify "New lesson" button exists and navigates correctly
- Verify notes display (strip import prefix)

## Files to Change

| File | Change |
|------|--------|
| `frontend/src/components/student/StudentProfileOverview.tsx` | NEW: read-only profile display |
| `frontend/src/components/student/StudentProfileOverview.test.tsx` | NEW: unit tests |
| `frontend/src/components/studentProfileUtils.ts` | Add notes-aware completeness logic |
| `frontend/src/components/StudentProfileSummary.tsx` | Add `hasRichNotes` prop; hide % bar when true |
| `frontend/src/components/StudentProfileSummary.test.tsx` | Update tests for new `hasRichNotes` prop |
| `frontend/src/pages/StudentDetail.tsx` | Add Overview component + New lesson CTA |
| `frontend/src/pages/StudentDetail.test.tsx` | Add tests for new overview content |
| `frontend/src/pages/StudentForm.tsx` | Rename section, remove LessonHistoryCard |
| `frontend/src/pages/Students.tsx` | Reorder badges, rename L1 badge |
| `frontend/src/pages/Students.test.tsx` | Verify L1 badge format |
| `e2e/tests/students.spec.ts` | Add overview rendering test |

## Not Changing
- Backend API: all needed fields already exist in the Student model
- `LessonHistoryCard` / `StudentCoursesCard`: keep in Overview tab, only remove LessonHistoryCard from edit form
- Routing: `/lessons/new?studentId=` already works
