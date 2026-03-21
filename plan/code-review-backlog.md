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

---

### PR (2026-03-21) — Structured difficulty management (#156)

| Severity | Finding |
|----------|---------|
| Important | `backend/LangTeach.Api/Services/StudentService.cs`: `Deserialize<T>` silently swallows all exceptions and returns empty list. For `DifficultyDto`, a malformed JSON blob would silently drop all difficulties with no logging. Consider adding a log warning in the catch block. |
| Minor | `frontend/src/pages/StudentForm.tsx` (submit handler): Incomplete difficulty rows (missing dropdown selection) are silently filtered out on submit with no user feedback. Could add a toast or inline warning when rows are dropped. |
