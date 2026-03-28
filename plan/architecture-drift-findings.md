# Architecture Drift Findings

**Reviewer:** Sophy
**Date:** 2026-03-28
**Scope:** Full codebase review against newly documented architecture model (`docs/architecture-model.md`)

These findings represent deviations from the intended architectural model. They are not bugs. They are places where the boundary between config and code is blurry, or where the system has grown organically in ways that will cause friction as it scales.

Severity key:
- **P1**: Actively creates problems or blocks planned work
- **P2**: Will create problems when the next wave of changes arrives
- **P3**: Cosmetic drift, fix when touching the area anyway

---

## Finding 1: Section coherence rules hardcoded in PromptService

**Severity:** P2
**Location:** `backend/LangTeach.Api/AI/PromptService.cs:48-54`

The `SectionCoherenceRules` constant contains 5 pedagogical rules about how lesson sections relate to each other (e.g., "Practice MUST use EXCLUSIVELY content from Presentation"). These are pedagogical constraints that came from Isaac's spec, not engineering decisions.

**Why it matters:** When Isaac revises how sections relate (and he will, especially as new section types or exercise formats arrive), someone will need to edit C# code instead of a JSON file. This violates the boundary invariant: pedagogical rules belong in config.

**Suggested fix:** Move to a new field in `data/pedagogy/course-rules.json` (e.g., `sectionCoherenceRules: string[]`). PromptService reads and formats them, but doesn't own the content.

---

## Finding 2: Weakness targeting logic hardcoded in PromptService

**Severity:** P2
**Location:** `backend/LangTeach.Api/AI/PromptService.cs:471-486`

The weakness targeting block hardcodes which sections get which treatment:
- Practice: "include at least 1 exercise targeting..."
- Production: "create a context where these areas arise naturally"
- WrapUp: "invite the student to reflect on progress"

This is section-specific pedagogical guidance that should live in section profiles, not in C# string concatenation.

**Why it matters:** When the Adaptive Replanning milestone lands (post-difficulty updates, auto-replanning), weakness targeting will need to become more dynamic. Having it hardcoded means that future change will require C# edits for what is fundamentally a pedagogical policy.

**Suggested fix:** Add a `weaknessTargetingGuidance` field to each section profile JSON. PromptService reads and injects it when weaknesses are present. The section profile already has per-level guidance; this is a natural extension.

---

## Finding 3: uiRenderer values not validated at startup

**Severity:** P2
**Location:** `data/pedagogy/exercise-types.json` (all 76 entries) vs `ContentBlockType` enum

Every exercise type in the catalog has a `uiRenderer` field mapping it to one of the 8 content block types. But `PedagogyConfigService.ValidateCrossLayerRefs()` only validates exercise IDs across layers. It does not check that `uiRenderer` values match the known `ContentBlockType` enum.

Current values are correct (7 renderers used: vocabulary, grammar, exercises, conversation, reading, homework, free-text; lesson-plan is correctly absent since it's not an exercise type). But nothing prevents someone from adding `"uiRenderer": "quiz"` and having it silently pass startup validation.

**Why it matters:** The frontend content registry will fail at runtime (no renderer found) instead of at startup. This violates the fail-fast principle that the rest of the config architecture follows.

**Suggested fix:** Add uiRenderer validation to `ValidateCrossLayerRefs()`. Maintain a `HashSet<string>` of known renderer values (derived from the enum or a constant) and check each exercise type's uiRenderer against it.

---

## Finding 4: Content schema contract is implicit (coercion debt)

**Severity:** P2
**Location:** 12 files across `frontend/src/components/lesson/renderers/` and `frontend/src/types/contentTypes.ts`

The contract between "what Claude generates" and "what the frontend renderer expects" is not formally defined. Instead, each renderer has a `coerce*Content` function that handles schema variations (field renames, wrapping bare arrays, missing optional fields). This works, but it means:

1. The AI prompt says "generate vocabulary items" but the exact JSON shape is only enforced by coercion after the fact
2. There's no backend validation that generated content matches the expected schema before storing it
3. Each coercion function is independently authored, with no shared pattern

**Why it matters:** As new content types are added (guided writing, noticing tasks, sentence ordering per the Pedagogical Quality milestone), each one will need its own coercion function. The debt grows linearly. More importantly, if the AI model changes behavior (different field names, different nesting), the only defense is ad-hoc coercion in the browser.

**Suggested fix (phased):**
- Phase 1 (low effort): Add JSON Schema definitions for each content type in `data/content-schemas/`. Use them in PromptService to tell Claude exactly what schema to produce.
- Phase 2 (medium effort): Validate generated content against the schema on the backend before storing. Invalid content gets a warning flag instead of silent coercion.
- Phase 3 (if needed): Generate TypeScript types from the JSON Schemas to keep frontend types in sync.

This is a P2 because coercion works today. It becomes P1 when the Pedagogical Quality sprint adds 6 new content types.

---

## Finding 5: Curriculum personalization notes are unstructured

**Severity:** P3
**Location:** `CurriculumEntry.PersonalizationNotes` (string), `CurriculumEntry.ContextDescription` (string)

Both fields store free-text AI output with no schema or structure. The AI generates them, and they're displayed as-is in the curriculum walkthrough.

**Why it matters:** When Adaptive Replanning arrives, the system will need to parse and update these fields programmatically (e.g., adjust context descriptions based on difficulty changes). Free-text makes that fragile.

**Suggested fix:** Not urgent. When Adaptive Replanning is designed, define a structured format for these fields. For now, the free-text approach is honest about what the system knows.

---

## Summary

| # | Finding | Severity | Effort | Sprint |
|---|---------|----------|--------|--------|
| 1 | Section coherence rules in C# | P2 | Small | Next (Pedagogical Quality) |
| 2 | Weakness targeting in C# | P2 | Small | Next or Adaptive Replanning |
| 3 | uiRenderer startup validation gap | P2 | Tiny | Next (Pedagogical Quality) |
| 4 | Content schema contract implicit | P2 | Medium (phased) | Phase 1 with Pedagogical Quality |
| 5 | Curriculum personalization unstructured | P3 | Deferred | Adaptive Replanning |

Findings 1, 2, and 3 are straightforward to fix and should be bundled with the next sprint that touches the pedagogy config layer. Finding 4 is architectural debt that should be addressed incrementally, starting when new content types are added.
