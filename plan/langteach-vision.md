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

**2C: Polish (T20, T20.1)**
- Brand, favicon, consistent visual identity
- Loading states, empty states, skeleton screens
- Public landing page with value proposition and sign-up CTA (T20.1, feeds demo first impression)

**Demo Prep (T23)**
- Seed data, demo script, talking points

### What Beta Proves

1. **The teacher loop works**: create lesson, generate content, refine, export
2. **Content types are real**: vocabulary renders as vocabulary, not as JSON
3. **The student loop works**: same lesson data, different experience (flashcards, quizzes)
4. **Personalization is the moat**: content adapts to student level, interests, native language, weaknesses
5. **The platform thinks ahead**: suggest next topic based on student history

---

## First PM Feedback (2026-03-18)

Before seeing the app, Robert's brother (language teacher, potential PM) provided detailed feedback via voice notes. This feedback validates the product direction and reveals the next layer of teacher needs. Full transcriptions and analysis in `plan/langteach-beta/demo feedback 1/`.

### Key Themes

**1. Curriculum over Lessons (highest signal)**
Teachers don't think in isolated lessons. They think in courses: "I have 20 sessions to get this student to B2." The platform needs a layer above lessons: a Course entity that wraps multiple lessons into a structured progression toward a CEFR goal, covering grammar and all four competencies (reading, writing, listening, speaking). This also extends to specialized courses (business, legal, conversation).

**2. Less Admin, More Teaching**
Teachers hate admin but know tracking helps. The idea: after class, teacher sends a voice note (like a WhatsApp audio) describing how it went, the system transcribes it and uses that to update student progress and adapt future lesson plans. Zero-friction input, high-value output.

**3. Deeper Personalization**
Beyond CEFR level, track specific per-student difficulties (e.g., "confuses ser/estar", "pronunciation of /r/") and use these granularly in generation. Also support group classes with mixed L1 backgrounds where activities need to work for everyone while targeting individual weaknesses.

**4. Teacher's Own Materials**
Teachers have existing resources (PDFs, worksheets, slides). The system should accept uploads and incorporate them into planning, not just generate from scratch. Over time, learn the teacher's style, preferred activity formats, and pedagogical approach.

**5. Evaluation Beyond Lesson Prep**
Text correction that categorizes errors by type (grammar, vocabulary, punctuation, verb forms) for student writing. More structured than generic AI correction.

**6. Richer Output Formats**
Generate infographics, crossword puzzles, board games, presentation slides. Varied, engaging materials beyond text-based content.

*(Items 7 and 8 added from second batch of voice notes, WA0006 and WA0007.)*

**7. Emotional / Affective Tracking**
Language learning is deeply emotional. Students react differently to activities. The post-class Audio Reflection system should extract emotional engagement signals (enjoyment, frustration, disengagement) alongside topic coverage. Generation should support an "engagement style" parameter so activities can be gamified, conversational, or drill-based as appropriate for that student's mood and preferences.

**8. Exam Prep as a Distinct Curriculum Mode**
Differentiate between general language learning (fluency-driven, CEFR progression) and exam preparation (certificate-driven: DELE, DALF, Cambridge, TOEFL). The Course Planner must support both modes from the start, as they require different session types, timed practice, mock tests, and exam-specific strategy content.

### What This Validates
- The typed content model is the right architectural bet (he's asking for MORE types, not different ones)
- CEFR awareness in prompts is exactly right, but needs to become a first-class planning tool
- Personalization (L1, weaknesses, goals) is the moat, confirmed by a real teacher
- The teacher's daily reality (5-8 students, 10 minutes between classes, car debriefs) matches our persona

### How This Reshapes the Roadmap
- **Phase 2 now leads with Course Planner and Audio Reflections** (not just infrastructure hardening)
- **Group classes move to Phase 2** (from Future), as a real near-term need
- **Material uploads stay Phase 2** but with higher priority
- **Evaluation tools, slide generation, adaptive style learning move to Phase 3**
- See per-phase tables below for the updated breakdown

---

## Phase 2 — Teacher Workflow + Production Readiness

**Goal**: From "impressive demo" to "tool I use every Monday." Course-level planning, zero-friction tracking, and production infrastructure.

### Phase 2A: Teacher Workflow (feedback-driven, highest priority)

| Area | What | Why | Feedback ref |
|------|------|-----|-------------|
| **Course/Curriculum Planner** | New "Course" entity wrapping multiple lessons. Two modes: (1) **General learning** -- given student, target CEFR level, session count, and hours, generate a curriculum covering grammar + 4 competencies; (2) **Exam prep** -- given target exam (DELE, DALF, Cambridge, TOEFL) and exam date, generate an exam-specific curriculum with mock tests, timed practice, and strategy sessions. Teacher can reorder, adjust, and generate individual lessons from the plan. | PM's #1 request. Teachers think in courses, not isolated lessons. Exam prep mode is a strong commercial differentiator -- exam teachers have a concrete deadline and are motivated buyers. | Feedback #1, #3, #4, #14 |
| **Audio Post-Class Reflections** | Teacher records a voice note after class. System transcribes (Whisper), extracts key observations -- including emotional engagement signals (what the student enjoyed, what frustrated them, what fell flat) -- updates student progress, and adapts the next lesson plan. | Zero-friction tracking. Teachers already mentally debrief. Capturing the affective dimension (not just topic coverage) is what makes the adaptation genuinely personalized. Low technical complexity, high perceived magic. | Feedback #7, #13 |
| **Enhanced Difficulty Tracking** | Extend student weaknesses from a flat list to structured, trackable difficulties (grammar: ser/estar, pronunciation: specific sounds, etc.). Feed these granularly into generation prompts. Auto-update from class reflections. | Makes personalization operational, not just decorative. | Feedback #5, inline notes |
| **Group Class Support** | New "Group" entity with multiple students. Lesson can target a group. Generation considers mixed L1 backgrounds and balances activities for the group while noting individual needs. | Real-world teaching includes group classes (academies, institutes). | Feedback #6, #9 |
| **Material Upload** | Upload PDFs, worksheets, images, audio to lesson sections (Azure Blob storage). Uploaded materials inform AI generation ("use this vocabulary list as a base"). | Teachers have existing resources. The system should build on them, not ignore them. | Feedback #9, #11, #12 |

### Phase 2B: Production Infrastructure

| Area | What | Why |
|------|------|-----|
| **Caching** | Generation cache (identical inputs return cached output) | Reduce API costs, faster repeat generations |
| **Usage limits** | Free-tier enforcement (25 generations/month) | Sustainable economics before monetization |
| **Monitoring** | Generation analytics (tokens, latency, model usage) | Understand costs and quality |
| **Error handling** | Retry logic, graceful degradation when Claude is down | Teachers can't have a blank screen mid-lesson |
| **Performance** | Optimistic UI updates, prefetching, lazy loading | Feels fast at scale |
| **Sign-up & onboarding** | Branded sign-up flow, onboarding wizard (languages taught, CEFR prefs, first student, first lesson), free-tier messaging | Self-service acquisition for real teachers. Target: time-to-first-lesson < 5 min after sign-up. |
| **Multi-tenant hardening** | Row-level security audit, data isolation verification | Ready for multiple real teachers |

---

## Phase 3 — Growth

**Goal**: From "tool for one teacher" to "platform teachers share and build on."

| Area | What | Why | Feedback ref |
|------|------|-----|-------------|
| **Student portal** | Students log in, see assigned lessons, do exercises, track progress | Closes the loop: teacher creates, student learns, teacher sees results | |
| **Evaluation/Text Correction** | Teacher uploads student text, AI returns categorized errors (grammar, vocabulary, punctuation, verb forms). More structured than generic AI. Separate workflow from lesson generation. | High-value tool teachers use weekly. Goes beyond what ChatGPT offers generically. | Feedback #8 |
| **Placement Test Generation** | Generate diagnostic assessments to determine student's initial CEFR level. Results feed into student profile and course planning. | Streamlines student onboarding. Many exist online, but integrated ones save time. | Feedback #2 |
| **1-to-1 Live Whiteboard + Call** | WebRTC peer-to-peer video call with shared interactive whiteboard, integrated with lesson content | Teachers need a visual teaching surface during live lessons. | |
| **Content library** | Save and reuse content blocks across lessons | A vocabulary set for "restaurant vocabulary A2" shouldn't be regenerated every time | |
| **Sharing** | Shareable lesson links (view-only, no login required) | Teachers share materials with students via WhatsApp/email | |
| **Homework portal** | Students complete assigned exercises online, teacher sees results | Replaces the "send a PDF, hope they do it" workflow | |
| **Progress tracking** | Per-student dashboards: lessons completed, scores, areas of improvement | Data-driven teaching | |
| **Payments** | Stripe integration, subscription tiers | Monetize once demand is validated | |
| **Pronunciation** | AI-generated pronunciation guides, IPA, audio examples | High-value for language teaching, technically feasible | |

---

## Future Possibilities

These are ideas, not commitments. Each depends on what beta and Phase 2/3 teach us about real usage.

| Idea | What it could be | Feedback ref |
|------|-----------------|-------------|
| **Adaptive teacher style learning** | System learns from teacher's methodology, preferred activity formats, and pedagogical sequences over time. Academy-level customization of the platform's teaching approach. | Feedback #12 |
| **Presentation/slide generation** | Generate infographics, crossword puzzles, board games, slide decks, and other visual teaching materials | Feedback #10, inline notes |
| **Lesson marketplace** | Teachers publish and sell lesson packs to other teachers | |
| **Mobile app** | Prep lessons on the phone between classes | |
| **Group classroom mode** | Extend 1-to-1 live whiteboard (Phase 3) to support group lessons with multiple students. Requires a media server (SFU) for multi-party WebRTC. | |
| **Spaced repetition** | Vocabulary from past lessons resurfaces in future exercises automatically | |
| **AI tutor** | Student practices conversation with an AI partner using lesson vocabulary | |
| **Multi-language platform UI** | Platform itself available in Spanish, Portuguese, French (not just content) | |
| **Analytics & insights** | "Students who struggle with past tenses improve 40% faster when you do X" | |
| **LMS integrations** | Export to Google Classroom, Moodle, Canvas | |
| **Cultural notes** | AI-generated cultural context for topics (etiquette, customs, idioms) | |

---

## Architecture Evolution

```
Phase 1:   Section -> textarea (free text blob)
Beta:      Section -> ContentBlock[] -> typed JSON (vocabulary, exercises, ...)
                                     -> type-specific renderers (teacher + student)
Phase 2:   Course -> Lesson[] -> ContentBlock[] (course as top-level entity)
           ContentBlock gains caching, versioning, rating
           AudioReflection -> transcription -> student progress update
Phase 3:   ContentBlock becomes shareable, library-storable, student-interactive
           EvaluationResult -> categorized error analysis
Future:    ContentBlock ecosystem (marketplace, cross-lesson reuse, analytics)
           Adaptive style learning across teacher's corpus
```

The typed content model introduced in Beta is the architectural foundation everything else builds on. The Course entity (Phase 2) adds the planning layer teachers actually think in. Getting both right matters more than any individual feature.

---

*Created: March 2026 | Updated: 2026-03-18 (First PM feedback incorporated) | Living document, updated as phases complete*
