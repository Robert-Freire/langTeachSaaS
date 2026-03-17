# LangTeach Beta Plan — "Show the Magic"

> **Goal**: Build a compelling beta that demonstrates the full teacher-to-student loop: teacher creates structured lessons with AI, content renders as proper learning materials (not raw JSON), and a student can interact with the same content as flashcards, quizzes, and dialogues.
> **Timeline**: Weeks 4-8 (after Phase 1 foundation)
> **Audience**: Robert's brother (language teacher, potential PM for the project)
> **Success metric**: The brother sees the demo and wants to join as PM. He sees not just a tool, but a platform with a clear vision for growth.

---

## Current Status (as of 2026-03-15)

### Phase 1 — COMPLETE (T1-T9, T9.1 deferred to T20 in beta)

| Task | Description | Status |
|------|-------------|--------|
| T1 | Repository & Tooling Setup | DONE |
| T2 | Azure Infrastructure (Bicep, Container Apps, SQL, SWA, Key Vault) | DONE |
| T3 | Auth0 Integration (JWT, Auth0Provider, Serilog, Playwright) | DONE |
| T4 | Database Schema (EF Core migrations, seed templates) | DONE |
| T5 | Teacher Profile API + UI | DONE |
| T5.1 | Design System (Tailwind, shadcn/ui, AppShell) | DONE |
| T6 | Student Profiles API + UI | DONE |
| T7 | Lesson CRUD API | DONE |
| T8 | Lesson UI (Planner, section editor, duplicate, publish) | DONE |
| T9 | CI/CD Pipeline (GitHub Actions, ACR, OIDC) | DONE |
| T9.1 | Brand & Logo | MOVED TO T20 |

### Beta Phase — IN PROGRESS

**Next task: T19.1** (Schedule from Dashboard)

| Phase | Tasks | Status |
|-------|-------|--------|
| 2A Core Magic | T10, T10.1, T11-T15 | DONE |
| 2A.1 Typed Content | T15.1, T15.2, T15.3, T15.4, T15.5, T15.6, T15.7 | T15.1-T15.6 DONE, T15.7 pending |
| 2A.2 Conversation UX | T15.4a (classroom), T15.4b (AI chat), T15.4c (voice) | T15.4a DONE, T15.4b/c: future |
| 2B Make It Real | T16-T19, T19.1, T20, T21, T24-T25 | T16 DONE, T17 DONE, T19 DONE (PR #60), T18/T19.1/T20/T21/T24-T25 pending |
| 2C Polish | (T20 moved to 2B) | -- |
| Demo Prep | T23 | pending |
| Post-Demo | T26, Student Recurring Schedule, Classes Entity | pending |

---

## Strategic Context

### What Phase 1 Delivered (T1-T9)

The foundation is solid but entirely manual:
- Auth (Google OAuth via Auth0)
- ~~Dashboard with basic stats (student count, lessons, active plans)~~ Replaced by T19: weekly schedule view with WeekStrip, NeedsPreparation, QuickActions, UnscheduledDrafts
- Student management (CRUD: name, language, level, interests, notes)
- Lesson creation from 6 templates (Conversation, Grammar, Reading, Writing, Exam Prep, Blank)
- Lesson planner with 5 structured phases (Warm Up, Presentation, Practice, Production, Wrap Up), each with manual textarea
- Search, filter, duplicate, draft/publish lessons
- Teacher profile settings (languages, CEFR levels, teaching style)
- CI/CD pipeline (GitHub Actions)

**The gap** (as of Phase 1): Lesson sections are empty textareas. There's no AI, no generated content, no export. It's a shell with good bones but no magic.

~~**The gap** (as of T15): no typed content model.~~ **Resolved by T15.1-T15.4**: Vocabulary renders as editable tables/flashcards, exercises as interactive quizzes, conversations as scenario cards. T15.5-T15.6 will complete coverage for grammar and homework (currently raw JSON). The remaining gap is student interactivity for conversations (T15.4a for classroom use done, T15.4b/c for self-study post-beta).

### What a Preply Teacher Needs

A self-employed teacher on Preply typically:
- Teaches 5-8 lessons/day across different students and levels
- Spends 15-30 min prepping each lesson (vocabulary lists, exercises, conversation starters)
- Juggles students at A1 through C1, each with different interests and goals
- Needs to look professional and organized (reviews drive their business)
- Tracks progress informally (memory, scattered notes, maybe a Google Doc)
- Wants to grow their student base but is time-constrained

### The "I Need This" Moment

The demo moment that sells it: the teacher opens a lesson for "Maria, B1 Spanish, topic: travel," clicks Generate, and watches a complete, personalized lesson materialize in seconds, with vocabulary tailored to her level, exercises that reference her interests, and a warm-up based on her profile. Then clicks "Export PDF" and has a printable handout.

### What This Plan Changes vs. Original Phase 2

The original Phase 2 plan was designed for a production SaaS launch. This beta plan reorganizes around **demo impact**, not infrastructure completeness.

**Kept from Phase 2**: Claude client, prompt service, generation endpoints, streaming, lesson editor AI UI, inline editing.
**Deferred**: Generation caching (optimization), usage tracking/limits (monetization), GenerationCache table, GenerationUsage table.
**Added**: Student profile enrichment (feeds prompt quality), one-click full lesson, PDF export with teacher/student modes (moved from Phase 3), reading comprehension generation, adapt lesson for another student, AI-powered next topic suggestions, student lesson notes, dashboard v2 with lesson scheduling (`ScheduledAt` field), brand polish, demo preparation task.

---

## Engineering Principles (inherited from Phase 1, plus additions)

- All Phase 1 principles still apply (IaC, row-level security, logging, Playwright tests)
- **Prompt quality over infrastructure**: Invest disproportionate time in T12 (Prompt Service). If the AI generates generic content, the demo fails regardless of how good the streaming UI is.
- **Student context is the moat**: Any teacher can paste a prompt into ChatGPT. What they can't easily do is build a system where student context automatically flows into every generation.
- **No premature monetization**: No usage limits, no caching, no Stripe. The beta is unlimited. These are easy to add later; they add zero demo value now.

---

## Template-to-Content-Type Mapping

Each lesson template defines the *pedagogical purpose* of the lesson. The content types define *how the generated content is structured and rendered*. A single template uses multiple content types across its 5 PPP sections. This mapping drives what the prompt service generates and what renderers are needed per template.

| Template | Warm Up | Presentation | Practice | Production | Wrap Up |
|----------|---------|-------------|----------|------------|---------|
| **Conversation** | vocabulary (key phrases) | conversation (dialogue scenarios) | exercises (gap-fill with phrases) | conversation (open scenario) | vocabulary (review) |
| **Grammar** | exercises (diagnostic quiz) | grammar (rules + examples) | exercises (drills) | exercises (apply in context) | grammar (summary) |
| **Reading** | vocabulary (pre-reading words) | reading (passage + questions) | exercises (comprehension) | freeText (discussion prompts) | vocabulary (review) |
| **Writing** | vocabulary (topic phrases) | freeText (model text + structure guide) | exercises (sentence-level practice) | freeText (writing prompt + guidelines) | freeText (self-review checklist) |
| **Exam Prep** | exercises (quick review) | grammar or reading (exam format explanation) | exercises (exam-style questions) | exercises (timed practice set) | freeText (study tips + plan) |
| **Blank** | freeText | freeText | freeText | freeText | freeText |

**Key takeaways:**
- **vocabulary** and **exercises** appear in nearly every template. They are the workhorses.
- **Writing** and **Exam Prep** lean on `exercises` + `freeText`, which already have renderers. No new content types needed.
- **Blank** always uses `freeText`, giving teachers full manual control.
- The prompt service (T12) should use this mapping when `BuildLessonPlanPrompt` decides which content type to generate per section.

---

## Task Breakdown

### Phase 2A — The Core Magic

These features are the product. Without them, there is nothing to demo.

---

#### T10 — Student Profile Enrichment

**Priority**: Must | **Effort**: 0.5 days

Add fields to the Student model that feed into AI prompts for personalization.

**New fields on `Students` table (EF migration):**
- `NativeLanguage` (string, nullable): The student's first language. Crucial for avoiding false cognates, emphasizing tricky grammar, and providing translations.
- `LearningGoals` (string, nullable, JSON array): e.g. ["conversation", "business", "travel", "exams"]. Helps the AI prioritize relevant vocabulary and scenarios.
- `Weaknesses` (string, nullable, JSON array): e.g. ["past tenses", "pronunciation", "articles"]. Lets the AI weave targeted practice into exercises.

**UI changes:**
- Add three fields to the student create/edit form (native language dropdown, learning goals multi-select, weaknesses multi-select)
- Display new fields on student list cards

**UI implementation decisions (T10):**
- `LearningGoals` and `Weaknesses` use a multi-select from a predefined list of canonical options (not free-text tags). This prevents misspellings and ensures prompt service can rely on consistent values.
- Options are defined as exported TS constants in `frontend/src/lib/studentOptions.ts` (not DB-driven, not inline in the component). Add options there when the list needs to grow. Migrate to a DB-backed or combobox pattern only if teachers need to define their own custom categories.
- Storage stays as JSON array in nvarchar regardless of future UI changes — only the component needs to change.

**Why this comes first**: The prompt service (T12) needs rich student data to generate personalized content. Without native language and goals, prompts are generic, and generic prompts produce generic content.

**Playwright**: Extend `e2e/tests/students.spec.ts` to cover new fields.

**Done when**: Student form captures and persists all new fields; existing students still work with nullable new columns; backend rejects `NativeLanguage` values outside the allowed list.

**Note**: `IsApproved` on `Teachers` moved to T11 — it has no consumer or UI surface in T10 and belongs where the 403 guard is actually implemented.

---

#### T10.1 — Frontend Component Fixes (T10 follow-up)

**Priority**: Must (blocks CI) | **Effort**: 0.5 days | **PR**: separate from T10

Issues surfaced by CodeRabbit during T10 review. Must be resolved before T11 starts, as the frontend build is failing in CI.

**1. Add `cmdk` to `frontend/package.json` (Critical — build failing)**

`frontend/src/components/ui/command.tsx` imports from `cmdk` but the package is not declared as a dependency. It resolves locally via a transitive install but fails in CI (`TS2307: Cannot find module 'cmdk'`).

Fix: add `"cmdk": "<version>"` to `dependencies` in `frontend/package.json` and run `npm install`.

**2. Fix `PopoverTrigger` to use `@base-ui`'s render prop pattern (Major — invalid HTML)**

`@base-ui/react` `Popover.Trigger` renders a native `<button>` by default. The Learning Goals and Weaknesses multi-selects in `StudentForm.tsx` nest another `<button>` inside it, producing invalid HTML and accessibility violations (button-in-button).

Fix: update `PopoverTrigger` in `popover.tsx` to accept and forward a `render` prop. Update the multi-select trigger in `StudentForm.tsx` to use `<PopoverTrigger render={<button ...>...</button>} />` instead of nesting children.

**Done when**: `npm run build` passes in CI with zero errors; no nested button violations in the student form.

---

#### T11 — Claude API Client

**Priority**: Must | **Effort**: 1 day

**`IClaudeClient` interface:**
```csharp
public interface IClaudeClient
{
    Task<ClaudeResponse> CompleteAsync(ClaudeRequest request, CancellationToken ct = default);
    IAsyncEnumerable<string> StreamAsync(ClaudeRequest request, CancellationToken ct = default);
}

public record ClaudeRequest(
    string SystemPrompt,
    string UserPrompt,
    ClaudeModel Model,
    int MaxTokens = 2048
);

public record ClaudeResponse(
    string Content,
    string ModelUsed,
    int InputTokens,
    int OutputTokens
);

public enum ClaudeModel { Haiku, Sonnet }
```

**Model routing:**

| Task | Model | Reason |
|------|-------|--------|
| Vocabulary list | Haiku | Structured, fast |
| Exercises (fill-in-blank, MCQ) | Haiku | Pattern-based |
| Conversation prompts | Haiku | Short, creative |
| Grammar explanation | Sonnet | Nuanced, accurate |
| Full lesson plan | Sonnet | Complex structure |
| Reading passage + questions | Sonnet | Complex, nuanced |
| Homework assignment | Sonnet | Needs lesson context |

**Error handling:**
- 429 (rate limit): return 503 with `Retry-After`
- Log all calls: task type, model, token counts, latency

**API key**: `appsettings.Development.json` for local dev, Azure Key Vault for production.

**IsApproved enforcement**: All generation endpoints (T13) must verify the calling teacher has `IsApproved = true` before invoking `IClaudeClient`. Return 403 if not. The check lives in the controller or a shared authorization policy, not inside `IClaudeClient` itself.

**Done when**: Integration test hits real Claude API with a minimal prompt; unit tests mock the interface.

---

#### T12 — Prompt Construction Service

**Priority**: Must | **Effort**: 1.5 days (extra time vs. original — this is where quality lives)

**`IPromptService` interface:**
```csharp
public interface IPromptService
{
    ClaudeRequest BuildLessonPlanPrompt(GenerationContext ctx);
    ClaudeRequest BuildVocabularyPrompt(GenerationContext ctx);
    ClaudeRequest BuildGrammarPrompt(GenerationContext ctx);
    ClaudeRequest BuildExercisesPrompt(GenerationContext ctx);
    ClaudeRequest BuildConversationPrompt(GenerationContext ctx);
    ClaudeRequest BuildReadingPrompt(GenerationContext ctx);
    ClaudeRequest BuildHomeworkPrompt(GenerationContext ctx, string lessonSummary);
}

public record GenerationContext(
    string Language,
    string CefrLevel,
    string Topic,
    string Style,
    int DurationMinutes,
    string? StudentName,
    string? StudentNativeLanguage,
    string[]? StudentInterests,
    string[]? StudentGoals,
    string[]? StudentWeaknesses,
    string? ExistingNotes
);
```

**System prompt (shared core):**
```
You are an expert {Language} teacher creating materials for a {CefrLevel} level lesson.
Teaching style: {Style}. Topic: {Topic}. Duration: {DurationMinutes} minutes.

{if student}
Student profile:
- Name: {StudentName}
- Native language: {NativeLanguage}
- Interests: {StudentInterests}
- Learning goals: {StudentGoals}
- Areas to improve: {StudentWeaknesses}

Personalize content for this student. Reference their interests in examples.
Avoid false cognates between {NativeLanguage} and {Language} unless explicitly teaching them.
Focus practice on their weak areas when relevant to the topic.
{/if}

{if existingNotes}
The teacher has already written these notes for context: {ExistingNotes}
Build on these notes rather than replacing them entirely.
{/if}

Respond in valid JSON matching the schema provided.
```

**Output schemas** (same as original Phase 2 plan):
- Vocabulary: `{ items: [{ word, definition, exampleSentence, translation }] }`
- Grammar: `{ title, explanation, examples: [{ sentence, note }], commonMistakes: [] }`
- Exercises: `{ fillInBlank: [...], multipleChoice: [...], matching: [...] }`
- Conversation: `{ scenarios: [{ setup, roleA, roleB, keyPhrases: [] }] }`
- Reading: `{ passage, comprehensionQuestions: [{ question, answer, type }], vocabularyHighlights: [{ word, definition }] }`
- Homework: `{ tasks: [{ type, instructions, examples }] }`
- Full lesson plan: `{ title, objectives, sections: { warmUp, presentation, practice, production, wrapUp } }`

**Critical**: Test prompt quality manually with real teaching scenarios BEFORE moving to T13. The demo lives or dies on output quality.

---

### T12 Reference Material: CEFR Levels, Pedagogy, and Prompt Design

This section provides everything needed to build high-quality prompts without external research.

#### CEFR Grammar Structures by Level

The system prompt must constrain generated grammar and vocabulary to the appropriate level. Use these as guardrails in prompts (e.g., "Only use grammar structures appropriate for B1").

**A1 (Beginner, ~500 words):**
- Present simple, present continuous
- Common adjectives, demonstratives (this/that/these/those)
- Modals: can/can't
- There is/are, possessives (my/your/his)
- Basic prepositions (in, on, at, to)
- Verb + -ing (like/hate/love)
- Imperatives
- Question words (what, where, who, how)

**A2 (Elementary, ~1,000 words):**
- Past simple (regular and irregular)
- Comparative and superlative adjectives
- Future: will and going to
- Present perfect (simple introduction)
- Articles with countable/uncountable nouns
- Zero and 1st conditional (if it rains, I'll stay home)
- Gerunds as subjects/objects
- Past continuous (basic)
- Common phrasal verbs
- Adverbs of frequency

**B1 (Intermediate, ~2,000 words):**
- 2nd conditional (if I won the lottery...)
- 3rd conditional (if I had studied...)
- Present perfect continuous
- Past perfect
- Future continuous
- Simple passive voice
- Reported speech
- Broader range of intensifiers (quite, rather, fairly)
- Modals for deduction (must be, might be, can't be)
- Relative clauses (who, which, that)
- Used to / would for past habits

**B2 (Upper-intermediate, ~3,500 words):**
- Mixed conditionals
- Future perfect, future perfect continuous
- Past perfect continuous
- All passive forms
- Relative clauses (defining/non-defining)
- Wish + past simple/past perfect
- Causative (have something done)
- Advanced modal verbs
- Discourse markers and connectors

**C1 (Advanced, ~5,000+ words):**
- Inversion with negative adverbials (Never have I seen...)
- Mixed conditionals across all tenses
- All passive forms including continuous passives
- Advanced narrative tenses
- Cleft sentences (It was John who...)
- Subjunctive mood
- Sophisticated hedging and distancing language

**C2 (Proficiency, ~8,000+ words):**
- Near-native range, full grammar mastery
- Focus shifts to style, register, nuance, and idiomatic accuracy

#### CEFR Appropriate Topics by Level

Use these to validate that generated content uses age/level-appropriate topics.

**A1:** Greetings, family, numbers, colors, daily routine, food and drink, weather, clothes, body parts, classroom language, telling time, simple directions.

**A2:** Shopping, local geography, transport, hobbies, holidays, health (going to the doctor), jobs and workplaces, restaurants, describing people and places, simple past events, plans for the weekend.

**B1:** Travel and tourism, media and entertainment, education, environment (basic), technology in daily life, describing experiences, giving opinions, making plans, cultural differences, workplace situations, health and lifestyle.

**B2:** Current events, social issues, workplace dynamics, abstract concepts, science and technology, arts and culture, ethics and values, globalisation, marketing and advertising, environmental issues, psychology and relationships.

**C1:** Philosophy, politics, economics, scientific research, literary analysis, legal concepts, advanced business, social commentary, satirical or ironic texts, academic writing.

**C2:** All topics with full nuance, including specialized domains, rhetorical style, humor, ambiguity, implicit meaning.

#### Lesson Structure: PPP Methodology

Our lesson templates follow the PPP (Presentation, Practice, Production) framework, which maps to our 5 section types:

| Our Section | PPP Phase | Purpose | Typical Duration | Activities |
|-------------|-----------|---------|-----------------|------------|
| **Warm Up** | Pre-PPP | Activate prior knowledge, set context | 5 min | Questions, images, short discussion, review of previous lesson |
| **Presentation** | P1 | Introduce new language in context | 10-15 min | Text/audio with target language, guided discovery, teacher explanation |
| **Practice** | P2 | Controlled use of new language | 15 min | Fill-in-the-blank, matching, controlled Q&A, drills, gap fills |
| **Production** | P3 | Free use in realistic situations | 10-15 min | Role-play, discussion, debate, writing task, information gap |
| **Wrap Up** | Post-PPP | Consolidate, assign homework | 5 min | Summary, error correction, homework explanation |

**Key pedagogical principles for prompts:**
- **Presentation**: New language should appear in a meaningful context (a dialogue, a short text, a video summary), not as isolated rules. The prompt should generate a situation where the target language appears naturally.
- **Practice**: Exercises should be controlled (student produces target language with support). Generate exercises with clear right/wrong answers. Mix exercise types (gap-fill, matching, MCQ) for variety.
- **Production**: Activities should be open-ended. Student uses the language creatively. Generate role-play scenarios, discussion questions, or writing prompts, not more drills.
- **Vocabulary**: Limit to 10-15 new words per lesson. Include: the word, a clear definition, an example sentence in context, and a translation to the student's native language.
- **Grammar**: Explain rules simply, give 3-5 examples, list 2-3 common mistakes students with this native language typically make.
- **Reading**: Generate a passage at the target CEFR level using level-appropriate vocabulary and grammar. Include 3-5 comprehension questions (mix of factual, inferential, and vocabulary-in-context). Highlight 5-8 key vocabulary items from the passage with definitions.

#### Prompt Design Guidelines

**1. Level-appropriate language in the OUTPUT (not just the topic):**
The generated content itself must use language at the target CEFR level. Include in the system prompt:
```
Write all examples, sentences, and instructions using vocabulary and grammar
appropriate for {CefrLevel}. Do not use structures above this level in examples.
Definitions and explanations (aimed at the teacher) may use higher-level language.
```

**2. Native language awareness:**
When the student's native language is known, the prompt should instruct:
```
The student's native language is {NativeLanguage}.
- Provide translations in {NativeLanguage} for vocabulary items.
- For grammar explanations, note where {Language} differs from {NativeLanguage}.
- Flag false cognates between {NativeLanguage} and {Language} when relevant.
- Be aware of common errors {NativeLanguage} speakers make in {Language}.
```

Common L1 interference patterns to encode:
- Spanish speakers learning English: article overuse, ser/estar confusion mapped to "be", adjective order
- Portuguese speakers learning Spanish: false cognates (exquisito, polvo, largo), preposition differences
- English speakers learning Spanish: subject pronoun overuse, ser/estar, por/para
- German speakers learning English: word order in subordinate clauses, false friends (become/bekommen)

**3. Personalization through interests:**
```
The student is interested in: {Interests}.
Where possible, use examples, scenarios, and vocabulary contexts that relate
to these interests. For instance, if the student likes cooking, use restaurant
and food vocabulary in examples rather than generic contexts.
```

**4. Weakness-targeted practice:**
```
The student struggles with: {Weaknesses}.
In the Practice section, include 1-2 exercises that specifically target these
areas, even if they are not the main topic of the lesson. Integrate them
naturally rather than making them feel like remedial work.
```

**5. Style adaptation:**
- **Formal**: Academic tone, business examples, polite forms, written register
- **Conversational**: Informal language, colloquialisms, spoken register, everyday scenarios
- **Exam-prep**: Test-format exercises (Cambridge, DELE, DELF style), timed activities, mark schemes

**6. JSON output stability:**
Include in every prompt:
```
Respond ONLY with valid JSON matching the schema below. No markdown, no prose,
no code fences. Start your response with { and end with }.
```
This avoids the common problem of Claude wrapping JSON in ```json blocks.

#### Quality Validation Checklist (manual, before declaring T12 done)

Test each prompt type with at least 3 scenarios. For each, verify:

1. **Level appropriateness**: Does an A2 vocabulary list actually use A2-level words? Does a B2 grammar explanation avoid A2 concepts?
2. **Personalization**: When student interests are "cooking and travel," do examples reference restaurants, recipes, airports?
3. **Native language awareness**: When a Portuguese speaker learns Spanish, does the vocabulary flag "exquisito" as a false cognate?
4. **Exercise variety**: Do exercises mix types (gap-fill, MCQ, matching) rather than repeating one format?
5. **Usability**: Could a teacher hand this directly to a student, or does it need heavy editing?
6. **JSON validity**: Does every response parse as valid JSON matching the schema?

**Test matrix (minimum 10 generations):**

| Scenario | Language | Level | Student | Type |
|----------|----------|-------|---------|------|
| 1 | English | A2 | Portuguese speaker, likes football | Vocabulary |
| 2 | Spanish | B1 | English speaker, likes cooking, weak on subjunctive | Grammar |
| 3 | English | C1 | German speaker, exam prep | Exercises |
| 4 | Spanish | A1 | No student linked | Full lesson plan |
| 5 | French | B2 | Italian speaker, business goals | Conversation |
| 6 | English | B1 | Japanese speaker, likes anime, weak on articles | Full lesson plan |
| 7 | Spanish | A2 | English speaker, travel goals | Homework |
| 8 | German | B1 | Spanish speaker, conversational style | Vocabulary |
| 9 | English | A1 | Arabic speaker, likes music | Full lesson plan |
| 10 | English | B2 | Chinese speaker, likes technology | Reading |

---

**Done when**: All prompt methods return well-structured requests; manual testing with the 9-scenario matrix produces usable, level-appropriate, personalized content.

---

#### T13 — Generation Endpoints

**Priority**: Must | **Effort**: 1 day

Seven POST endpoints under `/api/generate`. All require `[Authorize]`.

| Method | Path | Model |
|--------|------|-------|
| POST | `/api/generate/lesson-plan` | Sonnet |
| POST | `/api/generate/vocabulary` | Haiku |
| POST | `/api/generate/grammar` | Sonnet |
| POST | `/api/generate/exercises` | Haiku |
| POST | `/api/generate/conversation` | Haiku |
| POST | `/api/generate/reading` | Sonnet |
| POST | `/api/generate/homework` | Sonnet |

**Common request:**
```json
{
  "lessonId": "guid",
  "language": "Spanish",
  "cefrLevel": "B1",
  "topic": "ordering food",
  "style": "Conversational",
  "studentId": "optional-guid",
  "existingNotes": "optional teacher notes"
}
```

**Per-endpoint flow (simplified for beta, no caching, no limits):**
1. Validate request (language + level + topic required)
2. Resolve student context from DB if `studentId` provided
3. Build prompt via `IPromptService`
4. Call `IClaudeClient.CompleteAsync`
5. Parse JSON output
6. Persist `LessonContentBlock` row
7. Return structured response

**Database addition (EF migration):**
```sql
LessonContentBlocks (
  Id                Guid PK,
  LessonId          Guid FK -> Lessons,
  LessonSectionId   Guid FK -> LessonSections nullable,
  BlockType         varchar(50),
  GeneratedContent  nvarchar(max),
  EditedContent     nvarchar(max),
  GenerationParams  nvarchar(max),
  CreatedAt         datetime2,
  UpdatedAt         datetime2
)
```

**Done when**: All 7 endpoints return valid structured JSON; content block persisted in DB.

---

#### T14 — Streaming SSE

**Priority**: Must | **Effort**: 0.5 days

**Endpoint**: `POST /api/generate/{taskType}/stream`

Same request body as non-streaming. Response: `text/event-stream`.

```csharp
Response.ContentType = "text/event-stream";
Response.Headers.Add("Cache-Control", "no-cache");

await foreach (var token in _claude.StreamAsync(request, ct))
{
    await Response.WriteAsync($"data: {JsonSerializer.Serialize(token)}\n\n");
    await Response.Body.FlushAsync(ct);
}
await Response.WriteAsync("data: [DONE]\n\n");
```

**Frontend**: Custom `useGenerate` hook managing `status` (idle | streaming | done | error), `output` (accumulated text), `abort` (AbortController).

**Done when**: Frontend displays tokens word-by-word; AbortController cancels cleanly.

---

#### T15 — Lesson Editor AI Integration

**Priority**: Must | **Effort**: 2 days

The primary screen where teachers interact with AI.

**Per-section generate button:**
- Each of the 5 lesson section panels gets a "Generate" button (top-right)
- Clicking opens a generation panel (not a modal, stays visible alongside section)

**Generation panel:**
- Task type selector (Vocabulary / Grammar / Exercises / Conversation / Reading)
- Style override (defaults to teacher's preferred style)
- Student auto-populated if lesson links one
- "Generate" button starts streaming

**Streaming display:**
- Tokens appear progressively in a preview area
- "Cancel" link aborts
- On completion: "Insert into section" or "Discard"

**After insertion:**
- Content block rendered in the section with an "AI-generated" badge
- Content is editable (inline, auto-save on blur)
- "Modified" indicator if teacher edits the generated text
- "Regenerate" re-runs with same params + `force: true`
- "Reset to original" restores `GeneratedContent`

**Playwright test**: Generate vocabulary for a lesson section, insert, refresh, confirm persisted.

**Done when**: Teacher can generate content per-section, see it stream, insert, edit, and regenerate. All persists across refresh.

---

### Phase 2A.1 — Typed Content Model (T15.1-T15.4 DONE, T15.5-T15.7 TODO)

The typed content model is now in place. Vocabulary renders as editable tables (teacher) and flashcards (student). Exercises render as structured quizzes with scoring. Conversations render as scenario cards. The architecture is extensible: adding a new content type means adding a schema + renderer to the registry.

T15.5 and T15.6 complete the renderer coverage: grammar and homework are the two remaining content types that the full lesson generator (T16) produces but that currently fall through to FreeTextRenderer, displaying raw JSON. Both are display-focused renderers (no complex interactivity like exercises scoring or flashcard flipping), so they are small tasks.

**Key principle**: Start with 3 core types that prove the architecture, then expand. The type system must be extensible so adding new types (infographics, pronunciation guides, writing prompts) later is just "add a schema + renderer," not a redesign.

---

#### T15.1 — Typed Content Model (Foundation)

**Priority**: Must | **Effort**: 1.5 days

The architectural foundation: content blocks become typed, with defined schemas, and the frontend gains a renderer registry that dispatches to the correct component based on type.

**Backend changes:**

Schema update to `LessonContentBlocks.BlockType`: enforce an enum of known types rather than free-form string. Current types:
- `vocabulary` — word lists with definitions, examples, translations
- `exercises` — fill-in-blank, multiple choice, matching
- `conversation` — dialogue scenarios with roles and key phrases
- `reading` — passages with comprehension questions and vocabulary highlights
- `freeText` — teacher notes, instructions, anything unstructured

Each type has a defined JSON schema for `GeneratedContent`. The prompt service (T12) already generates content matching these schemas. The change is that the frontend now *parses and validates* the JSON instead of treating it as a string.

**Frontend changes:**

1. **TypedContent registry**: A mapping from `BlockType` to `{ EditorComponent, PreviewComponent, StudentComponent }`. New types are added by registering a new entry.

2. **ContentBlock rendering**: Replace the current textarea-based display with a dispatch:
   ```
   const { EditorComponent, PreviewComponent } = contentTypeRegistry[block.blockType]
   ```

3. **Edit/preview toggle**: Teacher can switch between structured editor (type-specific) and raw JSON (escape hatch for power users).

4. **Student view route**: A read-only lesson view (`/lessons/:id/study`) that renders each content block using `StudentComponent` instead of `EditorComponent`.

**API changes:**

- `GET /api/lessons/{id}/study` — returns lesson with content blocks, no edit capabilities (future: auth as student)
- Content block DTO gains a `parsedContent` field (typed JSON object) alongside the existing `generatedContent` string

**Prompt service fix**: Update section description generation to avoid referencing physical classroom activities (video, whiteboard) that the platform cannot deliver. Section descriptions should suggest activities the platform supports (vocabulary drill, conversation practice, reading exercise).

**Done when**: ContentBlock renderer dispatches by type; at least one type (vocabulary) renders as structured UI instead of textarea; student view route shows a read-only version; type registry is extensible.

---

#### T15.2 — Vocabulary Type (Teacher + Student)

**Priority**: Must | **Effort**: 1 day

The first content type fully implemented end-to-end.

**JSON schema** (already generated by prompt service):
```json
{
  "items": [
    {
      "word": "hello",
      "definition": "a greeting word you say when you meet someone",
      "exampleSentence": "Hello! My name is Carlos.",
      "translation": "hola"
    }
  ]
}
```

**Teacher view (EditorComponent):**
- Editable table: columns for word, definition, example sentence, translation
- Add/remove rows
- Drag to reorder (stretch)
- "AI-generated" badge with option to regenerate

**Teacher view (PreviewComponent):**
- Clean, formatted vocabulary list (how it will look to the student)

**Student view (StudentComponent):**
- **Flashcard mode**: Cards showing the word on front, definition + example + translation on back. Click/tap to flip.
- Navigation: previous/next, or swipe
- Progress indicator (3/10 cards reviewed)

**Why this type first**: Vocabulary is the bread and butter of language teaching. Every lesson has it. The data is simple (list of objects), making it ideal for proving the architecture. The flashcard student view is immediately compelling and visually distinct from a textarea.

**Done when**: Teacher sees an editable vocabulary table (not JSON); student sees flippable flashcards; both views source from the same ContentBlock data.

---

#### T15.3 — Exercise/Quiz Type (Teacher + Student)

**Priority**: Must | **Effort**: 1.5 days

**JSON schema** (already generated by prompt service):
```json
{
  "fillInBlank": [
    {
      "sentence": "She ___ (go) to the store yesterday.",
      "answer": "went",
      "hint": "past simple of 'go'"
    }
  ],
  "multipleChoice": [
    {
      "question": "Which word means 'happy'?",
      "options": ["sad", "glad", "angry", "tired"],
      "correctIndex": 1
    }
  ],
  "matching": [
    { "left": "hello", "right": "hola" },
    { "left": "goodbye", "right": "adios" }
  ]
}
```

**Teacher view (EditorComponent):**
- Grouped by exercise type (fill-in-blank, multiple choice, matching)
- Editable fields for each question/answer
- Add/remove questions within each group
- Correct answer clearly marked (highlighted, checkmark)
- Answer key visible

**Teacher view (PreviewComponent):**
- Rendered as the student would see it (without answers filled in)

**Student view (StudentComponent):**
- **Fill-in-blank**: Input fields in the sentence, submit to check
- **Multiple choice**: Radio buttons, submit to check, green/red feedback
- **Matching**: Click-to-pair or drag-and-drop (click-to-pair is simpler, prefer that for beta)
- Score summary at the end ("You got 7/10")

**Note**: This absorbs the old T22 (Interactive Exercise Rendering) which was marked as "Nice" in Phase 2C. It is now "Must" because without it, exercises are just JSON.

**Done when**: Teacher sees a structured exercise editor with answer keys; student can interactively complete exercises and see their score; all three exercise sub-types render correctly.

---

#### T15.4 — Conversation Type (Teacher + Student)

**Priority**: Should | **Effort**: 0.5 days

**JSON schema** (already generated by prompt service):
```json
{
  "scenarios": [
    {
      "setup": "You are at a restaurant. You want to order food.",
      "roleA": "Waiter",
      "roleB": "Customer",
      "keyPhrases": ["I'd like to order...", "Could I have...?", "What do you recommend?"]
    }
  ]
}
```

**Teacher view (EditorComponent):**
- Scenario cards with editable setup, role labels, key phrases
- Add/remove scenarios
- Key phrases as editable tag list

**Student view (StudentComponent):**
- Dialogue format with role labels (colored differently)
- Key phrases highlighted or shown as a reference sidebar
- Setup text as context at the top

**Student interactivity is split into follow-up tasks:**
- T15.4a (beta): Classroom mode, add "Practice with a partner" instructions, role selection, phrase checklist
- T15.4b (future): AI conversation practice partner (text chat)
- T15.4c (future): Voice input/output on top of T15.4b

**Done when**: Teacher sees formatted dialogue cards (not JSON); student sees a clean dialogue view with highlighted key phrases.

---

#### T15.5 — Grammar Type (Teacher + Student)

**Priority**: Must | **Effort**: 0.25 days | **Depends on**: T15.1

The Presentation section of a full lesson (T16) generates grammar content as structured JSON, but it falls through to FreeTextRenderer and shows raw JSON. This breaks the "no raw JSON" quality bar.

**JSON schema** (already generated by prompt service):
```json
{
  "title": "Using the Past Perfect for Travel Narratives",
  "explanation": "The past perfect tense (had + past participle)...",
  "examples": [{ "sentence": "She had already visited Paris.", "note": "Action before another past action" }],
  "commonMistakes": ["Using past simple instead of past perfect when sequencing events"]
}
```

**Teacher view (EditorComponent):**
- Editable title, explanation textarea, examples list (sentence + note), common mistakes list
- Add/remove rows for examples and mistakes

**Teacher view (PreviewComponent):**
- Title as heading, explanation as formatted paragraphs, examples as styled list, common mistakes in a callout box

**Student view (StudentComponent):**
- Same layout as preview: heading, explanation, examples, "Watch out!" callout for common mistakes

**Implementation**: Single renderer file + registry entry + unit test. Frontend only.

See full spec: `plan/langteach-beta/task15.5-grammar-type.md`

**Done when**: Grammar blocks render as styled content (not JSON) in all three views; unit tests pass.

---

#### T15.6 — Homework Type (Teacher + Student)

**Priority**: Must | **Effort**: 0.25 days | **Depends on**: T15.1

The Wrap Up section of a full lesson (T16) generates homework content as structured JSON, but it falls through to FreeTextRenderer and shows raw JSON. This breaks the "no raw JSON" quality bar.

**JSON schema** (already generated by prompt service):
```json
{
  "tasks": [
    { "type": "Vocabulary in Context", "instructions": "Read the sentences and fill in the blanks...", "examples": ["The ___ was helpful.", "We need to ___ our flight."] }
  ]
}
```

**Teacher view (EditorComponent):**
- Task cards with editable type, instructions textarea, examples list
- Add/remove tasks and examples

**Teacher view (PreviewComponent):**
- Numbered task cards with type badge, instructions, examples as sub-list

**Student view (StudentComponent):**
- Same layout as preview (homework is a task list to complete offline)
- Clean, printable layout

**Implementation**: Single renderer file + registry entry + unit test. Frontend only.

See full spec: `plan/langteach-beta/task15.6-homework-type.md`

**Done when**: Homework blocks render as styled task cards (not JSON) in all three views; unit tests pass.

---

#### T15.7 — Reading Type (Teacher + Student)

**Priority**: Must | **Effort**: 0.25 days | **Depends on**: T15.1

The Reading template generates reading content as structured JSON (passage, comprehension questions, vocabulary highlights), but it falls through to FreeTextRenderer and shows raw JSON. This breaks the "no raw JSON" quality bar.

**JSON schema** (already generated by prompt service):
```json
{
  "passage": "Carlos walked into the small restaurant on the corner...",
  "comprehensionQuestions": [
    { "question": "Where did Carlos go?", "answer": "To a small restaurant on the corner", "type": "factual" },
    { "question": "Why did he feel nervous?", "answer": "It was his first time ordering in Spanish", "type": "inferential" }
  ],
  "vocabularyHighlights": [
    { "word": "pedir", "definition": "to order / to ask for" }
  ]
}
```

**Teacher view (EditorComponent):**
- Passage as editable textarea (large, multi-line)
- Comprehension questions as editable list (question + answer + type badge)
- Vocabulary highlights as editable table (word + definition)
- Add/remove rows for questions and vocabulary

**Teacher view (PreviewComponent):**
- Passage as formatted prose with vocabulary highlights underlined or bolded
- Questions numbered below the passage
- Vocabulary sidebar or footer

**Student view (StudentComponent):**
- Passage as readable prose (vocabulary highlights styled as tooltips or underlined)
- Questions shown without answers (student reads and answers verbally or mentally)
- "Show Answer" toggle per question (optional, can be stretch)

**Implementation**: Single renderer file + registry entry + unit test. Frontend only.

**Done when**: Reading blocks render as styled passage + questions (not JSON) in all three views; student view hides answers; unit tests pass.

---

### Phase 2A.2 — Conversation UX

Conversation scenarios need two layers of student interaction. T15.4a ships with the beta (classroom use). T15.4b is a future feature (self-study with AI).

---

#### T15.4a — Conversation Classroom Mode Improvements

**Priority**: Should | **Effort**: 0.5 days | **Depends on**: T15.4

The student view currently shows conversation scenarios but gives no clear signal about what the student should *do*. This task makes it an effective classroom activity reference.

**Changes (frontend only):**
1. **Activity instruction header** at the top: "Practice with a partner: Choose a role, read the context, and have a conversation using the key phrases below."
2. **Role selection with feedback**: tapping a role marks it as "You" (highlighted) and the other as "Partner" (dimmed). Purely visual, local state only.
3. **Key phrase checklist**: tapping a phrase chip toggles a checkmark. Lets students track which phrases they used during the in-class activity. Local state, no persistence.
4. **Print-friendly layout** (stretch): `@media print` styles for projection or handouts.

**Done when**: Student view has clear instructions, interactive role selection, and tappable phrase tracking. All existing and new e2e tests pass.

See full spec: `plan/langteach-beta/task15.4a-conversation-classroom-mode.md`

---

#### T15.4b — AI Conversation Practice Partner

**Priority**: Future (post-beta or premium) | **Effort**: 3-5 days | **Depends on**: T15.4a

Transforms conversation scenarios from passive reference cards into interactive practice. The student picks a role, the AI plays the opposite role, and they have a text-based conversation within the scenario context. Key phrases appear as tappable hints and get checked off as the student uses them. A brief summary at the end shows which phrases were practiced.

**Key components:**
- New backend endpoint for streaming conversation practice responses
- New `BuildConversationPracticePrompt()` in the prompt service
- Chat UI component (message list, input, phrase hint strip)
- Client-side phrase detection (fuzzy match)
- Session summary (informational, no grading)

**Design decisions deferred:** Chat UI placement (inline vs panel), message persistence, teacher visibility of practice sessions, token budget per session.

See full spec: `plan/langteach-beta/task15.4b-conversation-ai-practice.md`

---

#### T15.4c — Voice Practice

**Priority**: Future (post-beta, premium) | **Effort**: 2-3 days | **Depends on**: T15.4b

Adds speech-to-text (student speaks) and text-to-speech (AI responds aloud) to the AI conversation practice. Turns text chat into spoken practice, targeting the hardest skill for solo learners: speaking.

**v1 approach:** Use browser-native APIs (Web Speech API for STT, SpeechSynthesis for TTS). Zero backend cost, covers Chrome/Edge/Safari. Firefox falls back to text-only. Upgrade to Azure Speech Services later if quality or pronunciation scoring becomes a priority.

**Key features:**
- AI responses read aloud in the target language
- Student speaks via microphone, transcription shown before sending
- Mix voice and text freely within a session
- Replay AI messages, re-record student messages
- Slow playback (0.75x) for lower-level students
- Graceful degradation: mic denied or unsupported browser falls back to text

See full spec: `plan/langteach-beta/task15.4c-conversation-voice-practice.md`

---

#### T16 — One-Click Full Lesson Generation

**Priority**: Must | **Effort**: 0.5 days

**UX**: "Generate Full Lesson" button in the lesson editor toolbar. Generates all 5 sections sequentially using the lesson-plan endpoint.

**Flow:**
1. Confirmation dialog: "This will generate content for all sections. Existing notes will be preserved as context."
2. Progress indicator showing which section is being generated (1/5, 2/5...)
3. Each section streams independently
4. On completion, all sections populated with generated content

**Why it matters**: This is the "I just saved 30 minutes" moment. A teacher selects a student, picks a topic, and gets a complete lesson in under a minute.

**Done when**: One click populates all 5 sections; teacher can edit any section after.

---

### Phase 2B — Make It Real

These features turn the demo from "cool tech" into "tool I'd use Monday morning."

---

#### T17 — PDF Export (Teacher + Student Modes)

**Priority**: Should | **Effort**: 1.5 days

**Endpoints:**
- `GET /api/lessons/{id}/export/pdf?mode=teacher` (default)
- `GET /api/lessons/{id}/export/pdf?mode=student`

**Teacher PDF** (full version for the teacher's own use):
- Header: lesson title, language, CEFR level, topic, date (`ScheduledAt`, falls back to `CreatedAt`), student name
- Each section with content, timing notes, and teacher instructions
- Vocabulary table: word, definition, example sentence, translation
- Exercises with answer keys inline
- Grammar explanations with common mistakes section
- Footer: "Created with LangTeach"

**Student PDF** (clean handout to give to the student):
- Header: lesson title, topic, date (`ScheduledAt` or `CreatedAt` fallback; no CEFR level, no teacher metadata)
- Vocabulary table: word, definition, example sentence (no translations, student discovers meaning)
- Exercises with blanks and space to write (no answer keys)
- Reading passages with comprehension questions (no answers)
- Grammar reference without the "common mistakes" teacher notes
- No section timing, no teacher instructions
- Footer: "Created with LangTeach"

Use a .NET PDF library (QuestPDF or similar). Both modes share the same layout engine, differing only in which fields are included.

**Frontend**: "Export PDF" dropdown in lesson editor toolbar with two options: "Teacher Copy" and "Student Handout."

**Why it matters**: Teachers think in physical materials. A student handout without answers is a basic expectation. Handing a student a sheet that shows the exercise answers defeats the purpose. Two modes, one click each.

**Done when**: Both PDF modes download with correct content filtering; student PDF has no answer keys; teacher PDF has everything.

---

#### T18 — Student Lesson Notes

**Priority**: Should | **Effort**: 0.5 days

After-lesson notes attached to the student-lesson relationship.

**New table (EF migration):**
```sql
LessonNotes (
  Id            Guid PK,
  LessonId      Guid FK -> Lessons,
  StudentId     Guid FK -> Students,
  TeacherId     Guid FK -> Teachers,
  WhatWasCovered  nvarchar(max),
  HomeworkAssigned nvarchar(max),
  AreasToImprove  nvarchar(max),
  NextLessonIdeas nvarchar(max),
  CreatedAt     datetime2,
  UpdatedAt     datetime2
)
```

**API**: `POST/PUT /api/lessons/{id}/notes`, `GET /api/students/{id}/lesson-history`

**UI**:
- "Lesson Notes" tab or section at the bottom of the lesson editor
- On student profile page: "Lesson History" showing past notes chronologically

**Why it matters**: Shows the platform "remembers" across sessions. Builds the narrative that this isn't just a one-shot generator but a teaching companion.

**Note**: Lesson history on student profile should sort by `ScheduledAt` (not `CreatedAt`) when available, giving a true chronological teaching timeline. The "Add Notes" prompt can show "Notes for [scheduled date] lesson" for temporal context.

**Done when**: Teacher can add notes after a lesson; notes appear in student's lesson history sorted by lesson date.

---

#### T19 — Dashboard v2 (Teacher's Command Center) ✅ DONE (PR #60)

**Priority**: Should | **Effort**: 1 day

**Prerequisite (included in T19):** Add `ScheduledAt` (nullable `DateTime?`) to the Lesson model. This is a data model gap: without a "when does this class happen?" field, no time-based view is possible. Nullable because lessons can exist without a date (templates, exploratory drafts). Small migration, but it also improves T17 (PDF date header), T18 (temporal context for notes), T23 (demo narrative), and T25 (schedule-aware suggestions).

**What was delivered:**
- EF migration: added `ScheduledAt` to Lessons table
- Create/Update DTOs: accept `ScheduledAt`
- Lessons API: `scheduledFrom`/`scheduledTo` query params for date-range filtering, `StudentName` in LessonDto
- Lesson editor: date picker in metadata edit form, scheduled date badge in collapsed header
- Lesson creation: date picker on step 2
- PDF export: uses `ScheduledAt` as lesson date (falls back to `CreatedAt` if null), renamed `CreatedAt` to `LessonDate` in PdfLessonData
- Dashboard: WeekStrip (7-day grid with lesson pills), NeedsPreparation, QuickActions, UnscheduledDrafts
- Tests: 2 backend integration tests, 4 frontend test files, 3 E2E tests with cleanup

**Dashboard layout:**
- **Week strip** (full width, top): 7-day horizontal bar (Mon-Sun) with lessons as colored pills. Green = Published (ready), amber = Draft (needs prep). Multiple lessons per day stack vertically. Click to open editor. Today highlighted.
- **Needs Preparation** (left): Draft lessons scheduled in the next 7 days, sorted by date. The teacher's actionable to-do list.
- **Quick Create + Stats** (right): "New Lesson" button, student/lesson counts, total lesson count.
- **Unscheduled Drafts** (bottom, collapsible): Draft lessons with no `ScheduledAt`, auto-expands when items exist.

**Explicitly excluded (moved to T19.1)**: Scheduling directly from the dashboard ("+' button on day columns), calendar-style date picker. See T19.1 below.

**Explicitly excluded (post-demo)**: Recurring lessons, drag-drop rescheduling, calendar sync, month view, student recurring schedule, classes as separate entity. See "Future Enhancements" section. All enabled by `ScheduledAt` without schema changes.

See full spec: `plan/langteach-beta/task19-dashboard-v2.md`

---

#### T19.1 — Schedule from Dashboard

**Priority**: Should | **Effort**: 0.5 days

**Problem**: T19 lets teachers schedule lessons, but the workflow is backwards. Teachers think "I have a class with Marco on Thursday at 10am, what should I teach?", not "I have a lesson, when should I schedule it?" The current flow requires creating a lesson first, then setting a date in the editor.

**What:**
- **"+" button on each day column** in the WeekStrip. Small, unobtrusive, appears on hover or always visible if the day has no lessons.
- Clicking "+" opens a popover/modal:
  - Student dropdown (from teacher's students)
  - Time picker
  - Two actions: "Create New Lesson" (goes to LessonNew with student + scheduledAt pre-filled) or "Assign Existing Draft" (shows unscheduled drafts, clicking one sets its scheduledAt and student)
- Assigning an existing draft removes it from the UnscheduledDrafts section and adds it to the WeekStrip.

**Files modified:**
- `frontend/src/components/dashboard/WeekStrip.tsx`: add "+" button per day column, popover trigger
- `frontend/src/components/dashboard/SchedulePopover.tsx` (new): student selector, time picker, assign/create actions
- `frontend/src/pages/LessonNew.tsx`: accept `scheduledAt` and `studentId` from URL query params to pre-fill
- `frontend/src/pages/Dashboard.tsx`: pass students and unscheduled drafts to WeekStrip

**Why it matters**: This matches the real teacher workflow. The dashboard becomes the entry point for "what am I teaching this week?" rather than just a read-only view. For the demo, it shows the platform understands how teachers think about scheduling.

**Done when**: Teacher can click "+" on a day, pick a student and time, and either create a new pre-filled lesson or assign an existing draft. The WeekStrip updates immediately.

---

#### T20 — Brand & Visual Polish

Moved here from Phase 2C since it now includes UX improvements alongside visual polish.

**Priority**: Nice | **Effort**: 0.5 days

- **Calendar-style date picker**: Replace native `<input type="datetime-local">` with a proper calendar component (shadcn DatePicker / react-day-picker) in both LessonNew and LessonEditor. The native input looks inconsistent across browsers and is not polished enough for the demo.
- App icon and favicon (simple, clean, language-teaching themed)
- Consistent color usage across all pages
- Loading states and skeleton screens for AI generation
- Empty state illustrations
- Fix `InputGroupAddon` click handler to use a broader selector (`input, textarea` or `[data-slot="input-group-control"]`) instead of only `input`, so clicking an addon also focuses textarea-based controls. No current impact since no textarea input groups exist yet, but should be fixed before any are added.

**Files modified:**
- `frontend/src/pages/LessonNew.tsx`: replace `<input type="datetime-local">` with DatePicker component
- `frontend/src/pages/LessonEditor.tsx`: replace `<input type="datetime-local">` with DatePicker component
- `frontend/src/components/dashboard/SchedulePopover.tsx` (from T19.1): use same DatePicker for time selection
- Various component files for loading states and empty states

Replaces the deferred T9.1 from Phase 1.

~~T22 (Interactive Exercise Rendering) has been absorbed into T15.3.~~

---

#### T21 — Regenerate with Direction

**Priority**: Should | **Effort**: 0.5 days

When regenerating a section, offer quick modifiers:
- "Make it easier" (lower complexity within same CEFR)
- "Make it harder" (push toward upper boundary)
- "Make it shorter" / "Make it longer"
- "More formal" / "More conversational"

These modify the prompt parameters and regenerate. Shows the AI is a collaborator, not a one-shot tool.

**Why promoted to Should**: The demo script (step 5) explicitly shows regeneration with "make it easier." Without this, the demo loses a key moment that demonstrates the AI as a collaborator.

---

#### T24 — Adapt Lesson for Another Student

**Priority**: Should | **Effort**: 0.5 days

Teachers reuse lesson topics constantly. A B1 restaurant lesson for Maria should be adaptable for Pedro (A2, different interests, different native language) without starting from scratch.

**UX**: On any existing lesson, an "Adapt for Another Student" button opens a dialog:
- Student selector (pre-populated list from the teacher's students)
- CEFR level auto-fills from selected student but is overridable
- "Adapt" button creates a new lesson (cloned structure) and regenerates all content blocks for the new student/level

**Backend flow:**
1. Clone the lesson (reuse Phase 1's duplicate logic). Do NOT copy `ScheduledAt` (the adapted lesson is for a different class at a different time).
2. Link to the new student
3. For each existing `LessonContentBlock`, call the same generation endpoint with the new student's context and level
4. Original lesson remains untouched

**Why it matters**: This is where the platform clearly beats ChatGPT. A teacher would have to re-type the entire prompt with different student details. Here, one click adapts a proven lesson structure for a different student. It also shows that student profiles aren't just metadata; they actively drive content personalization.

**Playwright test**: Adapt a lesson for a different student; verify the new lesson has different generated content appropriate for the new student's level.

**Done when**: Teacher can adapt an existing lesson for a different student in one click; new lesson has fully regenerated, personalized content.

---

#### T25 — AI-Powered "Suggest Next Topic"

**Priority**: Should | **Effort**: 0.5 days

After a few lessons with a student, the platform has enough context (level, goals, weaknesses, past lesson topics) to suggest what to teach next.

**Endpoint**: `POST /api/students/{id}/suggest-next-topic`

Uses Claude (Haiku, fast) with a prompt that includes:
- Student's CEFR level, goals, weaknesses, interests
- List of topics already covered (from past lesson titles/topics)
- The student's learning goals
- Next scheduled lesson date with this student (from `ScheduledAt`), if available, to suggest time-appropriate topics

**Response:**
```json
{
  "suggestions": [
    {
      "topic": "Making travel plans and booking hotels",
      "rationale": "Maria hasn't covered future tenses yet, which are essential for B1. Travel planning is a natural context for 'will' and 'going to', and connects to her interest in cooking through restaurant reservations.",
      "cefrFocus": "Future tenses (will vs going to)",
      "estimatedLevel": "B1"
    }
  ]
}
```

Returns 3 suggestions, each with a rationale explaining why that topic is appropriate next.

**UI**: On the student profile page, a "Suggest Next Topic" button below the lesson history. Suggestions appear as cards. Each card has a "Create Lesson" button that pre-fills a new lesson with that topic and student already linked.

**Why it matters**: This transforms the platform from "generate what I ask for" to "help me decide what to teach." It shows the platform is thinking ahead, using accumulated context. A teacher seeing "Maria hasn't covered future tenses yet" will feel the platform genuinely understands her teaching journey.

**Done when**: Button on student profile returns 3 contextual suggestions; clicking "Create Lesson" on a suggestion pre-fills lesson creation with the topic and student.

---

### Phase 2C — Polish & Delight

If time allows. Each adds incremental value but isn't required for the demo.

T20 (Brand & Visual Polish) has been moved up to Phase 2B since it now includes the calendar date picker UX improvement needed for T19.1.

---

### T23 — Beta Demo Preparation

**Priority**: Must | **Effort**: 1 day (after all other tasks)

This is not a code task. It's preparation for showing the beta to the teacher.

**Pre-demo deployment verification:**
- Deploy latest code to Azure staging (`https://white-cliff-02f270f03.4.azurestaticapps.net`)
- Verify all pages load correctly on the deployed instance (not just localhost)
- Confirm AI generation works end-to-end on staging (Claude API key configured in Key Vault)
- Run through the full demo script on staging at least once before the live demo
- Check mobile responsiveness on the staging URL (the brother may pull it up on his phone)

**Demo fallback plan:**
- Pre-generate all seed lesson content so the demo can proceed without live API calls
- If Claude API is slow or unavailable during the live demo: show the pre-populated lesson first ("let me show you what a completed lesson looks like"), then attempt a single-section live generation later (smaller call, faster, less risk)
- Have at least one fully populated backup lesson per template type

**Demo script (7-10 minute walkthrough):**

1. **Open** (20s): Log in. Dashboard shows the week at a glance: Maria on Tuesday (green, ready), Pedro on Wednesday (amber, needs prep), a new student on Friday. One unscheduled draft below. "This is your teaching week. You can see what's coming and what still needs work." *(T19 delivers the dashboard layout; T19.1 adds the "+" scheduling from dashboard if completed before demo.)*

2. **Student context** (30s): Open a student profile (e.g., "Maria, B1 Spanish, interested in cooking and travel, struggles with past tenses, native Portuguese speaker"). "The platform knows your students."

3. **Create lesson** (30s): New lesson from Grammar template, link to Maria, topic: "ordering at a restaurant." "30 seconds to set up."

4. **The magic** (60s): Click "Generate Full Lesson." Watch all 5 sections stream in with personalized content. Point out: vocabulary renders as a clean table, grammar as a structured explanation with examples and common mistakes, exercises as a formatted quiz, conversation as a dialogue, homework as task cards. "This would have taken you 20 minutes."

5. **Content types in action** (45s): Show the vocabulary section as an editable table (add a word, edit a definition). Show the exercises section with answer keys visible. "Each content type has its own editor. You're working with vocabulary as vocabulary, not as a wall of text."

6. **Edit and refine** (30s): Edit a vocabulary word, regenerate the exercises section with "make it easier." "You're in control. The AI proposes, you decide."

7. **The student experience** (60s): Switch to the student view of the same lesson. "This is what your student will see when the student portal launches. Right now you can preview it; soon students will log in and access their lessons directly." Show vocabulary as flippable flashcards (click to reveal definition). Show exercises as an interactive quiz (fill in blanks, select multiple choice, see score). Show conversation scenarios as classroom activity cards: tap a role to mark it as "You," tap key phrases to check them off during practice. "Same data, completely different experience. You create once, the student learns interactively. The conversation cards are designed for pair work in class."

8. **Two exports** (20s): Click "Export PDF > Student Handout," show the clean printable without answers. Then "Teacher Copy" with answer keys and timing. "One for you, one for the student."

9. **Adapt for Pedro** (30s): Click "Adapt for Another Student," select Pedro (A2, English speaker, likes football). Watch the lesson regenerate at A2 with football examples. "Same topic, different student, zero extra work."

10. **Student history** (20s): Show lesson notes from a previous lesson on Maria's profile. "It remembers what you covered."

11. **What's next?** (15s): Click "Suggest Next Topic" on Maria's profile. Show 3 AI suggestions with rationale (e.g., "Maria hasn't covered future tenses yet"). Click one to pre-fill a new lesson. "It thinks ahead so you don't have to."

12. **The vision** (30s): "What you just saw is five content types, each with its own renderer. The architecture supports any number: pronunciation guides, writing prompts, infographics, cultural notes. Each one is just a new type in the system. And every type works the same way: teacher creates, AI assists, student interacts. For conversations, the next step is an AI practice partner: the student picks a role and chats with the AI instead of needing a classmate. That's already planned."

**Seed data to prepare:**
- 3-5 realistic student profiles with varied levels (A1 to C1), languages, interests, and weaknesses
- 2-3 completed lessons with generated content and lesson notes (at least one per student, so "Suggest Next Topic" has context)
- Lessons with `ScheduledAt` values spread across the demo week: at least 2 Published (green on dashboard), 1 Draft with date (orange, "needs prep"), 1 Draft without date (appears in unscheduled section)
- Teacher profile with languages and preferred style set
- At least one lesson with content blocks suitable for demonstrating the "Adapt for Another Student" flow

**Talking points for the conversation after the demo:**
- What features would be most useful in your daily teaching?
- What's missing that would make you switch from your current workflow?
- How do you currently prepare lessons? (understand the workflow we're replacing)
- Would your teacher friends pay for this? At what price point?
- What would you want to customize (lesson structure, exercise types, output language)?
- Any content types we're missing? (pronunciation guides, cultural notes, writing prompts?)
- For conversations: would students benefit more from AI practice (chat with AI partner) or is classroom pair work enough? Would you pay extra for AI conversation practice?
- How important is student-facing features? (sharing materials, homework portal, progress tracking)
- Mobile usage: do you prep lessons on your phone?
- Walk me through how you structure a typical 60-minute lesson. (validate whether the 5-section PPP model matches his real workflow, or if he uses a different structure)
- When you reuse a lesson for a different student, what do you change and what stays the same?

---

### Post-Demo Enhancements

Features that add value but should be built after the demo, informed by feedback from the demo session.

---

#### T26 — Section URL Attachments

**Priority**: Should | **Effort**: 1 day

Allow teachers to attach URLs (YouTube videos, articles, Google Docs, online exercises) to any lesson section. This turns LangTeach from "AI content generator" into "complete teaching workspace" where all class materials live in one place.

**What:**
- Each section can have zero or more URL attachments
- Each attachment has: URL, label (teacher-provided title), optional note (e.g., "Play at 2:15 mark", "Students read for homework")
- URLs display as a compact list below the section content in teacher view
- Student view shows attachments as clickable links with labels
- PDF export renders URLs as clickable hyperlinks (teacher copy) or QR codes (student handout)

**Why after demo, not during:**
- The demo story is "watch AI generate personalized content." URL attachments are passive data entry, not a wow moment.
- Building it after the demo lets the brother (as incoming PM) weigh in on UX before implementation.
- Zero architectural risk: attachments are a new section-level metadata field or a lightweight content block type, both fit the existing model.

**What this is NOT:**
- Not file uploads (deferred to Phase 2, requires Azure Blob storage infrastructure)
- Not a media player or embed system (just links)
- Not an LMS (no tracking of whether students visited the URL)

**Done when**: Teacher can add/edit/remove URL attachments on any section; attachments persist and display in teacher view, student view, and PDF export.

---

### Future Enhancements (Post-Demo, Informed by Feedback)

These features build on the scheduling foundation from T19/T19.1 and would be prioritized based on feedback from the demo session. They represent the evolution from "lesson planner with scheduling" to "full teaching management platform."

---

#### Student Recurring Schedule

**Concept**: Each student profile stores their recurring class times (e.g., "Marco: Thursdays 10am, Saturdays 2pm"). The system uses these to:
- Auto-suggest scheduling when creating a lesson for that student
- Show upcoming empty slots on the dashboard ("Marco's Thursday slot has no lesson yet")
- Pre-fill the schedule popover with the student's usual time when selected

**What this adds over T19.1**: T19.1 is manual ("pick a student, pick a time"). This makes scheduling semi-automatic ("Marco's next slot is Thursday 10am, assign a lesson?"). Reduces friction for teachers with regular students.

**Files involved:**
- `backend/LangTeach.Api/Data/Models/Student.cs`: add `RecurringSchedule` (JSON column or related table)
- `backend/LangTeach.Api/DTOs/StudentDto.cs`: expose schedule
- `frontend/src/pages/StudentEditor.tsx`: UI for managing recurring times
- `frontend/src/components/dashboard/WeekStrip.tsx`: show empty slots for expected classes

---

#### Classes as a Separate Entity

**Concept**: Decouple "when/who" from "what to teach." A **Class** is a time slot + student. A **Lesson** is the content. The teacher schedules classes, then attaches lessons to them.

**Why this matters long-term:**
- A class can exist before the lesson content is decided ("I know Marco comes Thursday, I'll figure out what to teach later")
- Multiple classes can share the same lesson content (teach the same material to different groups)
- Cancellations, rescheduling, and attendance tracking become natural (they operate on classes, not lessons)
- Opens the door to group classes (a class has multiple students)

**What changes from current model:**
- New `Class` entity: `Id`, `StudentId`, `TeacherId`, `ScheduledAt`, `LessonId` (nullable), `Status` (Scheduled/Completed/Cancelled)
- `ScheduledAt` moves from Lesson to Class (or exists on both, with Class being authoritative)
- Dashboard WeekStrip shows classes, not lessons directly
- "Assign lesson to class" becomes a first-class action

**Trade-off**: This is a significant model change. It's the right architecture for a production SaaS, but adds complexity. Best implemented after validating the simpler T19.1 approach with real teacher feedback.

---

#### Additional Scheduling Features (No Schema Changes Needed)

These are enabled by the existing `ScheduledAt` field and the Class entity (if implemented):
- **Drag-drop rescheduling** in the WeekStrip
- **Month/day calendar views** (beyond the current week strip)
- **Calendar sync** (Google Calendar, iCal export)
- **Recurring lessons** (auto-create next week's class from a template)
- **Conflict detection** (warn if two lessons overlap for the same teacher)
- **Student notifications** (email/push when a lesson is scheduled or changed)

---

## Explicitly Deferred (not in beta scope)

| Item | Original location | Reason for deferral |
|------|-------------------|---------------------|
| Generation caching | Phase 2 T3 | Optimization. Irrelevant with few users. Easy to add later. |
| Usage tracking / free-tier limits | Phase 2 T8 | Monetization infrastructure. No payments in beta. |
| GenerationCache table | Phase 2 schema | Not needed without caching |
| GenerationUsage table | Phase 2 schema | Not needed without limits |
| Stripe / payments | Phase 4 | No payments until beta validates demand |
| Content library | Phase 3 | "Save to library" isn't the demo moment. Lessons already persist. |
| Shareable lesson links | Phase 3 | PDF export covers the sharing need for now |
| CRM capabilities | Issue #17 | Enterprise feature, not relevant for solo teacher beta |
| File uploads (images, PDFs, audio) | Issue #26 | Phase 2. Requires Azure Blob storage. URL attachments (T26) cover the link-based use case first. |
| Section content versioning (undo last generation) | Phase 2 | Save previous content before regeneration, allow one-click undo. Low effort (store previous `generatedContent` string), high safety net for teachers. |
| Optimistic concurrency | Issue #25 | Technical debt, single-user beta won't have conflicts |
| Frontend error logging | Issue #24 | Ops infrastructure, not user-facing |
| AI conversation practice (T15.4b) | Phase 2A.2 | Post-beta or premium. Classroom mode (T15.4a) covers the beta demo. |
| Voice practice (T15.4c) | Phase 2A.2 | Post-beta, premium. Depends on T15.4b being stable first. |

---

## Dependency Order

```
T10 (student enrichment) ── T10.1 (frontend fixes) ────────────┐
T11 (Claude client) ──┐                                        │
                      ├── T12 (prompt service) ────────────────┤
                      ├── T14 (streaming SSE)                  │
                      └── T13 (generation endpoints)───────────┤
                                                               │
T14 + T13 ──── T15 (lesson editor AI UI) ──────────────────────┤  ALL DONE
                      │                                        │
T15 ──── T15.1 (typed content model, foundation) ──────────────┤
                      │                                        │
                      ├── T15.2 (vocabulary type)              │  ALL DONE
                      ├── T15.3 (exercises type)               │
                      ├── T15.4 (conversation type) ───────────┤
                      │         │                              │
                      │         └── T15.4a (classroom UX)      │  DONE
                      │               │                        │
                      │               └── T15.4b (AI chat)     │  FUTURE
                      │                     │                  │
                      │                     └── T15.4c (voice) │  FUTURE
                      │                                        │
                      ├── T15.5 (grammar type)                 │  DONE
                      ├── T15.6 (homework type)                │  DONE
                      └── T15.7 (reading type)                 │  TODO
                                                               │
T15.1 ──── T16 (full lesson gen, benefits from typed model)    │
T15.5 + T15.6 + T15.7 ── completes T16 visual quality (no raw JSON) │
T15.1 ──── T17 (PDF export, needs typed rendering)             │
T15 ───── T21 (regen w/ direction)                             │
T16 ───── T24 (adapt lesson)                                   │
                                                               │
T10 ──── T18 (student lesson notes)                            │
               └── T25 (suggest next topic, needs T18 + T11)   │
                                                               │
T19 (dashboard v2 + ScheduledAt migration) ─── T17 fixup (PDF date) │
      └── T18 benefits (sort by ScheduledAt)                        │
      └── T25 benefits (schedule-aware suggestions)                 │
T20 (brand polish) ── independent                                   │
                                                               │
T23 (demo prep) ── LAST before demo ──────────────────────────┘
                                                               │
T23 ──── T26 (section URL attachments, post-demo) ────────────┘
```

**Suggested execution order:**
1. ~~T10 then T10.1, T11 in parallel~~ DONE
2. ~~T12~~ DONE
3. ~~T13 + T14 (parallel)~~ DONE
4. ~~T15~~ DONE
5. ~~T15.1 (typed content model foundation)~~ DONE
6. ~~T15.2 + T15.3 (parallel: vocabulary + exercises types)~~ DONE
7. ~~T15.4 (conversation type)~~ DONE
8. ~~T15.4a (conversation classroom UX)~~ DONE
9. ~~T16 (full lesson gen)~~ DONE
10. ~~T15.5 + T15.6 (parallel: grammar + homework renderers)~~ DONE
11. ~~T17 (PDF export)~~ DONE
12. T19 (dashboard v2, includes ScheduledAt migration + PDF date fixup)
13. T15.7 (reading renderer, small task)
14. T18 + T21 (parallel, after T19 lands the migration)
15. T24 + T25 (parallel, after T16 and T18)
16. T20 (as time allows)
17. T23 (always last, seed data includes ScheduledAt values for demo week)
18. T26 (section URL attachments, post-demo, informed by brother's feedback)
19. **Post-beta:** T15.4b (AI conversation practice), then T15.4c (voice)

---

## Definition of Done — Beta

### Automated (must pass before demo)
- `dotnet build` — zero warnings, zero errors
- `dotnet test` — all tests pass
- `npm run build` — zero errors
- `npx playwright test` — all e2e tests pass

### Demo QA Script (manual, follows the demo script above)
1. Log in, dashboard shows weekly schedule with lessons color-coded by prep status
2. Open student profile, confirm all enriched fields displayed
3. Create new lesson from template, link to student
4. Generate vocabulary for one section, confirm streaming display
5. Confirm vocabulary renders as a structured table (not raw JSON)
6. Insert generated content, confirm it persists on refresh
7. Edit vocabulary in the table editor (add/remove/modify rows), confirm changes persist
8. Generate exercises, confirm they render as formatted quiz with answer keys
9. Edit generated content, confirm "modified" indicator
10. Regenerate section with "make it easier" modifier, confirm new content at lower complexity
11. Click "Generate Full Lesson," confirm all 5 sections populated with type-appropriate rendering (no raw JSON)
12. Confirm grammar section renders as title + explanation + examples + common mistakes callout (not JSON)
13. Confirm homework section renders as numbered task cards with type badges (not JSON)
14. Confirm reading section renders as prose passage + numbered questions + vocabulary highlights (not JSON)
15. Open student view (`/lessons/:id/study`), confirm vocabulary shows as flashcards
16. In student view, confirm exercises are interactive (fill in answers, submit, see score)
17. In student view, confirm conversation scenarios show "Practice with a partner" instruction, role selection works (tap to mark "You"/"Partner"), and key phrase chips are tappable as a checklist
18. In student view, confirm reading passage displays with questions visible but answers hidden
19. Export Teacher PDF, confirm answer keys and timing present
20. Export Student PDF, confirm no answer keys, no teacher notes
21. Click "Adapt for Another Student," select different student/level, confirm new lesson with regenerated content
22. Add lesson notes, confirm they appear in student's lesson history
23. Click "Suggest Next Topic" on student profile, confirm 3 suggestions with rationale appear
24. Click "Create Lesson" on a suggestion, confirm lesson pre-filled with topic and student
25. Return to dashboard, confirm week strip shows scheduled lessons with correct status colors; confirm "Needs Preparation" list shows upcoming drafts

### Quality bar
- AI-generated content must be actually usable by a teacher (not generic filler)
- No raw JSON visible anywhere in the teacher or student UI
- Each content type renders with its own appropriate component (tables, flashcards, quizzes, dialogues)
- Student view is a genuinely different experience from teacher view (not just read-only textarea)
- PDF must be clean enough to hand to a student without embarrassment
- No visible errors, loading spinners that never resolve, or broken layouts

---

*Created: March 2026 | Beta Plan — reorganized from Phase 2/3/4 around demo impact*
*Supersedes: Phase 2 "AI Core" plan for task sequencing (Phase 2 plan remains valid as technical reference)*
