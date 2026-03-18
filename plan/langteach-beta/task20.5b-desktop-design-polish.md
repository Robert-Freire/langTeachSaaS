# T20.5b: Desktop Design Polish

## Context

After a UI design review (with the frontend-design plugin), 13 issues were identified across the desktop experience. The app has a solid foundation (Geist Variable font, indigo brand, consistent Card components, bg-zinc-50 content area) but needs polish in interaction feedback, space utilization, visual hierarchy, and component consistency. This plan addresses all 13 issues grouped into logical tasks.

## Plan Review

```
### Summary
Plan proposes 8 sub-tasks covering layout, pagination, labels, hover states, typography, week strip, empty states, and CEFR badge colors across ~11 files.

### Assumptions Verified
- LessonEditor.tsx uses `max-w-3xl` on main container (line 343): YES
- LessonEditor.tsx title has `truncate` class (line 358): YES
- UnscheduledDrafts.tsx exists as separate component: YES (renders all items, no limit)
- QuickActions.tsx exists as separate component: YES (stat boxes with `border-zinc-100`)
- Lessons.tsx filter selects show `SelectValue placeholder=` but `value` is set to `language ?? 'all'`, so SelectValue renders the selected item text "all" not the placeholder: YES, this is the root cause
- Students.tsx card has NO hover classes (line 134): YES, confirmed
- Lessons.tsx card already HAS `hover:shadow-sm hover:border-zinc-300` (line 229): YES
- AppShell.tsx sidebar inactive items already have `hover:bg-zinc-100 hover:text-foreground` (line 44): YES! Plan is wrong here
- LessonEditor.tsx "Generate" button already has icon + text + hover styling (line 596): YES, it's a ghost Button with Sparkles icon, not plain text
- tooltip.tsx does not exist: YES, needs to be added via shadcn
- components.json exists with shadcn config: YES

### Critical (plan will fail without fixing)
None

### Important (likely to cause rework)
- [x] **Task 4 (sidebar hover)**: AppShell.tsx line 44 already has `hover:bg-zinc-100 hover:text-foreground` on inactive nav items. The plan incorrectly states this is missing. Remove this item from Task 4.
- [x] **Task 4 (Generate button)**: LessonEditor.tsx line 589-601 already uses a `<Button variant="ghost">` with `<Sparkles>` icon and hover styling (`hover:text-indigo-700 hover:bg-indigo-50`). It is NOT plain text. The plan says "Style Generate text as a small outlined button" but it already is one. The disabled "Generate" span on line 603-604 (when no sectionId) is the only plain-text instance. Revise Task 4.
- [x] **Task 3 (filter labels)**: The issue is that when `value="all"` is set on the Select, it renders the SelectItem text "All languages" not the placeholder. So the fix is to change the SelectItem text from "All languages" to "Language: All", not to change the placeholder. Plan should be more precise.
- [x] **Task 2 (UnscheduledDrafts)**: The component already has an expand/collapse toggle. The plan says "show first 5 items with Show all button" but the existing pattern collapses the entire card. The implementation should add a `showAll` state within the expanded view: show first 5 rows, then a "Show all N" button.

### Minor (suggestions)
- [x] **Task 1**: `max-w-5xl` is 1024px in Tailwind v3 but might differ in the project's config. Verify the actual computed value matches intent.
- [x] **Task 5 (shadow-sm on cards)**: Adding shadow to Card component globally would affect all cards including metadata cards in LessonEditor. Better to add shadow at page level (Students.tsx, Lessons.tsx) rather than modifying card.tsx.
- [x] **Task 8**: The CEFR badge in WeekStrip (line 80) uses a generic `variant="outline"` with no color classes. Plan should explicitly list this as a location to update.

### Missing from plan
- [x] Lessons.tsx already has `title` attributes on icon buttons (lines 257, 265, 276: "Clone", "Edit", "Delete"). Plan says to add Tooltip component wrapping these, but `title` already provides basic browser tooltips. If upgrading to shadcn Tooltip, should remove the `title` attributes to avoid double-tooltip.
- [x] UnscheduledDrafts "Open" text (line 56) is inside a Link component that wraps the entire row. The row itself is already clickable. The "Open" label is redundant visual noise, not a separate action. Plan should consider removing it rather than styling it as a ghost button.
- [x] No unit test updates mentioned for modified components (required by project feedback_frontend_unit_tests.md).

### Verdict
NEEDS REVISION -- several assumptions are incorrect (sidebar hover already exists, Generate is already styled, filter fix needs different approach). Core plan is sound but needs corrections before implementation.
```

## Revised Plan

### Task 1: Lesson Editor Layout & Title Fix (Issues #1, #2)

**Files:** `frontend/src/pages/LessonEditor.tsx`

**Changes:**
- Increase main container from `max-w-3xl` to `max-w-4xl` (896px, a safe middle ground)
- Remove `truncate` from h1 title (line 358), allow it to wrap naturally
- Header already uses `flex-wrap` (line 345), which handles overflow. Just removing truncate should suffice.
- Update loading skeleton container to match new max-width (line 306)

### Task 2: Dashboard Drafts Collapse & Quick Actions Polish (Issues #3, #12)

**Files:** `frontend/src/components/dashboard/UnscheduledDrafts.tsx`, `frontend/src/components/dashboard/QuickActions.tsx`

**UnscheduledDrafts changes:**
- Add `showAll` state (default false)
- When expanded but not showAll: render first 5 items, then a "Show all (N)" button
- When showAll: render all items
- Remove the standalone "Open" text span (line 56), the entire row is already a Link

**QuickActions changes:**
- Add subtle background tints to stat boxes: `bg-indigo-50/50` or a left border accent `border-l-2 border-l-indigo-400`
- Change icon colors from `text-zinc-400` to `text-indigo-500` to match brand

### Task 3: Lessons Filter Labels (Issue #4)

**File:** `frontend/src/pages/Lessons.tsx`

**Changes:**
- Change SelectItem text for "all" options:
  - Line 180: `"All languages"` to `"Language: All"`
  - Line 189: `"All levels"` to `"Level: All"`
  - Line 198: `"All statuses"` to `"Status: All"`
- This works because when value="all" is selected, SelectValue renders the SelectItem's display text

### Task 4: Hover & Interaction Feedback (Issues #5, #6, #7)

**Files:** `frontend/src/pages/Students.tsx`, `frontend/src/pages/Lessons.tsx`

**Students.tsx changes:**
- Add `transition-all hover:shadow-sm hover:border-zinc-300` to student Card (line 134), matching the Lessons pattern

**Tooltip setup:**
- Install shadcn Tooltip: `cd frontend && npx shadcn@latest add tooltip`
- Wrap icon-only buttons in Lessons.tsx (Copy, Edit link, Delete) with `<Tooltip>` and remove existing `title` attributes
- Wrap icon-only buttons in Students.tsx (Edit link, Delete) similarly
- Wrap icon-only buttons in LessonEditor.tsx toolbar (Copy, Delete, ExportButton)

**NOT changing (already correct):**
- Sidebar hover states (already have `hover:bg-zinc-100`)
- Generate button styling (already a ghost Button with icon + hover)

### Task 5: Typography & Visual Depth (Issues #8, #9)

**Files:** `frontend/src/pages/Dashboard.tsx`, `frontend/src/pages/Students.tsx`, `frontend/src/pages/Lessons.tsx`, `frontend/src/pages/LessonEditor.tsx`, `frontend/src/pages/LessonNew.tsx`, `frontend/src/pages/StudentForm.tsx`

**Changes:**
- Upgrade h1 headings from `font-semibold` to `font-bold` on all pages for stronger hierarchy
- Add `shadow-sm` to list Cards on Students.tsx (line 134) and Lessons.tsx (line 229) for depth
- Do NOT modify card.tsx globally

### Task 6: Week Strip Polish (Issue #10)

**File:** `frontend/src/components/dashboard/WeekStrip.tsx`

**Changes:**
- Enhance "today" column: add `border-t-2 border-t-indigo-500` for a stronger accent
- The SchedulePopover trigger is the "+" button (in SchedulePopover.tsx). Increase its size slightly or add visible text on desktop. Need to check SchedulePopover for the trigger button styling.

### Task 7: Empty States for Lesson Editor Sections (Issue #11)

**File:** `frontend/src/pages/LessonEditor.tsx`

**Changes:**
- Below each section textarea, when `sectionNotes[type]` is empty AND `blocks.length === 0`, show a subtle hint:
  `<p className="text-xs text-zinc-400 italic">Use Generate to create content, or type your notes above.</p>`

### Task 8: CEFR Badge Color System (Issue #13)

**New file:** `frontend/src/lib/cefr-colors.ts`

**Changes:**
- Create helper `getCefrBadgeClasses(level: string): string` returning Tailwind classes:
  - A1/A2: `text-emerald-700 border-emerald-200 bg-emerald-50`
  - B1/B2: `text-indigo-700 border-indigo-200 bg-indigo-50` (current default)
  - C1/C2: `text-purple-700 border-purple-200 bg-purple-50`
- Update all CEFR badge locations:
  - `Students.tsx` line 144
  - `Lessons.tsx` line 239
  - `LessonEditor.tsx` line 447
  - `WeekStrip.tsx` line 80
  - `UnscheduledDrafts.tsx` line 52

## Files to Modify

| File | Tasks |
|------|-------|
| `frontend/src/pages/LessonEditor.tsx` | 1, 5, 7, 8 |
| `frontend/src/pages/Dashboard.tsx` | 5 |
| `frontend/src/pages/Students.tsx` | 4, 5, 8 |
| `frontend/src/pages/Lessons.tsx` | 3, 4, 5, 8 |
| `frontend/src/pages/LessonNew.tsx` | 5 |
| `frontend/src/pages/StudentForm.tsx` | 5 |
| `frontend/src/components/dashboard/UnscheduledDrafts.tsx` | 2, 8 |
| `frontend/src/components/dashboard/QuickActions.tsx` | 2 |
| `frontend/src/components/dashboard/WeekStrip.tsx` | 6, 8 |
| `frontend/src/components/ui/tooltip.tsx` | 4 (new, from shadcn) |
| `frontend/src/lib/cefr-colors.ts` | 8 (new helper) |

## Verification

1. `cd frontend && npm run build` passes with zero errors
2. `cd frontend && npm test` passes all unit tests (update/add tests for modified components)
3. Visual review with `/review-ui` at desktop (1920x1080) confirming:
   - Lesson editor title no longer truncates
   - Dashboard shows max 5 drafts with "Show all" button
   - Filter dropdowns show "Language: All", "Level: All", "Status: All"
   - Student cards show hover feedback
   - CEFR badges show different colors per level group
   - Icon buttons have shadcn tooltips on hover
   - h1 headings are bolder
4. Existing e2e tests still pass
