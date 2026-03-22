# Task 242: Fix duplicate Regenerate labels and add auto-fill hint

## Issue
GitHub #242 — Two lesson editor UX issues found in UI reviews.

## Changes

### 1. ContentBlock.tsx — hide block-level Regenerate in error state
When `parsedContent` is null, `ContentEditorParseError` already renders a Regenerate button
in the amber error box. The block-level action row also renders one unconditionally.

Fix: conditionally render the block-level Regenerate button only when `parsedContent !== null`.

### 2. LessonNew.tsx — add auto-fill hint text below student selector
The student selector silently auto-fills language and level when a student is selected.
No hint text explains this behavior.

Fix: add `<p className="text-xs text-zinc-500">` hint below the Select element.
Only show when students are present (same condition as the whole student field).

## Tests
- ContentBlock.test.tsx: add test asserting block-level regenerate-btn is NOT rendered when parsedContent is null (parse error state)
- LessonNew.test.tsx: add test asserting hint text is present in the student selector section

## Files
- frontend/src/components/lesson/ContentBlock.tsx
- frontend/src/components/lesson/ContentBlock.test.tsx
- frontend/src/pages/LessonNew.tsx
- frontend/src/pages/LessonNew.test.tsx
