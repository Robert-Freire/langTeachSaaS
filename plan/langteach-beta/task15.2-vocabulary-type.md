# T15.2 — Vocabulary Type (Teacher + Student)

## Context

T15.1 built the typed content model foundation with a registry, dispatch, and a basic VocabularyRenderer. The current state:
- **Editor**: Editable table with inline inputs, but no add/remove row capability
- **Preview**: Read-only table (good as-is)
- **Student**: Just re-renders Preview (a plain table), needs to be **flashcards**

This task upgrades the vocabulary type to be fully functional for both teacher editing and student learning.

## Changes

### 1. Enhance VocabularyRenderer Editor (add/remove rows)

**File**: `frontend/src/components/lesson/renderers/VocabularyRenderer.tsx`

- Editor renders its own table (not shared VocabTable) so the delete column doesn't affect Preview
- Add a "+ Add word" button below the table that appends an empty `VocabularyItem`
- Add a delete button (X icon) on each row to remove it
- Extra column header for the delete action (only in Editor's own table)
- onChange emits the updated JSON after each add/remove

### 2. Build Flashcard Student Component

**File**: `frontend/src/components/lesson/renderers/VocabularyRenderer.tsx` (same file, replace the Student function)

- Add `import { useState, useEffect, useCallback } from 'react'` (currently missing)
- Use inline `style` props for 3D card-flip CSS (perspective, backface-visibility, rotateY) since these aren't Tailwind utilities
- Handle empty items array with a fallback message

Flashcard UI:
- Card shows **word** on front, **definition + example + translation** on back
- Click/tap to flip (CSS transform with transition)
- Previous/Next navigation buttons
- Progress indicator: "1 / 3" (matches fixture count)
- Keyboard support: left/right arrows for nav, space/enter to flip
- `data-testid="flashcard-container"`, `data-testid="flashcard-word"`, `data-testid="flashcard-definition"`, `data-testid="flashcard-progress"`, `data-testid="flashcard-prev"`, `data-testid="flashcard-next"`

### 3. Update E2E Test

**File**: `e2e/tests/typed-content-view.spec.ts`

Update the existing test:
- Line 75 currently asserts `vocabulary-table` in student view; change to assert `flashcard-container`
- Add interactions: flip a card, navigate next/prev, verify progress updates

### 4. No backend changes needed

The `VocabularyContent` schema (`{ items: VocabularyItem[] }`) is unchanged. All changes are purely frontend rendering.

## Files to modify

| File | Change |
|------|--------|
| `frontend/src/components/lesson/renderers/VocabularyRenderer.tsx` | Add/remove rows in Editor, flashcard Student component |
| `e2e/tests/typed-content-view.spec.ts` | Update student view assertion to flashcards, add flashcard interaction test |

## Verification

1. `cd frontend && npm run build` — zero errors
2. `cd backend && dotnet build` — zero errors (no backend changes, but verify)
3. `cd backend && dotnet test` — all pass
4. Run e2e tests against local Docker stack: `npx playwright test typed-content-view`
5. Manual check: generate vocabulary in lesson editor, verify add/remove rows work, switch to student view, verify flashcards flip and navigate
