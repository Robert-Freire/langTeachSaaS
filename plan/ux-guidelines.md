# LangTeach UX Guidelines

Project-specific interaction rules that every screen must follow. The review-ui agent checks compliance with these rules during UI review.

---

## 1. Save Behavior

- **Forms with discrete submit** (Create Student, Edit Student, Profile): explicit Save button, visible in the page header area.
- **Lesson Editor**: auto-saves on change with a visible "All changes saved" / "Saving..." indicator. No Save button.
- **Never mix both patterns** on the same screen.
- **Rule**: a teacher must always be able to tell whether their changes were saved without guessing.

## 2. Navigation

- **Top-level pages** (Dashboard, Students list, Lessons list): no Back button needed, sidebar handles navigation.
- **Every sub-page** (Student detail/edit, Lesson editor, Study view, Profile): must have a Back button in the page header.
- **Back button behavior**: returns to the parent list or the page the user came from.
- **Rule**: a teacher must be able to navigate the full demo flow (Dashboard > Create Student > Create Lesson > Generate > Study View > Back to Lessons) without using the sidebar or browser back button.

## 3. Action Placement

- **Primary actions** (Save, Create, Generate): top-right of the content area, consistently across all screens.
- **Destructive actions** (Delete): always secondary placement (not next to the primary action), always behind a confirmation dialog.
- **Similar screens use the same layout**: Students list and Lessons list should have identical action patterns.

## 4. Empty States

- **Every list view** (Students, Lessons, scheduled lessons on dashboard) must show a helpful empty state with a CTA when no items exist.
- Empty states should guide the teacher to the next action ("Add your first student", "Create a lesson").
- Never show a blank page or an empty table with just headers.

## 5. Page Header

- Every page has a PageHeader component with: title, optional subtitle, optional back button, optional action buttons.
- PageHeader is the single place for page-level actions and navigation. Do not place primary actions elsewhere on the page.

## 6. Loading States

- List pages show skeleton placeholders while loading (not spinners, not blank pages).
- The skeleton layout must match the actual content layout so there is no layout shift when data loads.
- Buttons that trigger async operations (Generate, Save) show a loading spinner inside the button and are disabled during the operation.

## 7. Responsive Behavior

- All pages must be usable at mobile width (375px).
- On mobile, the sidebar collapses into a hamburger menu.
- Page header actions that don't fit on mobile should collapse into a "more" menu, not overflow or wrap to a second line.
- Touch targets must be at least 44x44px on mobile.

## 8. Form Patterns

- Required fields are marked before the user tries to submit.
- Validation messages appear near the field they relate to, not as a generic top-of-page error.
- Labels are associated with their inputs (clicking a label focuses the input).
- Dropdowns use the custom Select component (shadcn/ui), not native `<select>` elements.
