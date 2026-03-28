# Task 352: Fix Content Truncation in AI-Generated Exercises

## Root Cause (Confirmed by Teacher QA Data)

Spanish JSON tokenizes at ~3 chars/token (denser than English prose). After the pedagogy
config refactor (#319-#327), prompts now produce longer, more detailed responses that exceed
the existing MaxTokens limits.

Evidence from lesson-content.json files:
- `exercises` block: ~7500 chars ≈ 2500 tokens → MaxTokens 2048 → TRUNCATED
- `grammar` block: ~5300 chars ≈ 1770 tokens → MaxTokens 1500 → TRUNCATED (Carmen B2.1)
- `conversation` block: ~5500 chars ≈ 1833 tokens → MaxTokens 1500 → TRUNCATED (Carmen WrapUp)

Secondary issue: `StreamAsync` does not detect `stop_reason: "max_tokens"` from Claude's
`message_delta` SSE event, so truncation is silent in production logs.

## Changes

### 1. PromptService.cs — increase MaxTokens

| Prompt | Before | After | Reason |
|--------|--------|-------|--------|
| Grammar | 1500 | 3000 | B2 grammar with detailed common mistakes exceeds 1500 |
| Exercises | 2048 | 4096 | 6 MC + fill-in-blank + matching with explanations can exceed 2048 |
| Conversation | 1500 | 3000 | Multi-scenario conversations at B2 exceed 1500 |
| Reading | 2048 | 4096 | 300-500 word passage + questions + vocab highlights at B2+ |
| LessonPlan | 8192 | 8192 | No evidence of truncation; keep unchanged |
| Vocabulary | 2048 | 2048 | Short format; no truncation observed |
| Homework | 1024 | 1024 | Short format; no truncation observed |
| FreeText | 1024 | 1024 | Short prose; no truncation observed |

### 2. ClaudeApiClient.cs — streaming truncation detection

Add `message_start` and `message_delta` parsing to `StreamAsync`:
- `message_start`: capture input token count (stored in local var)
- `message_delta`: capture output token count + stop_reason
  - If `stop_reason == "max_tokens"`: log `LogWarning` with MaxTokens value
  - At stream completion: log `LogInformation` with model, input, output, latency (mirrors CompleteAsync)

### 3. PromptServiceTests.cs — update assertions

Update 4 MaxTokens tests to match new values:
- `GrammarPrompt_HasMaxTokens1500` → assert 3000
- `ExercisesPrompt_HasMaxTokens2048` → assert 4096
- `ConversationPrompt_HasMaxTokens1500` → assert 3000
- `ReadingPrompt_HasMaxTokens2048` → assert 4096

## Out of Scope

- WarmUp/WrapUp overgeneration (BUG 4, BUG 5 from sprint-reviewer report) — separate issue
- L1 field mismatch (BUG 3) — separate issue
- Teacher QA re-run — triggered by user after merge
