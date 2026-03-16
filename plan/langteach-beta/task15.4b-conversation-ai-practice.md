# T15.4b — Conversation Type: AI Practice Partner (Path B)

## Context

T15.4 delivered conversation scenarios as classroom reference cards. T15.4a improves the in-class UX. This task adds the self-study mode: the student practices the conversation with an AI partner instead of a classmate.

This is a significant feature that transforms conversations from a passive reference into an interactive learning activity. It is the natural evolution of the conversation type and a key differentiator for students studying outside class hours.

**Timeline:** Post-beta or premium feature. Not required for the initial demo, but should be planned so the data model and UI don't need rework.

## How it works

### Student flow

1. Student opens a lesson with conversation content
2. Each scenario card shows two modes: **"Practice with partner"** (existing) and **"Practice with AI"**
3. Student taps "Practice with AI" and selects which role they want to play
4. A chat interface opens within the scenario card (or as a slide-over panel)
5. The AI plays the opposite role, opening with a contextually appropriate first line
6. The student types responses in the target language
7. Key phrases appear as tappable hints in a sidebar/strip (the student can tap to insert, or type freely)
8. As the student uses key phrases (detected via fuzzy match), they get visually checked off
9. The conversation ends when the student clicks "Finish" or after a natural conclusion
10. A brief summary appears: phrases used, phrases missed, one suggestion for improvement

### AI behavior

- The AI stays in character as the assigned role
- It responds naturally within the scenario context
- It gently steers toward situations where unused key phrases would be relevant
- It matches the student's CEFR level (simpler vocabulary for A1-A2, more complex for B2+)
- It does NOT correct grammar mid-conversation (that breaks immersion). Corrections go in the end summary.
- If the student writes in the wrong language, the AI gently redirects: "Let's keep practicing in {language}!"

### System prompt construction

The existing `BuildConversationPrompt` in the prompt service provides the foundation. The AI practice session needs a new prompt method, `BuildConversationPracticePrompt`, that includes:

- The scenario context (setup)
- The AI's assigned role description
- The student's role description (so the AI knows what to expect)
- The key phrases (so the AI can steer toward them)
- The student's CEFR level
- The student's native language (to avoid false cognates in the AI's responses)
- Instruction to stay in character and match the level

### Data model considerations

**Chat messages:** Stored as a JSON array in a new field or content block. Structure:

```json
{
  "scenarioIndex": 0,
  "role": "customer",
  "messages": [
    { "sender": "ai", "text": "Good evening! Welcome to La Trattoria. Can I help you?", "timestamp": "..." },
    { "sender": "student", "text": "Yes, I would like to order...", "timestamp": "..." }
  ],
  "phrasesUsed": ["I would like to order..."],
  "completedAt": "..."
}
```

**No grading or scoring in v1.** The summary is informational, not evaluative. Grading adds complexity and pressure that works against conversational fluency practice.

## Technical components

### Backend

| Component | Description |
|-----------|-------------|
| `IPromptService.BuildConversationPracticePrompt()` | New method, takes scenario + student context + chat history |
| New endpoint: `POST /api/lessons/{id}/conversation-practice` | Accepts scenario index + student message, returns AI response via streaming |
| Chat history storage | Either a new `ConversationPractice` table or JSON field on existing content |

### Frontend

| Component | Description |
|-----------|-------------|
| `ConversationPracticePanel.tsx` | Chat UI: message list, input field, key phrase hints strip |
| Update `ConversationRenderer.Student` | Add "Practice with AI" button per scenario |
| Phrase detection logic | Client-side fuzzy match to check off phrases as student types |
| Session summary component | End-of-conversation review with phrase usage |

### E2E

| Test | Description |
|------|-------------|
| `conversation-practice.spec.ts` | Mock AI stream for practice responses, test full flow: select role, send message, receive response, check phrase detection, finish and see summary |

## Design decisions to make before implementation

1. **Chat UI location:** Inline (expands within the scenario card) vs. slide-over panel vs. full-page view?
2. **Message persistence:** Save conversation history for review later, or ephemeral (gone on reload)?
3. **Multiple attempts:** Can the student redo the same scenario? Reset the conversation?
4. **Teacher visibility:** Can the teacher see that a student practiced and how they did? (Privacy considerations)
5. **Token budget:** How many exchanges before the conversation is capped? (Cost control)

## Dependencies

- T15.4 (conversation renderer, DONE)
- T15.4a (classroom mode improvements)
- Streaming infrastructure from T13/T14 (already exists)

## Out of scope for v1

- Voice input/output (STT/TTS)
- Grammar correction during conversation
- Scoring or grading
- Student-to-student pairing
- Teacher live monitoring of practice sessions
