# T5.1 — Design System & UI Foundation

**Phase:** 1
**Status:** pending
**Depends on:** T5 (Teacher Profile API + UI) — DONE
**Blocks:** T6 (Student Profiles UI), T7 (Lesson CRUD UI), T8 (Lesson Planner UI)

---

## Objective

Define and implement a consistent visual design system for LangTeach SaaS before building any more screens. The goal is to establish the foundation once so that T6, T7, and T8 can build on it without rework.

---

## Context

- The user has no prior design experience.
- All future screens (T6+) will use forms, tables, cards, and navigation. Without a shared foundation, each screen will be styled independently and inconsistently.
- A full design system (Storybook, design tokens, etc.) is out of scope. We want the minimum viable design foundation for a professional SaaS.

---

## Deliverables

### 1. Design Research & Spec (`docs/design-system.md`)
- Research 3-4 competitor language teaching SaaS apps (italki, Preply, Teachworks, similar)
- Define:
  - **Color palette:** primary, secondary, neutral, semantic (success, warning, error)
  - **Typography:** font family, scale (headings, body, captions, labels)
  - **Spacing scale:** consistent spacing units
  - **Component style direction:** card style, form style, table style, button hierarchy
  - **Layout shell:** sidebar nav + top bar pattern (common SaaS chrome)

### 2. Tooling Setup
- Install and configure **Tailwind CSS** (if not already present)
- Install and configure **shadcn/ui** component library
  - Rationale: copy-paste components, fully customizable, Tailwind-based, you own the code, industry standard for modern SaaS
- Configure theme in `tailwind.config.js` to match the approved design spec

### 3. Layout Shell Component
- Implement a reusable `AppShell` layout component with:
  - Sidebar navigation (links to Dashboard, Teacher Profile, Students, Lessons)
  - Top bar (user avatar, logout)
  - Main content area slot
- Apply it to the existing Teacher Profile page (T5 screen gets updated as the first real use)

### 4. Teacher Profile Page Restyled
- Restyle the T5 Teacher Profile form using shadcn/ui components and the new design spec
- This validates the design system works end-to-end on a real screen

---

## Approach

1. **Design session** — research competitors, propose design spec, get user approval before writing any code
2. **Tooling** — install Tailwind + shadcn/ui, configure theme
3. **Layout shell** — build AppShell, wire into React Router
4. **Apply to T5** — restyle Teacher Profile as proof of concept
5. **Playwright smoke test** — confirm Teacher Profile still works after restyle

---

## Out of Scope

- Storybook or component documentation site
- Dark mode (can be added later via shadcn/ui theming)
- Mobile responsiveness beyond basic usability (full mobile pass deferred to a later task)
- Animations or micro-interactions

---

## Definition of Done

- [ ] `docs/design-system.md` written and approved by user
- [ ] Tailwind + shadcn/ui installed and configured
- [ ] `AppShell` component implemented and used on Teacher Profile page
- [ ] Teacher Profile page uses shadcn/ui components consistently
- [ ] Playwright e2e smoke test passes
- [ ] PR open targeting `main`
