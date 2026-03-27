# Task 142: Regenerate button should toggle panel open/closed

## Issue
#142 - [UX] Regenerate button should toggle panel open/closed like Generate does

## Problem
In `LessonEditor.tsx`, the Generate button uses a toggle pattern (line ~720-724):
- if panel is open for this section → close it
- if panel is closed → open it

But the `onRegenerate` prop passed to `ContentBlock` (line ~792) always calls `setGenerateOpen(type)` unconditionally, so clicking Regenerate a second time does not close the panel.

## Root cause
`LessonEditor.tsx` line ~792:
```tsx
onRegenerate={() => setGenerateOpen(type)}
```
Should be:
```tsx
onRegenerate={() => generateOpen === type ? closeGeneratePanel() : setGenerateOpen(type)}
```

## Changes

### `frontend/src/pages/LessonEditor.tsx`
- Change `onRegenerate` prop from always-open to a toggle using `generateOpen === type`.

### `frontend/src/components/lesson/ContentBlock.test.tsx`
- Add/update tests to verify `onRegenerate` is called on each click (toggle logic lives in LessonEditor, ContentBlock just calls it).

### `frontend/src/pages/LessonEditor.tsx` (test coverage)
- No dedicated test file for LessonEditor currently; toggle behavior is covered by ContentBlock tests at the prop boundary.

## Notes
- `ContentBlock.handleRegenerate` saves dirty content before calling `onRegenerate()`. This is correct regardless of toggle direction (saving on close is harmless).
- No visual state change needed on the Regenerate button (issue only asks for toggle behavior).
- The "switch to new block" behavior (open different block's panel while one is already open) is preserved because `generateOpen !== type` is true in that case, so `setGenerateOpen(type)` still runs.
