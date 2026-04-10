# Task 639: Student Detail Redesign (3-Tab Layout, Stitch Style)

**Issue:** #639
**Branch:** `task/t639-student-detail-redesign`
**Sprint:** `sprint/ui-redesign-student-polish`

## Summary

Redesign the student detail page (`/students/:id`) from the current Overview/History/Progress layout to a Profile/Sessions/Progress 3-tab layout using the Stitch "Academic Atelier" design language.

## Current State

- `StudentDetail.tsx`: 3 tabs (Overview, History, Progress), standard Card/Badge components
- Overview tab: SessionSummaryHeader + StudentProfileOverview + StudentProfileSummary + New lesson CTA + LessonHistoryCard + StudentCoursesCard
- History tab: SessionHistoryTab (full session timeline with edit/delete)
- Progress tab: ProgressDashboard (coverage, pacing, difficulty trends, timeline)
- `Student` interface in `api/students.ts` is **missing** the new backend fields from #625/#626 (birthYear, profession, country, city, officialCefrLevel, shortTermObjectives, isActive, isCorporate, rate, spokenLanguages, teachingTodos)

## Plan

### Step 1: Update Student TypeScript interface

File: `frontend/src/api/students.ts`

Add missing fields to the `Student` interface to match `StudentDto.cs`:
- `birthYear?: number | null`
- `profession?: string | null`
- `countryOfOrigin?: string | null`
- `cityOfOrigin?: string | null`
- `countryOfResidence?: string | null`
- `cityOfResidence?: string | null`
- `reasonForStudying?: string | null`
- `officialCefrLevel?: string | null`
- `shortTermObjectives: ShortTermObjective[]`
- `isActive: boolean`
- `isCorporate: boolean`
- `rate?: string | null`
- `spokenLanguages: string[]`
- `teachingTodos: TeachingTodo[]`

Also add supporting interfaces:
- `ShortTermObjective { id: string; text: string; targetDate?: string | null }`
- `TeachingTodo { id: string; text: string; createdAt: string; sourceSessionLogId?: string | null; status: string; coveredInSessionLogId?: string | null }`

### Step 2: Redesign StudentDetail.tsx

Restructure the page with Stitch visual language:

**Header card** (full width, `bg-white`, ambient shadow):
- Large initials avatar (64px, `bg-indigo-100`)
- Name in Manrope `text-2xl font-bold`
- Metadata row: CEFR badge(s) (square Stitch style), native language(s)
- If `officialCefrLevel` exists, show "TEACHER" and "OFFICIAL" badges side by side
- Quick actions: ghost "Edit Profile" button, primary gradient "Log Session" button

**Tab bar**: 3 tabs (Profile, Sessions, Progress)
- Ghost style tabs with indigo bottom indicator for active
- Tab bar on page canvas (`bg-[#FBF8FF]`), not inside a card

**Tabs renamed:** overview -> profile, history -> sessions, progress stays

### Step 3: Build Profile tab content

New component: `frontend/src/components/student/StudentProfileTab.tsx`

Two-column layout on white card with ambient shadow.

**Left column (~60%):**
- ABOUT section: birthYear, profession, countryOfOrigin, cityOfOrigin, countryOfResidence, cityOfResidence, reasonForStudying (key-value pairs)
- LANGUAGES section: native languages, spoken languages, learning language + level
- PERSONAL NOTES section (from existing `personalNotes`)
- TEACHING NOTES section (from existing `teachingNotes`)

**Right column (~40%):**
- LEARNING GOALS section: editable list (chips)
- SHORT-TERM OBJECTIVES section: text + optional target date
- DIFFICULTIES section: compact table (no borders, tonal alternation)
- TEACHING TODOS section: list with status dots (indigo=pending, green=covered, zinc=dismissed)
- COMMERCIAL section: isActive badge, isCorporate badge, rate

Each section uses `Label-SM` headers (uppercase, tracked). Empty states for each.

### Step 4: Restyle Sessions tab

The Sessions tab reuses `SessionHistoryTab` but adds a **Teaching Todos** section below the timeline. The session cards get Stitch visual treatment (tonal layering instead of borders).

Create a lightweight wrapper or modify the tab content area in StudentDetail.tsx to include:
1. The existing `SessionHistoryTab` component
2. A new `TeachingTodosCard` showing the student's teaching todos

### Step 5: Restyle Progress tab

The Progress tab reuses `ProgressDashboard` as-is. Stitch visual refinements (remove card borders, use tonal layering) will be applied if straightforward, but the existing component is already functional and well-structured.

### Step 6: Update existing component references

- Remove `StudentProfileSummary` usage from StudentDetail (the completeness bar moves away; profile fields are now directly visible)
- Remove `StudentProfileOverview` usage (replaced by ProfileTab)
- Remove `SessionSummaryHeader` from Overview (session stats can move to header or Sessions tab)
- Remove `LessonHistoryCard` and `StudentCoursesCard` from Overview (courses info is secondary)
- Keep `SessionSummaryHeader` in Sessions tab (already there via `SessionHistoryTab`)

### Step 7: Update unit tests

File: `frontend/src/pages/StudentDetail.test.tsx`

- Update mock student to include new fields
- Update tab test IDs: `tab-overview` -> `tab-profile`, `tab-history` -> `tab-sessions`
- Test profile section rendering with new fields (AC: unit tests for profile section)
- Test empty states for each section

### Step 8: Update e2e test

File: `e2e/tests/students.spec.ts`

Add a new test case:
- Navigate to student detail (seeded student)
- Verify 3 tabs visible: Profile, Sessions, Progress
- Click each tab, verify content renders
- This satisfies AC: "E2E: navigate to student detail, switch between tabs"

Update existing tests that reference `tab-overview` to use `tab-profile`.

### Step 9: Update `StudentFormData` interface

The `StudentFormData` in `api/students.ts` needs updating to include new fields for the `updateStudent` mutation used in difficulty toggle.

## Files Changed

| File | Action |
|------|--------|
| `frontend/src/api/students.ts` | Edit: add new fields to Student interface |
| `frontend/src/pages/StudentDetail.tsx` | Edit: full redesign |
| `frontend/src/components/student/StudentProfileTab.tsx` | New: profile tab content |
| `frontend/src/components/student/TeachingTodosCard.tsx` | New: teaching todos display |
| `frontend/src/pages/StudentDetail.test.tsx` | Edit: update for new tabs + profile tests |
| `e2e/tests/students.spec.ts` | Edit: add tab switching test |

## Out of Scope

- Multi-native language picker UI (#630)
- Hierarchical learning goals (#628)
- Teaching todos creation UI from session form
- Field tooltip system (#633)
- Editing profile fields inline (uses existing Edit Profile link)

## Risks

- The `SessionHistoryTab` component has borders and Card wrappers. Full Stitch restyling of that component would be a larger change. Plan: apply minimal Stitch treatment (remove outer border) without rewriting the entire component.
- The `ProgressDashboard` similarly uses Card components. Same approach: minimal treatment.
