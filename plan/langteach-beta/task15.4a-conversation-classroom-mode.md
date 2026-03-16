# T15.4a — Conversation Type: Classroom Mode Improvements

## Context

T15.4 delivered the conversation type renderer (editor, preview, student view). Product review identified that the student view works as a **classroom reference card** (teacher prepares scenarios with AI, students practice role-plays in pairs during class). However, the current student view lacks clear affordances for this use case. This task adds the missing UX signals.

## What changes

All changes are frontend-only, in the student view of `ConversationRenderer.tsx` and its styles.

### 1. Activity instruction header

Add a visible instruction at the top of the conversation student view:

> **Practice with a partner:** Choose a role, read the context, and have a conversation using the key phrases below.

This removes ambiguity about what the student should do with the content.

### 2. Role selection with visual feedback

Current state: Role A and Role B are displayed as labels (or simple toggle buttons with no consequence).

Target state:
- When the student taps a role, that role gets a **"You"** badge/indicator and is highlighted (indigo).
- The other role gets a **"Partner"** badge and is dimmed (slate/gray).
- This is purely visual (local state, no persistence). It helps the student orient during the in-class activity.
- Default state: neither role selected, both shown equally.

### 3. Key phrases as a practice checklist

Current state: key phrases render as static chips.

Target state:
- Each phrase chip is tappable/clickable.
- Tapping toggles a subtle checkmark or strike-through on the chip.
- This lets students track which phrases they managed to use during the conversation.
- State is local only (no persistence, resets on reload). This is intentional: it is a live classroom aid, not a graded activity.

### 4. Print-friendly layout (optional, low priority)

Add a `@media print` CSS block that:
- Hides the app shell (sidebar, header)
- Renders scenario cards in a single-column, compact layout
- Shows all scenarios on minimal pages
- Keeps key phrases readable at print size

This supports teachers who project the lesson on screen or print handouts.

## Files to modify

| File | Change |
|------|--------|
| `frontend/src/components/lesson/renderers/ConversationRenderer.tsx` | Student component: add instruction header, role selection state, phrase toggle |
| `e2e/tests/conversation-type.spec.ts` | Add assertions for instruction text, role selection interaction, phrase toggle |

## Out of scope

- No backend changes
- No persistence of role selection or phrase check state
- No AI interaction (that is T15.4b)

## Acceptance criteria

- Student view shows clear "Practice with a partner" instruction
- Tapping a role highlights it as "You" and dims the other as "Partner"
- Tapping a key phrase toggles a visual check/uncheck
- All existing e2e tests still pass
- New e2e assertions cover the three new behaviors

## Verification

Same as T15.4:
- `cd frontend && npm run build` passes
- `npx playwright test --project=mock-auth e2e/tests/conversation-type.spec.ts` passes
