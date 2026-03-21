# Review Agent Improvement Plan

> Based on analysis of 370 CodeRabbit comments across 42 merged PRs (210 initial findings, 160 follow-ups/resolutions).

## Executive Summary

CodeRabbit produced 210 initial findings: 28 real bugs (13%), 121 valid improvements (58%), 61 noise (29%). Our current review agent (`review.md`) already checks for bugs, security, and data loss, but does so with general instructions rather than specific, learnable patterns. 14 of the 17 high-ROI patterns below are mechanically detectable and should be added as explicit checklist items.

The $30/month CodeRabbit cost is not justified: its 29% noise rate is high, and the patterns it catches well are ones our agent can learn.

## Current State of the Review Agent

The review agent (`.claude/agents/review.md`) has a solid structure with Critical/Important/Minor/Out-of-scope categories. What it lacks:
- **Specific patterns to check**: it says "null derefs" generically but doesn't specify the JWT claim pattern, Array.fill() bug, etc.
- **File-type-specific checklists**: no differentiated checks for .cs vs .tsx vs .spec.ts vs .yml
- **Noise exclusion rules**: no explicit instruction to skip plan files, data files, or markdown formatting

## Identified Patterns (sorted by frequency)

### Tier 1: High ROI, Fully Mechanically Detectable (add first)

These 10 patterns cover the most frequent and impactful findings. All can be checked by reading the diff and surrounding context.

| # | Pattern | Type | Freq | Detection Method |
|---|---------|------|------|-----------------|
| 1 | **Missing error state in UI** | IMPROVEMENT | 10 | `useMutation`/`useQuery` hooks where `isError` not handled in JSX or `onError` only calls `console.error` |
| 2 | **PII in log statements** | IMPROVEMENT | 8 | `_logger.Log*()` calls containing `.Email`, `.Auth0Id`, `.auth0Id`, or full response body strings |
| 3 | **Unguarded array/property access** | IMPROVEMENT | 8 | `someArray[0].property` without prior length check; EF Core nav properties serialized without Include check |
| 4 | **Null-forgiving on JWT claims** | BUG | 5 | `FindFirstValue(...)!` or `.Value!` on claim extraction in controllers |
| 5 | **Double-submit / no loading guard** | BUG | 5 | Mutation trigger buttons not disabled by `isPending`/`isLoading` state |
| 6 | **Unhandled async rejection** | BUG | 5 | `onError` handlers that only log, no toast/notification call |
| 7 | **Missing MaxLength on DTO strings** | IMPROVEMENT | 4 | String properties in request DTOs without `[MaxLength]` attribute |
| 8 | **IDisposable not disposed** | IMPROVEMENT | 4 | `JsonDocument.Parse` without `using`; `useEffect` with `setInterval`/`setTimeout` without cleanup return |
| 9 | **Missing enum validation at API boundary** | BUG | 3 | String properties named Level/Type/Direction/Status in DTOs without `[EnumDataType]` or validation |
| 10 | **Missing pagination bounds** | BUG | 3 | Pagination DTOs with `PageSize` missing `[Range(1, MAX)]` |

### Tier 2: High ROI, Detectable with Context Reading

| # | Pattern | Type | Freq | Detection Method |
|---|---------|------|------|-----------------|
| 11 | **Test isolation / shared state** | IMPROVEMENT | 5 | `beforeAll` calling DB mutation helpers in e2e specs |
| 12 | **GitHub Actions token over-scoped** | IMPROVEMENT | 5 | `permissions: id-token: write` at workflow-level instead of job-level |
| 13 | **CancellationToken not propagated** | IMPROVEMENT | 3 | Controller action has `CancellationToken` param not passed to service calls |
| 14 | **Delete-before-commit ordering** | BUG | 2 | Storage delete call preceding `SaveChangesAsync()` in same method |
| 15 | **E2E cleanup missing deletion assertion** | IMPROVEMENT | 3 | afterAll/afterEach delete calls without row-count assertion |
| 16 | **Unsanitized AI prompt inputs** | IMPROVEMENT | 3 | User-input fields interpolated directly into prompt template strings |
| 17 | **Array.fill() with object** | BUG | 1 | `Array(n).fill({` or `Array(n).fill([` in TypeScript |

### Tier 3: Partial Detection (semantic understanding needed)

| # | Pattern | Type | Freq | Notes |
|---|---------|------|------|-------|
| 18 | **Weak test assertions** | IMPROVEMENT | 14 | Highest frequency but hardest to detect. Tests that pass even when feature is broken. Requires understanding test intent. |
| 19 | **Type guard insufficiency** | IMPROVEMENT | 5 | Guard function doesn't check all required interface fields. Requires reading both interface and guard. |
| 20 | **Autosave/navigation race conditions** | IMPROVEMENT | 5 | Navigation or preview triggered while save is in-flight. Requires understanding async state flow. |
| 21 | **Accessibility gaps** | IMPROVEMENT | 4 | Missing `type="button"`, ARIA labels, keyboard focus. Partially detectable (button type check is easy). |

## Noise Exclusion Rules (add to agent)

The review agent should explicitly skip:

1. **Plan/doc files** (`.md` in `plan/` directory): never review design documents
2. **Data/content files** (`.json` in `data/curricula/`): domain content, not code
3. **Markdown formatting**: language tags on code blocks, phrasing polish
4. **Speculative findings**: only flag race conditions where the code structure makes them demonstrably possible, not "what if" scenarios

## Implementation Plan

### Phase 1: Update review agent prompt (this task's deliverable)

Add the Tier 1 and Tier 2 patterns as a specific checklist in the review agent's "What to check" section, organized by file type:

**For .cs (backend) files, check:**
- Null-forgiving operator on JWT claim extraction (BUG-1)
- PII in log statements (IMP-1)
- Missing `[MaxLength]` on DTO string properties (IMP-9)
- Missing `[EnumDataType]` or validation on enum-like DTO strings (BUG-9)
- Missing `[Range]` on pagination PageSize (BUG-7)
- `JsonDocument.Parse` without `using` (IMP-7)
- CancellationToken available but not propagated (IMP-4)
- Storage delete before `SaveChangesAsync()` (BUG-5)

**For .tsx/.ts (frontend) files, check:**
- `useMutation`/`useQuery` without error state handling in JSX (IMP-3)
- Mutation button not disabled by `isPending`/`isLoading` (BUG-2)
- `onError` handler that only calls console.error (BUG-3)
- `useEffect` with timer not returning cleanup function (IMP-7)
- `Array(n).fill({...})` with object argument (BUG-4)
- Unguarded `someArray[0].property` access (IMP-13)

**For .spec.ts (test) files, check:**
- `beforeAll` with DB mutation helpers (IMP-6)
- afterAll/afterEach delete without assertion (IMP-15)

**For .yml (CI) files, check:**
- `id-token: write` at workflow-level permissions (IMP-12)

**Noise exclusion additions:**
- Skip `.md` files in `plan/` directory
- Skip `.json` files in `data/` directory
- Do not flag speculative "what if" scenarios

### Phase 2: Separate implementation issues (out of scope for this task)

Each pattern that requires code changes (e.g., actually fixing all existing PII-in-logs instances, adding MaxLength to all DTOs) should be filed as separate GitHub issues. This plan only covers teaching the review agent to catch them going forward.

## Statistics Summary

| Metric | Value |
|--------|-------|
| Total CodeRabbit findings analyzed | 210 |
| Real bugs found | 28 (13%) |
| Valid improvements found | 121 (58%) |
| Noise | 61 (29%) |
| Unique patterns identified | 24 |
| Patterns our agent can fully detect | 17 |
| Patterns requiring semantic understanding | 4 |
| Patterns already partly covered by current agent | 3 (bugs, security, missing validation - but generic) |
| New specific patterns to add | 17 |
| PRs analyzed | 42 |
| PRs with CodeRabbit inline comments | 42 |
| PR-level summary comments | 75 |

## Raw Data

Full analysis with per-finding categorization saved to `/tmp/cr_analysis.md`.
Condensed finding summaries saved to `/tmp/cr_findings.txt`.
