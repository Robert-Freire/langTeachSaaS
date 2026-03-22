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

### PR #148 (2026-03-21) — Material Upload

| Severity | Finding |
|----------|---------|
| Important | `backend/LangTeach.Api/Services/MaterialService.cs:ListAsync`: sequential `GetDownloadUrlAsync` in loop for each material. For sections with many materials this could be slow. Consider parallel URL generation. |
| Important | `backend/LangTeach.Api/Program.cs:114`: `BlobServiceClient` created with raw config string that could be null. If `AzureBlobStorage:ConnectionString` is missing, throws unclear `ArgumentNullException` at startup. Add null check or options validation. |

---

### PR (2026-03-21) — Structured difficulty management (#156)

| Severity | Finding |
|----------|---------|
| Important | `backend/LangTeach.Api/Services/StudentService.cs`: `Deserialize<T>` silently swallows all exceptions and returns empty list. For `DifficultyDto`, a malformed JSON blob would silently drop all difficulties with no logging. Consider adding a log warning in the catch block. |
| Minor | `frontend/src/pages/StudentForm.tsx` (submit handler): Incomplete difficulty rows (missing dropdown selection) are silently filtered out on submit with no user feedback. Could add a toast or inline warning when rows are dropped. |

## PR #157 - 2026-03-21

- **Minor** - `TargetedDifficulties.tsx:20`: Silent `catch {}` on JSON parse. Could add `console.warn` for debuggability.
- **Minor** - `frontend/src/api/generate.ts`: `TargetedDifficulty` is intentionally a subset of backend `DifficultyDto` (omits `id`, `trend`). Not a bug but undocumented.
- **Important** - `GenerateController.cs:300-312`: Manual field listing in `GenerationParams` serialization (non-streaming path). New request fields must be added here manually.

### PR (2026-03-21) — Usage Limits (#105)

| Severity | Finding |
|----------|---------|
| Important | `UsageLimitService.cs`: `GetUsageStatusAsync` and `CanGenerateAsync` both query Teacher + count GenerationUsages independently. When called together (as in GenerateController), this duplicates DB round-trips. Consider a combined method or caching within the request scope. |
| Important | `GenerateController.cs`: TOCTOU race between `CanGenerateAsync` check and `RecordGenerationAsync`. Two concurrent requests could both pass the check and exceed the limit by 1. Acceptable for current scale but would need atomic decrement for strict enforcement. |

### PR (2026-03-21) — Usage Limits (#105) — UI Review

| Severity | Finding |
|----------|---------|
| Minor | `UsageIndicator.tsx`: progress bar at 0% is invisible (width: 0%). Consider a minimum visible width (e.g., 2%) for better affordance. |
| Minor | `UsageIndicator.tsx`: progress bar track height `h-1.5` (6px) is very thin on high-DPI displays. Consider `h-2` (8px). |
| Minor | `AppShell.tsx`: no visual separator between UsageIndicator and user avatar section in sidebar. A subtle border or extra padding would improve grouping. |
| Minor | Lesson editor mobile header: action buttons crowd at 375px width. Could benefit from responsive collapse / "more" menu (pre-existing, not introduced by this PR). |

| #213 | 2026-03-22 | Minor | Duplicated skip button footer JSX in OnboardingStep2.tsx and OnboardingStep3.tsx — consider a shared SkipLink or OnboardingStepFooter component if more steps are added |

### PR (2026-03-22) — Fix Reading & Comprehension template (#227)

| Severity | Finding |
|----------|---------|
| Minor | `GenerateController.cs`: template-lookup logic (4-line block) is duplicated in both `Stream` and `Generate` methods. Pre-existing duplication in the controller, slightly extended by this PR. Extract shared validation+context-build into a private helper when refactoring. |
| Minor | `PromptService.cs`: template name matched by hardcoded string "Reading & Comprehension". If templates are renamed or new templates need custom prompt handling, consider a template slug or enum to avoid fragile string comparisons. |
