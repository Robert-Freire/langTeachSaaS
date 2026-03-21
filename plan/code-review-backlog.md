# Code Review Backlog

Unfixed notes from code review (review agent) runs. When reviewing this backlog, be critical: if a finding has real risk (future breakage, i18n issues, security), create an issue. If it's superficial or speculative, delete it.

---

### PR (2026-03-21) — Dashboard loading skeletons (#111)

| Severity | Finding |
|----------|---------|
| Minor | `frontend/src/pages/Dashboard.tsx:82-84`: Inline SVG icon for slow-connection warning banner. If project adopts an icon library (lucide-react), replace with library component for consistency. |

---

### PR #136 (2026-03-20) — Capitalize dropdown defaults

| Severity | Finding |
|----------|---------|
| Important | `frontend/src/pages/Lessons.tsx:179,188,197`: filter render functions use `String(v)` for non-"all" values, returning raw value strings. Works today because values match display labels, but breaks if values ever differ from labels (e.g., i18n, status codes). Fragile pattern that needs a value-to-label lookup map. |
