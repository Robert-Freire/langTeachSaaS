# UI Review Backlog

Non-blocking findings from review-ui runs. Periodically review this file and batch related items into polish GitHub issues.

---

*Cleared 2026-03-27 during Student-Aware Curriculum sprint close. 20 entries deleted, 17 batched into issues #298, #299, #300, #303.*

## PR #310 - Section profiles JSON (#309) (2026-03-28)
| Severity | Finding |
|----------|---------|
| Important | I2: GeneratePanel opens below fold on WarmUp/WrapUp, no auto-scroll to panel |
| Minor | M2: GeneratePanel "Close" link contrast ~3.5:1, below 4.5:1 WCAG threshold |
| Minor | M4: Read-only task-type div skipped by keyboard nav, not announced to screen readers |
| Minor | M5: Presentation section allows "Free activity" — pedagogically mismatched |

_I3 (10px helper text) fixed before merge._

## PR #308 - Content type allowlist (#305) (2026-03-27)
| Severity | Finding |
|----------|---------|
| Minor | M1: Mobile header (375px) "Preview as Student" off-screen — pre-existing, tracked in #246 |
| Minor | M2: Tablet title wrap (768px) — pre-existing |

_I1 (readonly label affordance) and I2 (dropdown ordering) were fixed before merge._
