# LangTeach — Product Vision & Roadmap

> **One sentence**: An AI-powered platform where language teachers create personalized, structured lessons in minutes, and students interact with them as learning experiences.

---

## The Core Idea

A language teacher today spends 15-30 minutes prepping each lesson: writing vocabulary lists, creating exercises, building dialogues, formatting handouts. They do this for 5-8 students daily, each at different levels with different needs. LangTeach replaces that manual work with AI that understands the student, the pedagogy, and the content type.

The platform is not a document editor. It is a **typed content system**: vocabulary is stored as vocabulary (not text), exercises are stored as exercises (not text), dialogues are stored as dialogues (not text). This means the same content can be rendered differently depending on context: as an editable table for the teacher, as flashcards for the student, as a clean PDF handout for printing.

---

## Phase Map

```
Phase 1 (DONE)        Foundation: auth, CRUD, lesson structure, CI/CD
    |
Beta (IN PROGRESS)    AI generation + typed content model + demo
    |
Phase 2               Production: caching, limits, monitoring, multi-tenant
    |
Phase 3               Growth: student portal, content library, sharing
    |
Future                 Marketplace, mobile, analytics, integrations
```

---

## Phase 1 — Foundation (COMPLETE)

**Goal**: A working shell with good bones.

**Delivered**: Auth (Google OAuth via Auth0), teacher profiles, student management (CRUD with level, interests, notes), lesson creation from 6 templates, lesson planner with 5 structured sections (PPP methodology: Warm Up, Presentation, Practice, Production, Wrap Up), search/filter/duplicate/publish, CI/CD pipeline.

**What it proved**: The basic data model and UX flow work. A teacher can create and organize lessons. But without AI and structured content, it is just a fancy notepad.

---

## Beta Phase — "Show the Magic" (IN PROGRESS)

**Goal**: A demo compelling enough that a language teacher watches it and says "I want to use this Monday."

**Audience**: Robert's brother (language teacher, potential PM).

### What Beta Delivers

**2A: AI Generation (T10-T15)** — already built or in progress
- Student profile enrichment (native language, goals, weaknesses)
- Claude API integration with model routing (Haiku for fast tasks, Sonnet for complex)
- Prompt service with deep CEFR awareness, L1 interference patterns, personalization
- Streaming SSE generation with per-section controls
- Lesson editor AI integration (generate, insert, edit, regenerate per section)

**2A.1: Typed Content Model (T15.1-T15.4)** — the foundational shift
- Content blocks become typed (`vocabulary`, `exercises`, `conversation`, `reading`, `freeText`)
- Each type has a defined JSON schema, a teacher editor component, and a student renderer
- The AI generates structured data; the frontend renders it appropriately
- Core types for demo: vocabulary (table/flashcards), exercises (quiz builder/interactive quiz), conversation (dialogue editor/viewer)

**2B: Make It Real (T16-T25)**
- One-click full lesson generation
- PDF export (teacher copy with answers, student handout without)
- Student lesson notes and history
- Dashboard v2 with actionable data
- Regenerate with direction ("make it easier", "more formal")
- Adapt lesson for another student (one-click re-personalization)
- AI-powered "suggest next topic" based on student history

**Post-Demo (T26)**
- Section URL attachments (YouTube, articles, online resources) to make each lesson a complete teaching workspace

**2C: Polish (T20, T22)**
- Brand, favicon, consistent visual identity
- Loading states, empty states, skeleton screens

**Demo Prep (T23)**
- Seed data, demo script, talking points

### What Beta Proves

1. **The teacher loop works**: create lesson, generate content, refine, export
2. **Content types are real**: vocabulary renders as vocabulary, not as JSON
3. **The student loop works**: same lesson data, different experience (flashcards, quizzes)
4. **Personalization is the moat**: content adapts to student level, interests, native language, weaknesses
5. **The platform thinks ahead**: suggest next topic based on student history

---

## Phase 2 — Production Readiness

**Goal**: Make the beta safe to put in real teachers' hands.

| Area | What | Why |
|------|------|-----|
| **Caching** | Generation cache (identical inputs return cached output) | Reduce API costs, faster repeat generations |
| **Usage limits** | Free-tier enforcement (25 generations/month) | Sustainable economics before monetization |
| **Monitoring** | Generation analytics (tokens, latency, model usage) | Understand costs and quality |
| **Error handling** | Retry logic, graceful degradation when Claude is down | Teachers can't have a blank screen mid-lesson |
| **Performance** | Optimistic UI updates, prefetching, lazy loading | Feels fast at scale |
| **Multi-tenant hardening** | Row-level security audit, data isolation verification | Ready for multiple real teachers |
| **New content types** | Reading passages, grammar explanations, homework | Expand the type system based on beta feedback |
| **File uploads** | Attach images, PDFs, and audio files to lesson sections (Azure Blob storage) | Complements URL attachments (added post-demo in beta) to make the platform a complete teaching workspace |

---

## Phase 3 — Growth

**Goal**: From "tool for one teacher" to "platform teachers share and build on."

| Area | What | Why |
|------|------|-----|
| **Student portal** | Students log in, see assigned lessons, do exercises, track progress | Closes the loop: teacher creates, student learns, teacher sees results |
| **1-to-1 Live Whiteboard + Call** | WebRTC peer-to-peer video call with shared interactive whiteboard, integrated with lesson content | Teachers need a visual teaching surface during live lessons. No paid service needed for 1-to-1 (WebRTC + SignalR). Pre-demo feedback from PM. |
| **Content library** | Save and reuse content blocks across lessons | A vocabulary set for "restaurant vocabulary A2" shouldn't be regenerated every time |
| **Sharing** | Shareable lesson links (view-only, no login required) | Teachers share materials with students via WhatsApp/email |
| **Homework portal** | Students complete assigned exercises online, teacher sees results | Replaces the "send a PDF, hope they do it" workflow |
| **Progress tracking** | Per-student dashboards: lessons completed, scores, areas of improvement | Data-driven teaching |
| **Payments** | Stripe integration, subscription tiers | Monetize once demand is validated |
| **Pronunciation** | AI-generated pronunciation guides, IPA, audio examples | High-value for language teaching, technically feasible |

---

## Future Possibilities

These are ideas, not commitments. Each depends on what beta and Phase 2/3 teach us about real usage.

| Idea | What it could be |
|------|-----------------|
| **Lesson marketplace** | Teachers publish and sell lesson packs to other teachers |
| **Mobile app** | Prep lessons on the phone between classes |
| **Group classroom mode** | Extend 1-to-1 live whiteboard (Phase 3) to support group lessons with multiple students. Requires a media server (SFU) for multi-party WebRTC. |
| **Spaced repetition** | Vocabulary from past lessons resurfaces in future exercises automatically |
| **AI tutor** | Student practices conversation with an AI partner using lesson vocabulary |
| **Multi-language platform UI** | Platform itself available in Spanish, Portuguese, French (not just content) |
| **Analytics & insights** | "Students who struggle with past tenses improve 40% faster when you do X" |
| **LMS integrations** | Export to Google Classroom, Moodle, Canvas |
| **Cultural notes** | AI-generated cultural context for topics (etiquette, customs, idioms) |
| **Writing correction** | Student submits writing, AI provides corrections with explanations |
| **Infographics** | Visual grammar summaries, vocabulary mind maps |

---

## Architecture Evolution

```
Phase 1:   Section -> textarea (free text blob)
Beta:      Section -> ContentBlock[] -> typed JSON (vocabulary, exercises, ...)
                                     -> type-specific renderers (teacher + student)
Phase 2:   ContentBlock gains caching, versioning, rating
Phase 3:   ContentBlock becomes shareable, library-storable, student-interactive
Future:    ContentBlock ecosystem (marketplace, cross-lesson reuse, analytics)
```

The typed content model introduced in Beta is the architectural foundation everything else builds on. Getting this right matters more than any individual feature.

---

*Created: March 2026 | Living document, updated as phases complete*
