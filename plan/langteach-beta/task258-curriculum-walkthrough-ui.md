# Task 258: Enhanced Curriculum Walkthrough UI

## Issue
https://github.com/Robert-Freire/langTeachSaaS/issues/258

## Goal
Enhance `CourseDetail.tsx` so each session card shows the full learning targets, personalized context, and rationale. Cards are expandable: collapsed = topic + grammar + status; expanded = full details.

## Current state

- `CurriculumEntry` model has: `topic`, `grammarFocus`, `competencies` (skills), `competencyFocus` (CEFR codes), `contextDescription`, `personalizationNotes`, `lessonType`, `status`
- The template has `VocabularyThemes` per unit but they are NOT stored in `CurriculumEntry` (gap vs. AC)
- Frontend already has `contextDescription` and `personalizationNotes` in the API type (added in #257)
- UI currently shows: topic, status badge, grammar, skill badges, lessonType badge (no expand, no context, no rationale)

## Gap: VocabularyThemes not stored

The AC requires "vocabulary themes" to be visible per entry. The template has this data but it's not persisted to `CurriculumEntry`. This requires a small backend addition (one field + migration) before the frontend can show it. The issue was labeled `area:frontend` only but the backend change is necessary for full AC coverage.

## Plan

### 1. Backend: Add VocabularyThemes to CurriculumEntry

**`backend/LangTeach.Api/Data/Models/CurriculumEntry.cs`**
- Add `public string? VocabularyThemes { get; set; }` — comma-separated themes

**Migration**
- `cd backend && dotnet ef migrations add AddCurriculumEntryVocabularyThemes`

**`backend/LangTeach.Api/DTOs/CourseDto.cs`**
- Add `string? VocabularyThemes` to `CurriculumEntryDto`

**`backend/LangTeach.Api/Services/CurriculumGenerationService.cs`**
- When building skeleton entries from template units, populate:
  ```csharp
  VocabularyThemes = u.VocabularyThemes.Count > 0 ? string.Join(",", u.VocabularyThemes) : null,
  ```

**`backend/LangTeach.Api/Controllers/CoursesController.cs`**
- `MapEntryToDto` uses a positional record constructor call. Append `e.VocabularyThemes` as the last positional argument (13th) to `new CurriculumEntryDto(...)`. Named-argument syntax (`VocabularyThemes = ...`) is not valid for positional records.
- Both the `GetCourse` path and the `UpdateEntry` path call `MapEntryToDto`, so this single change covers both.

### 2. Frontend: Update API type

**`frontend/src/api/courses.ts`**
- Add `vocabularyThemes: string | null` to `CurriculumEntry`

### 3. Frontend: Redesign entry card in CourseDetail.tsx

Add per-entry expand/collapse state:
```tsx
const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
function toggleExpand(id: string) {
  setExpandedIds(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
}
```

**Collapsed view** (default):
- Row: session number (order index) + topic + status badge + grammar hint + chevron toggle
- Single line, scannable

**Expanded view** (toggled):
Sections shown:
1. **Grammar** — `grammarFocus` (full text)
2. **Communicative skills** — skill badges from `competencies` split (reading, writing, etc.)
3. **Vocabulary themes** — chips from `vocabularyThemes` split (shown only when non-null/non-empty)
4. **Personalized context** — `contextDescription` shown as a soft callout (shown when non-null)
5. **Personalization rationale** — `personalizationNotes` in a subtle collapsed sub-section (shown when non-null)

The edit form stays as-is (editing replaces the card content as today).

**Status indicator** styling (already exists via STATUS_CLASSES/STATUS_LABELS — keep it):
- planned: zinc/grey
- created: blue
- taught: green

### 4. Unit tests

**`frontend/src/pages/CourseDetail.test.tsx`**
- Test: entry card renders all fields when fully populated (topic, grammar, competencies, vocabularyThemes, contextDescription)
- Test: entry card renders gracefully when optional fields are null (contextDescription = null, personalizationNotes = null, vocabularyThemes = null)
- Test: clicking expand chevron toggles expanded content visibility
- Update `mockCourse` entries to include `vocabularyThemes` field (null in base fixture)

### 5. E2E

The existing `courses.spec.ts` e2e test covers curriculum entry rendering. Add a check that the expand toggle shows additional content on the detail page.

## Files touched

| File | Change |
|------|--------|
| `backend/LangTeach.Api/Data/Models/CurriculumEntry.cs` | Add VocabularyThemes field |
| `backend/LangTeach.Api/Migrations/...` | New migration |
| `backend/LangTeach.Api/DTOs/CourseDto.cs` | Add to CurriculumEntryDto |
| `backend/LangTeach.Api/Services/CurriculumGenerationService.cs` | Populate VocabularyThemes |
| `backend/LangTeach.Api/Controllers/CoursesController.cs` | Map VocabularyThemes to DTO |
| `frontend/src/api/courses.ts` | Add vocabularyThemes to CurriculumEntry type |
| `frontend/src/pages/CourseDetail.tsx` | Expandable card redesign |
| `frontend/src/pages/CourseDetail.test.tsx` | New and updated tests |
| `e2e/tests/courses.spec.ts` | Expand toggle assertion |

## Acceptance criteria coverage

- [x] topic, grammar focus, communicative competencies, vocabulary themes — all fields present and displayed
- [x] contextDescription visible per entry when available
- [x] expandable: collapsed shows topic + grammar + status; expanded shows full details
- [x] personalizationNotes in expanded view
- [x] status indicators (planned/created/taught) — already styled, keep
- [x] full course scannable without excessive scrolling — collapsed default keeps list compact
- [x] unit test: all fields populated
- [x] unit test: optional fields missing (graceful fallback)
- [x] mobile responsive — use flex-wrap and responsive text sizing
