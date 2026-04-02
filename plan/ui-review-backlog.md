# UI Review Backlog

Non-blocking findings from review-ui runs. Periodically review this file and batch related items into polish GitHub issues.

---

*Cleared 2026-03-28 during Student-Aware Curriculum sprint close (round 2). 6 entries processed: 4 batched into #349 (UX polish), 2 deleted (pre-existing issues already tracked in #246).*

*Previous clearing 2026-03-27: 20 entries deleted, 17 batched into issues #298, #299, #300, #303.*

## PR task-t274-noticing-task (2026-03-31) -- #274 noticing task

| Severity | Finding |
|----------|---------|
| Important | [I1] Editor: Position fields show raw character indices (11, 14, 28) meaningless to teachers, no labels once filled. |
| Important | [I2] Student view: No visible focus ring on word tokens for keyboard navigation despite tabIndex/keyDown handlers. |
| Minor | [M1] Editor: Grammar ref field is plain text input, could use autocomplete from grammar catalog. |
| Minor | [M2] Preview: Target legend text-xs with grammar IDs may not be meaningful to teachers. |
| Minor | [M3] Student view: Discovery Questions are read-only with no interactive affordance for student answers. |

## PR task-t272-sentence-transformation (2026-03-31) — #272 sentence transformation

| Severity | Finding |
|----------|---------|
| Important | [I1] Editor ST table: cell content truncated at ~15-18 chars. 6 columns with long content need text wrapping or column hiding. |
| Important | [I2] Editor ST table: "Alternatives (comma-sep)" header wraps awkwardly. Shorten to "Alt. Answers" or "Alternatives". |
| Minor | [M1] Editor ST table: inputs feel cramped; add min-width to cells. |
| Minor | [M2] Student view: placeholder "Type your answer..." could be more specific ("Write the transformed sentence..."). |
| Minor | [M4] Editor: no visual separator before ST section heading at bottom of exercises block. |

## PR task-t269-sentence-ordering (2026-03-31) — #269 sentence ordering

| Severity | Finding |
|----------|---------|
| Important | [I1] Editor (mobile 375px): Sentence Ordering table headers wrap badly; consistent with other tables but worth fixing in a mobile table polish pass. |
| Important | [I2] Editor (desktop): Fragments and Hint columns truncate without scroll or tooltip for long values. |
| Minor | [M1] Student (mobile): "Tap the words..." instruction is text-xs; bump to text-sm for mobile readability. |
| Minor | [M2] Student (mobile): Fragment chip touch targets ~32px, below 44px guideline. |
| Minor | [M4] Editor: Correct Order column shows raw 1-based indices; showing reconstructed sentence would help teachers verify. |

## Teacher QA Screenshot Review (2026-03-28)

| Severity | Finding |
|----------|---------|
| Medium | Student view title truncation on long lesson names (visible in Sprint Reviewer persona: title cuts off at "impe" instead of "imperfecto"). Editor view wraps correctly. |
| Low | Role selector pill does not handle long role descriptions gracefully (visible in Carmen B2: "James (estudiante de espanol interesado en politica)" stretches the pill to two lines). Consider max-width with ellipsis or tooltip. |
