# LangTeach SaaS — V1 Requirements

> **Scope**: B2B tool for independent language teachers
> **Core focus**: Lesson planning & AI-assisted content creation
> **Stack**: Azure · C# (.NET) · React · Node.js

---

## 1. Vision & Goals

### Problem Statement
Language teachers spend a disproportionate amount of time creating lesson materials (exercises, vocabulary lists, reading texts, grammar explanations) manually — time that should go to actual teaching.

### Value Proposition & Differentiation
The differentiator is not AI generation alone (teachers can prompt ChatGPT directly). The value is the **structured workflow**: lesson planner + student context + content library + one-click export as a single integrated workspace. Generation is a capability inside that workflow, not the product itself.

### V1 Goal
Give individual language teachers a fast, AI-powered workspace to plan lessons and generate high-quality, curriculum-aligned content in minutes instead of hours.

### Success Metrics (V1)
- Teacher can create a full lesson plan in < 10 minutes
- Content generation rated "usable without editing" in >= 70% of cases
- Time-to-first-lesson < 5 minutes after sign-up

---

## 2. Users & Personas

### Primary Persona — Independent Language Teacher
- Teaches 1-on-1 or small groups (Preply, iTalki, or private students)
- Teaches English, Spanish, French, or other modern languages
- Prepares customized materials per student level and interests
- Pain points: repetitive content creation, no central workspace, copy-pasting from scattered sources, having to re-enter student context on every AI tool they use

---

## 3. Feature Scope — V1

### 3.1 Authentication & Onboarding
| # | Requirement | Priority |
|---|-------------|----------|
| A1 | Email/password registration and login | Must |
| A2 | OAuth login (Google) | Should |
| A3 | Onboarding wizard: language(s) taught, preferred frameworks (CEFR, etc.) | Must |
| A4 | Free trial (no credit card) — limited generations per month | Must |

---

### 3.2 Teacher Profile & Settings
| # | Requirement | Priority |
|---|-------------|----------|
| P1 | Set teaching languages and levels (A1-C2 / CEFR) | Must |
| P2 | Set preferred content style (formal, conversational, exam-prep) | Should |
| P3 | Manage subscription and billing | Must |

---

### 3.3 Student Profiles (Lightweight)
Not student accounts. These are teacher-owned records used to pre-fill generation context.

| # | Requirement | Priority |
|---|-------------|----------|
| SP1 | Create a student profile: name, language being learned, CEFR level, interests (tags), notes | Must |
| SP2 | Select a student profile when creating or generating a lesson (pre-fills level + interests) | Must |
| SP3 | Edit and delete student profiles | Must |
| SP4 | List view of all student profiles | Must |

---

### 3.4 Lesson Planner
| # | Requirement | Priority |
|---|-------------|----------|
| L1 | Create a lesson with title, language, level, topic, duration, objectives, and optional student profile link | Must |
| L2 | Lesson template library (conversation, grammar focus, reading, writing, exam prep) | Must |
| L3 | Structured lesson sections: Warm-up · Presentation · Practice · Production · Wrap-up | Must |
| L4 | Free-form notes per section | Must |
| L5 | Save lessons as drafts or published | Must |
| L6 | Duplicate an existing lesson | Should |
| L7 | Lesson list view with search and filter by language/level/topic | Must |
| L8 | Export lesson plan to PDF | Should |

---

### 3.5 AI Content Generation
All generation powered by Claude API (Anthropic). Called directly from the .NET backend — Claude API is not available via Azure OpenAI Service.

| # | Requirement | Priority |
|---|-------------|----------|
| G1 | Generate a full lesson plan from: language + level + topic + duration | Must |
| G2 | Generate vocabulary list (word, definition, example sentence, translation) | Must |
| G3 | Generate grammar explanation with examples, targeted at CEFR level | Must |
| G4 | Generate reading/listening comprehension text with questions | Must |
| G5 | Generate fill-in-the-blank, multiple choice, and matching exercises | Must |
| G6 | Generate conversation prompts and roleplay scenarios | Must |
| G7 | Regenerate any individual section without losing the rest | Must |
| G8 | Tone/style selector per generation (formal, casual, business, academic) | Should |
| G9 | Generate content based on a topic from the student profile (e.g. "football", "cooking") | Should |
| G10 | Generate a homework assignment from the lesson content | Should |
| G11 | Optional free-text "reference material" field per generation (e.g. textbook name, curriculum unit, pasted context) | Should |
| G12 | Thumbs up/down rating on any generated block (feedback stored for prompt improvement) | Should |

**Generation cost controls (required before launch):**
- Use Claude Haiku for simple tasks (vocabulary lists, short exercises); Claude Sonnet for lesson plans and grammar explanations
- Cache results: identical input parameters (language + level + topic + style) return cached output, refreshable on demand
- Per-plan daily soft cap to prevent runaway API spend; surface usage to the teacher

---

### 3.6 Content Library
| # | Requirement | Priority |
|---|-------------|----------|
| CL1 | Save any generated content block as a reusable snippet | Must |
| CL2 | Browse and search saved snippets by language, level, type, topic | Must |
| CL3 | Insert saved snippet into any lesson | Must |
| CL4 | Tag snippets with custom labels | Should |

---

### 3.7 Export & Sharing
| # | Requirement | Priority |
|---|-------------|----------|
| E1 | Export lesson + materials as PDF (teacher view) | Must |
| E2 | Export student-facing worksheet as PDF (no teacher notes) | Must |
| E3 | Copy content to clipboard (plain text / formatted) | Must |
| E4 | Shareable lesson link (read-only, no auth required) | Should |

---

## 4. Out of Scope — V1
The following are intentionally excluded from V1 to keep scope tight:

- Student accounts, portals, or progress tracking
- Scheduling and calendar integration
- Payment processing for lesson bookings
- Real-time collaboration
- Pronunciation / speech features
- Mobile native app
- LMS integrations (Google Classroom, Moodle)
- Multi-teacher / school management
- Right-to-left language support (Arabic, Hebrew)

> These are strong candidates for **V2** once core lesson planning has validated PMF.

---

## 5. Technical Architecture

### 5.1 Stack Decisions
| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React + TypeScript | Existing expertise |
| Backend API | C# / .NET 8 (Web API) | Existing expertise, strong Azure integration |
| AI Integration | Claude API (Anthropic) — called directly from backend | Best-in-class for long-form educational content; not available via Azure OpenAI |
| Auth | Auth0 (free tier: up to 7,500 MAU) | Simpler and cheaper than Azure AD B2C for this use case; supports Google OAuth |
| Database | Azure SQL + Azure Blob Storage | Structured data + file/PDF storage |
| Hosting | Azure App Service + Azure Static Web Apps | Seamless with existing Azure skills |
| PDF Export | headless Chrome / Playwright or server-side PDF lib | Consistent rendering |

### 5.2 Key API Endpoints (Draft)
```
POST   /api/lessons                    # Create lesson
GET    /api/lessons                    # List lessons
GET    /api/lessons/{id}               # Get lesson
PUT    /api/lessons/{id}               # Update lesson
DELETE /api/lessons/{id}               # Delete lesson

POST   /api/students                   # Create student profile
GET    /api/students                   # List student profiles
PUT    /api/students/{id}              # Update student profile
DELETE /api/students/{id}              # Delete student profile

POST   /api/generate/lesson-plan       # AI: full lesson plan
POST   /api/generate/vocabulary        # AI: vocabulary list
POST   /api/generate/grammar           # AI: grammar explanation
POST   /api/generate/reading-text      # AI: reading passage + questions
POST   /api/generate/exercises         # AI: exercises
POST   /api/generate/conversation      # AI: conversation prompts
POST   /api/generate/homework          # AI: homework assignment
POST   /api/generate/feedback          # Store thumbs up/down on generated block

GET    /api/library                    # List saved snippets
POST   /api/library                    # Save snippet
DELETE /api/library/{id}               # Delete snippet

POST   /api/export/lesson/{id}/pdf     # Export lesson PDF
POST   /api/export/worksheet/{id}/pdf  # Export student worksheet PDF
```

### 5.3 AI Prompt Strategy
- All prompts include: **language**, **CEFR level**, **topic**, **style**, **teacher preferences** from profile, and **student interests** from student profile when available
- Optional "reference material" free-text field appended to prompt when provided
- System prompt establishes the teacher's context once; content prompts are modular
- Stream responses to UI for perceived performance
- Store raw AI output + teacher edits separately to enable "regenerate" without losing edits
- Model routing: Haiku for lightweight tasks, Sonnet for complex generation (lesson plans, grammar)
- Cache keyed on: `{language}-{level}-{topic}-{style}-{template}` — teacher can bust cache with "regenerate"

### 5.4 AI Cost Model
Estimated Claude API cost per generation (approximate):
- Vocabulary list (Haiku): ~$0.01
- Grammar explanation (Sonnet): ~$0.05
- Full lesson plan (Sonnet): ~$0.10-0.20

Margin protection:
- Free tier: hard cap enforced server-side, no exceptions
- Paid tiers: fair-use soft cap (e.g. 200 generations/month) displayed to user; hard cap at 2x that
- Caching expected to reduce API calls by ~30-40% for common topics/levels

---

## 6. UX Principles
1. **Speed first** — generation should feel instant (stream tokens to UI)
2. **Always editable** — every AI output is immediately editable inline
3. **Progressive disclosure** — simple defaults, advanced options behind toggles
4. **One screen per task** — lesson planner, content generator, and library are separate views
5. **Student context, once** — student profile pre-fills generation so teachers never re-enter the same context

---

## 7. Monetization (V1)
| Plan | Price | Limits |
|------|-------|--------|
| Free | $0 | 25 AI generations/month, 10 lessons stored, no PDF export |
| Solo | $19/mo | 200 generations/month, unlimited lessons, PDF export |
| Pro | $39/mo | Everything in Solo + priority support + early features + higher generation cap |

> **Note on "unlimited":** No plan should offer truly unlimited generations due to API cost exposure. Cap Solo at 200/month (well above typical teacher usage) and market it as "unlimited for normal use."

---

## 8. Development Phases

### Phase 1 — Foundation (Weeks 1-3)
- [ ] Project setup: React app, .NET API, Azure SQL, Auth0
- [ ] Teacher profile & settings
- [ ] Student profiles (CRUD)
- [ ] Basic lesson CRUD (no AI yet)
- [ ] Lesson template selection

### Phase 2 — AI Core (Weeks 4-6)
- [ ] Claude API integration (streaming, model routing)
- [ ] Generate: lesson plan, vocabulary, grammar, exercises
- [ ] Inline editing of generated content
- [ ] Regenerate individual sections
- [ ] Generation caching layer

### Phase 3 — Library & Export (Weeks 7-8)
- [ ] Content library (save, browse, insert snippets)
- [ ] PDF export (lesson plan + student worksheet)
- [ ] Shareable lesson link
- [ ] Thumbs up/down feedback on generated content

### Phase 4 — Monetization & Launch (Weeks 9-10)
- [ ] Stripe integration (subscription billing)
- [ ] Free tier limits enforcement + usage dashboard
- [ ] Onboarding flow polish
- [ ] Beta launch (target: Preply/iTalki teacher communities)

---

## 9. Open Questions
- [ ] Launch languages: recommend English + Spanish only for V1 — validate with beta users before expanding
- [ ] Should teachers be able to paste a text (e.g. a news article) for AI to build exercises around? (Likely yes — add to G11 scope)
- [ ] Feedback loop: how do thumbs-up/down ratings feed back into prompt iteration? Manual review initially, automated later
- [ ] Which Stripe plan structure best fits teacher payment sensitivity? Consider annual discount at launch

---

*Last updated: March 2026 — V1 Draft (rev 2)*
