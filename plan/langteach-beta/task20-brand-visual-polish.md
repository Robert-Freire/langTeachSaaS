# T20 — Brand & Visual Polish

## Context

Two independent UX reviews identified consistent issues in LangTeach's desktop experience. The app is rated **GOOD** overall (solid design system, consistent sidebar, coherent color palette) but has polish gaps that would be noticeable during the demo. This plan merges findings from both reviews, deduplicates, and prioritizes by demo impact.

A plan review against the codebase corrected several assumptions: shadcn Select is already used throughout (not native selects), filter dropdowns already have placeholder labels, and the datetime-local count was underestimated.

**Scope:** Desktop-only polish. No mobile/tablet. No logo changes (user handles separately).

## Sub-tasks

### T20.1 — Form UX Consistency
**Why:** Required field indicators are inconsistent between forms, and the StudentForm layout doesn't match LessonNew's side-by-side pattern for short-value fields.

**Files:**
- `frontend/src/pages/StudentForm.tsx`

**Changes:**
- Add required field indicators (red asterisk on Name, Learning Language, CEFR Level) to match LessonNew's existing pattern
- Put Language + CEFR Level side-by-side (matches LessonNew's two-column layout for short fields)

**Note:** Native selects and filter labels were already addressed in prior work. No changes needed for `Lessons.tsx` or `LessonNew.tsx` selects.

### T20.2 — Date/Time Picker Component
**Why:** Raw `<input type="datetime-local">` and `<input type="time">` look inconsistent across browsers and feel unpolished for a demo.

**Files:**
- `frontend/src/components/ui/date-time-picker.tsx` (new, shadcn calendar-based)
- `frontend/src/pages/LessonNew.tsx` (line ~221, 1 datetime-local)
- `frontend/src/pages/LessonEditor.tsx` (lines ~463 and ~498, 2 datetime-local inputs)
- `frontend/src/components/dashboard/SchedulePopover.tsx` (line ~120, native time input)
- `frontend/src/pages/LessonNew.test.tsx` (3 assertions on `type="datetime-local"` need rewriting)

**Changes:**
- Install `react-day-picker` (not in package.json yet)
- Add shadcn Calendar component (`npx shadcn@latest add calendar`)
- Create DateTimePicker: Calendar popover + time select
- Replace all 3 `datetime-local` inputs (1 in LessonNew, 2 in LessonEditor)
- Replace native `<input type="time">` in SchedulePopover with a time-only variant of the same component
- Rewrite LessonNew.test.tsx: replace `toHaveAttribute('type', 'datetime-local')` assertions with role-based queries for the new popover component

### T20.3 — Hover & Interaction Feedback
**Why:** Hover states on nav items and buttons are too subtle or invisible, making the app feel static.

**Files:**
- `frontend/src/components/AppShell.tsx` (nav hover: `hover:bg-zinc-50` at lines 45, 66 is invisible on white bg)
- `frontend/src/components/ui/button.tsx` (hover `bg-primary/80` only applies to `[a]:hover`, not regular buttons)
- `frontend/src/pages/Lessons.tsx` (lesson card action icons need `title` tooltips)
- `frontend/src/pages/LessonNew.tsx` (template cards need pronounced hover; "Blank" card at line ~120 needs dashed border)

**Changes:**
- AppShell nav: change `hover:bg-zinc-50` to `hover:bg-zinc-100` for visible feedback
- Button: fix hover state to apply to all elements, not just anchors. Change `[a]:hover:bg-primary/80` to `hover:bg-primary/90` on the default variant
- Lesson card actions: add `title="Clone"`, `title="Edit"`, `title="Delete"` attributes
- Template cards: add `hover:shadow-md hover:scale-[1.02] transition-all` for lift effect
- Blank template: use `border-dashed` instead of solid border

### T20.4 — Loading Skeletons
**Why:** Text-based "Loading..." is a prototype-level pattern. Skeletons feel significantly more polished.

**Files:**
- `frontend/src/components/ui/skeleton.tsx` (new, does not exist yet)
- `frontend/src/pages/Lessons.tsx` (loading state)
- `frontend/src/pages/Students.tsx` (loading state)
- Dashboard sub-components (loading states)
- `frontend/src/components/student/LessonHistoryCard.tsx` (line with "Loading..." text)

**Changes:**
- Add shadcn Skeleton component (`npx shadcn@latest add skeleton`)
- Create page-specific skeleton layouts (LessonCardSkeleton, StudentCardSkeleton, DashboardSkeleton)
- Replace all "Loading..." text indicators with skeleton cards matching each page's layout

### T20.5 — Button & Action Placement
**Why:** Save/Cancel buttons floating outside cards feel disconnected.

**Files:**
- `frontend/src/pages/Settings.tsx` (Save Profile at lines 187-190, outside form cards)
- `frontend/src/pages/StudentForm.tsx` (Save/Cancel placement)

**Changes:**
- Settings: move "Save Profile" inside the last card's footer, or add sticky positioning at bottom
- StudentForm: right-align Save/Cancel and place inside card footer
- LessonNew: add `variant="outline"` to Cancel button for visible border affordance

### T20.6 — Spacing & Minor Visual Fixes
**Files:**
- `frontend/src/components/dashboard/NeedsPreparation.tsx` (padding inconsistency vs week strip)
- `frontend/src/pages/LessonEditor.tsx` (title at line ~329 has `flex-1` but no `truncate`)
- Study view component (PREVIEW label is a plain `<span>` at line ~41)
- `frontend/src/components/AppShell.tsx` (email at line ~62 has `truncate` but no `title` attr)
- `frontend/src/components/dashboard/SchedulePopover.tsx` (no divider between Create New and Assign Draft)

**Changes:**
- Dashboard: normalize vertical padding between week strip and NeedsPreparation card
- LessonEditor: add `truncate` class to lesson title
- Study view: replace PREVIEW `<span>` with Badge component for better contrast
- AppShell: add `title={user?.email}` for tooltip on truncated email
- AppShell: add more padding between nav items and user section at sidebar bottom
- SchedulePopover: add "or" divider between the two action paths
- Dashboard empty calendar: add dashed-border placeholder on current day column

### T20.7 — Design Token Alignment
**Why:** AppShell sidebar uses hardcoded zinc colors while the rest of the app uses design tokens.

**Files:**
- `frontend/src/components/AppShell.tsx`

**Changes:**
- Replace `text-zinc-600` (line 45) with `text-muted-foreground`
- Replace `border-zinc-200` (line 26) with `border-border`
- Replace `hover:text-zinc-900` with `hover:text-foreground`
- Keep `bg-indigo-50`/`text-indigo-700` for active nav state (intentional brand accents)

## Deliberately Excluded

| Recommendation | Reason to skip |
|---|---|
| Card shadow/border unification | Current `ring-1 ring-foreground/10` is consistent enough. Adding box-shadows risks heavier feel. |
| Form section heading accents | Current headings are readable. Left-accent borders are style preference, not usability. |
| Template background tints | Color-coding 6 templates adds complexity. Hover + dashed "Blank" border is enough. |
| Green avatar status dot | Comes from AvatarBadge component. Removing risks breaking pattern. Low demo impact. |
| Toast/notification system | No demo actions require toast feedback. Overkill for this scope. |

## Test Impact

| Test File | Impact | Action |
|---|---|---|
| `LessonNew.test.tsx` | 3 datetime-local assertions break | Rewrite to query DateTimePicker by role/label |
| `StudentForm.test.tsx` | May need updates for layout changes | Verify after T20.1 |
| `SchedulePopover` e2e tests | Time input selector changes | Update selectors if affected |
| Mock-auth e2e suite | General regression | Full run before push |

## Verification
1. `cd frontend && npm run build` zero errors
2. `cd frontend && npm test` all pass
3. `cd backend && dotnet build` zero errors/warnings
4. `cd backend && dotnet test` all pass
5. Visual walkthrough: all key pages, check hover states, date pickers, skeletons, form consistency
6. Run e2e mock-auth suite for regression
7. Compare screenshots with pre-T20 review (saved in `e2e/screenshots/review-ui/`)

## Estimated Effort
~1.5 days (7 sub-tasks, all frontend)
