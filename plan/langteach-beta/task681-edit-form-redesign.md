# Task 681 + 666: Edit Student Form Redesign + Commercial Fields

## Issues
- #681: Edit Student form layout redesign (section nav, grouping, sticky save)
- #666: Commercial fields (IsActive, IsCorporate, Rate) in edit form

## Approach

Single PR touching `frontend/src/pages/StudentForm.tsx` and its test.

No backend changes needed -- `isActive`, `isCorporate`, `rate` already exist on `StudentFormData` and `Student` interfaces in `students.ts`.

## Changes

### 1. State additions (commercial fields)
Add to StudentForm:
```tsx
const [isActive, setIsActive] = useState(true)
const [isCorporate, setIsCorporate] = useState(false)
const [rate, setRate] = useState('')
```

Sync in `useEffect([existing])`:
```tsx
setIsActive(existing.isActive ?? true)
setIsCorporate(existing.isCorporate ?? false)
setRate(existing.rate ?? '')
```

Include in `handleSubmit` mutate call:
```tsx
isActive,
isCorporate,
rate: rate.trim() || null,
```

### 2. Scrollspy state + effect (edit mode only)
```tsx
const sectionIds = ['section-basic','section-background','section-proficiency','section-teaching-goals','section-difficulties','section-notes','section-commercial']
const [activeSection, setActiveSection] = useState('section-basic')

useEffect(() => {
  if (!isEdit) return
  const container = document.querySelector('main')
  if (!container) return
  function onScroll() {
    const offset = 80
    let current = sectionIds[0]
    for (const id of sectionIds) {
      const el = document.getElementById(id)
      if (el && el.getBoundingClientRect().top <= offset) current = id
    }
    setActiveSection(current)
  }
  container.addEventListener('scroll', onScroll, { passive: true })
  return () => container.removeEventListener('scroll', onScroll)
}, [isEdit])

function scrollToSection(id: string) {
  const container = document.querySelector('main')
  const el = document.getElementById(id)
  if (!el || !container) return
  // getBoundingClientRect().top is viewport-relative; adjust by container's own top offset
  const elTop = el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop
  container.scrollTo({ top: elTop - 60, behavior: 'smooth' })
}
```

### 3. Sticky section nav (edit mode only, ABOVE the grid)
Placed immediately before the outer grid div.

Nav sections: Basic Info | Background | Proficiency | Teaching Goals | Difficulties | Notes | Commercial

Also contains sticky Cancel + Save Profile buttons (satisfies AC4 from #681).

### 4. Form structure restructure
Section anchors are `<div id="section-xxx" />` placed immediately before each card group.

New groupings:
- **section-basic**: 2-column row: Basic Info+Languages card (left col, 7/12) + Skill Overrides card (right col, 5/12) — implements "Basic Info + Proficiency side by side" AC
- **section-background**: Personal Background + Reason for Studying + Interests cards (unchanged content). Origin/Residence fields grouped as "From" + "Now" pairs for visual clarity.
- **section-teaching-goals**: Merged card with Learning Goals + Short-Term Objectives (currently split across two cards)
- **section-difficulties**: Merged card with Weaknesses + Structured Difficulties (currently inside "Teaching Context")
- **section-notes**: Notes card, changed to 2-column side-by-side layout
- **section-commercial**: NEW card with IsActive toggle, IsCorporate toggle, Rate text input

Requires splitting "Teaching Context" card (currently has learning goals + weaknesses + difficulties) into:
- A Teaching Goals section (learning goals + objectives)
- A Difficulties section (weaknesses + structured difficulties)

All `data-testid` attributes preserved.

Note: Rate is already displayed in StudentProfileTab.tsx (line 673) and StudentDetail.tsx already stores isActive/isCorporate/rate. No changes needed to those files.

### 5. Active/Inactive badge in header
In edit mode, show a small badge after the PageHeader reflecting `isActive` state. Updates dynamically as user toggles.

### 6. Commercial card UI
```
[Card] Commercial Info
  [Toggle row] Account Status: Active/Inactive
  [Toggle row] Student Type: Private/Corporate
  [Input row] Rate (free text): "e.g. 45/hr"
```

Toggle is implemented as a button with `role="switch"` and ARIA (no Switch component in the UI library).

### 7. Tests
**Unit tests (StudentForm.test.tsx):**
- Add test: commercial fields rendered in edit mode (isActive toggle visible, isCorporate toggle visible, rate input visible)
- Add test: toggling isActive and submitting includes updated value
- Existing mocks already include `isActive: true, isCorporate: false, rate: null`

**E2E tests (students.spec.ts):**
- Add test: commercial fields round-trip (edit form shows isActive toggle, toggle to inactive, save, verify INACTIVE badge in profile/header)

## Acceptance Criteria Mapping

| AC (from issues) | How addressed |
|---|---|
| #666: IsActive toggle in edit form, reflected in badges | Toggle in Commercial card; badge in form header |
| #666: IsCorporate toggle in edit form, reflected in badges | Toggle in Commercial card; reflected in profile via server round-trip |
| #666: Rate field in edit form, visible in Profile tab when populated | Rate text input in Commercial card; Profile tab reads from server |
| #666: Deactivating visually distinguishes student | isActive=false -> grey "Inactive" badge in header |
| #666: Round-trip works for all fields | Synced in useEffect + included in mutate call |
| #681: App sidebar present | Already present via AppShell, no change needed |
| #681: Horizontal section nav with scrollspy | Sticky nav bar with scroll event listener |
| #681: Form sections follow Stitch grouping | Section restructure as above |
| #681: Cancel/Save visible at any scroll position | Duplicate buttons in sticky nav bar |
| #681: No e2e tests break | Preserve all data-testid attrs |

## Files Changed
- `frontend/src/pages/StudentForm.tsx` (main implementation)
- `frontend/src/pages/StudentForm.test.tsx` (unit tests)
- `e2e/tests/students.spec.ts` (e2e tests)
