# Code Review Backlog

Unfixed notes from code review (review agent) runs. When reviewing this backlog, be critical: if a finding has real risk (future breakage, i18n issues, security), create an issue. If it's superficial or speculative, delete it.

---

*Cleared 2026-03-27 during Student-Aware Curriculum sprint close. 14 entries deleted, 9 batched into issues #301, #302, #304.*

---

## PR #320 — CEFR level rules JSON (2026-03-28) — MEDIUM

**Schema split: vocabularyPerLesson (A1-B2) vs vocabularyApproach (C1-C2)**
A1-B2 use `vocabularyPerLesson: { productive: {min,max}, receptive: {min,max} }`. C1-C2 replace this with a string `vocabularyApproach`. This is intentional per Isaac's spec and Sophy's Layer 3 schema. When the consuming C# service (CefrRulesService) is implemented, it must handle both shapes -- either via a union type or by checking for key presence. Risk: null ref if loader reads `vocabularyPerLesson.productive.min` unconditionally on C1/C2 documents.

---

## PR #312 (2026-03-28) — prompt-health-fixes

| Severity | File | Note |
|----------|------|------|
| minor | `PromptService.cs:FreeTextUserPrompt` | Does not call `_profiles.GetGuidance(...)` unlike all other prompt builders. Intentional generic fallback but undocumented. Worth a comment explaining why section profile guidance is skipped. |
