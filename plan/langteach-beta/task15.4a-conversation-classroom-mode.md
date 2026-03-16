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

## Product Review Findings (2026-03-16)

A first implementation of this plan was reviewed with the PO. The role selection and phrase checklist worked mechanically but **provided no real utility to the student**. Root cause:

### Problem: key phrases are not associated with roles

The current `ConversationContent` schema stores phrases as a flat array:

```json
{ "keyPhrases": ["Can you recommend something?", "I would like...", "What is in this dish?"] }
```

When a student selects "I'm the Waiter," the phrases don't change. Phrases like "I would like..." are clearly Customer phrases, not Waiter phrases. The checklist becomes meaningless because the student can't tell which phrases are theirs to practice.

### Required change: role-specific phrases

Before implementing the UX features in this task, the conversation content schema must be updated:

**1. Update the TypeScript type** (`frontend/src/lib/contentTypes.ts`):

Change `ConversationScenario` from:
```ts
{ setup: string; roleA: string; roleB: string; keyPhrases: string[] }
```
To:
```ts
{ setup: string; roleA: string; roleB: string; roleAPhrases: string[]; roleBPhrases: string[] }
```

**2. Update the AI prompt** (`backend/.../PromptService.cs`):

Change the conversation output schema from `keyPhrases: []` to `roleAPhrases: []` and `roleBPhrases: []`. The prompt should instruct the AI to generate phrases specific to each role.

**3. Update all three renderers** (Editor, Preview, Student in `ConversationRenderer.tsx`):
- **Editor**: Two separate phrase tag lists (one per role), each with add/remove
- **Preview**: Phrases grouped under their role
- **Student**: When a role is selected as "You," show "Your phrases" prominently and "Partner's phrases" dimmed

**4. Update the mock fixture** (`e2e/helpers/mock-ai-stream.ts`):

Change `CONVERSATION_FIXTURE` to use `roleAPhrases` / `roleBPhrases`.

**5. Update the type guard** (`isConversationContent` in `contentTypes.ts`):

Validate the new fields. Consider backward compatibility: old content with flat `keyPhrases` should either be migrated or handled gracefully (show all phrases ungrouped).

### Why this matters beyond T15.4a

This schema change is foundational for the entire conversation feature chain:
- **T15.4b (AI chat)**: The AI partner needs to know which phrases to steer the student toward (student's role phrases) vs. which to use in its own responses (AI's role phrases)
- **T15.4c (voice)**: Phrase detection for check-off must match against the student's role phrases only

Doing this now avoids a migration later.

### Revised acceptance criteria

All original acceptance criteria still apply, plus:
- Key phrases are generated and stored per role (roleAPhrases / roleBPhrases)
- When a student selects a role, only that role's phrases appear as "Your phrases"
- Partner's phrases are visible but visually secondary (dimmed or collapsed)
- Existing lessons with flat `keyPhrases` degrade gracefully (show all phrases ungrouped)

## Verification

Same as T15.4:
- `cd frontend && npm run build` passes
- `npx playwright test --project=mock-auth e2e/tests/conversation-type.spec.ts` passes
