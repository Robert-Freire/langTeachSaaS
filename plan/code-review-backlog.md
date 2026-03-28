# Code Review Backlog

Unfixed notes from code review (review agent) runs. When reviewing this backlog, be critical: if a finding has real risk (future breakage, i18n issues, security), create an issue. If it's superficial or speculative, delete it.

---

*Cleared 2026-03-27 during Student-Aware Curriculum sprint close. 14 entries deleted, 9 batched into issues #301, #302, #304.*

---

| PR | Date | Severity | Description |
|----|------|----------|-------------|
| #322 | 2026-03-28 | minor | `template-overrides.json` uses camelCase keys `warmUp`/`wrapUp` while `section-profiles/` uses lowercase `warmup`/`wrapup`. AC specifies camelCase; PedagogyConfigService (#324) must handle this mapping explicitly to avoid silent lookup failures. |

## PR #312 (2026-03-28) — prompt-health-fixes

| Severity | File | Note |
|----------|------|------|
| minor | `PromptService.cs:FreeTextUserPrompt` | Does not call `_profiles.GetGuidance(...)` unlike all other prompt builders. Intentional generic fallback but undocumented. Worth a comment explaining why section profile guidance is skipped. |
