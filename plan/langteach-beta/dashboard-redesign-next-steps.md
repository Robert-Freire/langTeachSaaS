# Dashboard Redesign — Next Steps

> Status: **mockup approved** (2026-04-10). Resume here tomorrow.

## What's done

1. **Isaac pedagogy review** — defined what a teacher needs on the dashboard
   (session-first, not lesson-first). Doc: `dashboard-redesign-isaac-notes.md`

2. **Data model audit** — confirmed `SessionLog` is the session entity
   (scheduling via `SessionDate`, post-class via content fields). `Lesson` is
   out of scope for the dashboard. Doc: `dashboard-redesign-isaac-notes.md` §1-2

3. **Information architecture** — 4-zone layout:
   - Zone 1: Next session hero (student, last session notes, homework status)
   - Zone 2: Today's agenda + Pending followups (two columns)
   - Zone 3: Student roster (compact table with signals)

4. **Visual design direction** — adopted Stitch "Atelier" design language:
   - Tonal layering (no explicit borders, bg shifts + soft shadows)
   - Square CEFR badges (A=blue, B=indigo, C=dark)
   - Uppercase tracked labels for metadata
   - Indigo primary (#3525CD deeper shade), generous spacing
   - Stitch sidebar: left border bar on active item, "LANGUAGE CURATOR"
     subtitle, user card with "TEACHER" label
   - Source files: `C:\Users\Robert\Downloads\stitch_langteach_design_system\`
     (DESIGN.md, code.html, screen.png)

5. **Working mockup** — `frontend/src/pages/DashboardV2Mockup.tsx`
   Route: `/dashboard-v2` (outside AppShell, has its own Stitch-style sidebar).
   Robert approved the visual direction.

6. **Pseudonymized cohort** — 12 students based on Jordi's real student
   patterns, safe for external tools. Doc: `stitch-dashboard-approach.md` §3

7. **v0/Stitch prompts** — shared context block + dashboard prompt written
   (used for the v0 attempt, then superseded by Claude mockup).
   Doc: `dashboard-redesign-v0-prompts.md`

## What's NOT done — action items

### Priority 1: Backend gaps

Sophy's review covered student profile fields (#625, #626, #627), not dashboard
aggregation. Dashboard-specific backend gaps:

- [x] **Teacher-level session aggregation endpoint** — created as #636 (`GET /api/dashboard`).
      Not yet implemented.
- [ ] **Time-of-day on `SessionLog.SessionDate`** — UI form needs hour:minute picker.
      No backend change needed (field is already DateTime). Not yet an issue.
- [ ] **Followups / TeacherTask entity** — deferred. Using `TeachingTodos` on Student
      (#627) for "pendientes" column. Separate entity if needed later.

### Priority 2: GitHub issues (DONE)

All issues created, `qa:ready`, in milestone "UI Redesign & Student Profile Polish":

- [x] #635 — Sidebar update (Stitch style, left border bar, nav reorder) — P1, frontend+design
- [x] #636 — Dashboard aggregation endpoint (backend) — P1, backend
- [x] #637 — Students list redesign (compact table) — P2, frontend+design
- [x] #638 — Dashboard redesign (session-first, 4 zones) — P1, frontend+design (depends on #635, #636)
- [x] #639 — Student detail redesign (3-tab layout) — P2, frontend+design (depends on #625, #626)
- [ ] Sessions list screen — DEFERRED until aggregation endpoint lands and is validated

### Priority 3: Implementation sequence

Recommended order (each is a separate worktree task):

1. **#635 Sidebar update** (smallest scope, affects all pages, sets the visual tone)
2. **#636 Dashboard aggregation endpoint** (backend, unblocks #638)
3. **#638 Dashboard redesign** (the big one, depends on #635 + #636)
4. **#637 Students list redesign**
5. **#639 Student detail redesign**
6. **Sessions list** (when aggregation endpoint is validated in production)

### Priority 4: Cleanup

- [ ] Delete `DashboardV2Mockup.tsx` and its route in `App.tsx` after the real
      dashboard is implemented.
- [ ] Revert the `App.tsx` import of `DashboardV2Mockup` (currently there as a
      temp route outside AppShell).
- [x] ~~The Stitch export in Downloads~~ — copied to `plan/langteach-beta/stitch-design-system/`
      (DESIGN.md + code.html).

## Key design files (reference)

| File | Purpose |
|---|---|
| `plan/langteach-beta/dashboard-redesign-isaac-notes.md` | Data model audit, gap analysis, zone mapping |
| `plan/langteach-beta/stitch-dashboard-approach.md` | Cohort, approach principles, privacy decision |
| `plan/langteach-beta/dashboard-redesign-v0-prompts.md` | v0 prompts (reusable shared context block), Claude screen plan |
| `plan/langteach-beta/dashboard-redesign-next-steps.md` | This file |
| `frontend/src/pages/DashboardV2Mockup.tsx` | Approved visual mockup (TEMP, delete after real impl) |
| `C:\Users\Robert\Downloads\stitch_langteach_design_system\DESIGN.md` | Stitch design system spec (tonal layering, no-line rule, typography) |
| `C:\Users\Robert\Downloads\stitch_langteach_design_system\code.html` | Stitch HTML reference |
| `C:\Users\Robert\Downloads\stitch_langteach_design_system\screen.png` | Stitch visual reference |

## Decisions already made

- **Lesson is out of scope** for the dashboard. Session-first.
- **UI language:** English chrome, Spanish content.
- **Visual direction:** Stitch "Atelier" design language (not the current shadcn default).
- **Cohort:** Option B (pseudonymized from Jordi's real students).
- **Sessions list screen:** deferred until aggregation endpoint lands.
- **Tool:** Claude builds directly (v0/Stitch used only for design exploration).
