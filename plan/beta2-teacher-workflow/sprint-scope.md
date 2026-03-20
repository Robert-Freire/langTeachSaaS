# Sprint: Beta 2 -- Teacher Workflow Foundation

**Status:** SCOPE DEFINED, NOT STARTED (waiting for Demo 1 closure)
**Goal:** Move from "impressive demo" to "tool a teacher would open on Monday."
**Theme:** The three highest-signal items from Jordi's feedback, focused on the teacher's daily workflow.

---

## Sprint Backlog

### P0: Course/Curriculum Planner (#98)

**Why #1:** Teachers think in courses, not lessons. Jordi's strongest ask across all rounds. Also the architectural prerequisite for difficulty tracking, audio reflections, and everything in Phase 2A.

**Scope for this sprint:**
- New "Course" entity (backend + frontend)
- Two modes: General learning (CEFR target + session count) and Exam prep (DELE, DALF, Cambridge, TOEFL + exam date)
- Teacher can create a course, define parameters, generate a curriculum plan
- Curriculum shows lesson sequence with topics, grammar points, competencies covered
- Teacher can reorder/adjust the plan
- Generate individual lessons from the plan (connects to existing lesson creation)
- Dashboard integration: courses visible alongside lessons

**Out of scope for this sprint:**
- Auto-adaptation based on student progress (needs difficulty tracking first)
- Audio reflection integration
- Group course support

### P1: Enhanced Difficulty Tracking (#100)

**Why:** Makes personalization operational. Jordi wants granular error tracking (ser/estar, not just "grammar"), repetitive mistake detection, and positive feedback when improving.

**Scope for this sprint:**
- Extend student profile: structured difficulty model (category > specific item > severity/trend)
- UI for teachers to view/edit difficulties per student
- Difficulties feed into AI generation prompts (already partially there, needs to be granular)
- Auto-update from exercise results (when student portal exists, but schema ready now)

**Out of scope for this sprint:**
- Automatic detection from exercise results (needs student-facing exercises first)
- Emotional/affective tracking
- Positive feedback notifications to students

### P1: Material Upload (#102)

**Why:** Jordi adapts more than he creates. Uses ProfeDeELE, Arche ELE, Canva. The "before" is: download PDF, open Canva, adapt manually. The "after": upload resource, AI adapts for this student.

**Scope for this sprint:**
- Upload PDFs, images, worksheets to lesson sections (Azure Blob storage)
- AI can reference uploaded materials when generating content ("use this vocabulary list as a base")
- Teacher can view/download uploaded materials in the editor
- Basic file management (upload, delete, preview)

**Out of scope for this sprint:**
- Learning teacher's style from uploaded materials (Phase 3+)
- OCR/text extraction from images
- Bulk import

### P1: Exercise Correction with Explanation (#127)

**Why:** Table-stakes. "Show the correct answer and explain why" (Jordi feedback #9). Small scope, high teacher-visible value.

**Scope for this sprint:**
- When student answers wrong, show correct answer + AI explanation
- Explanation generated at exercise creation time (stored in content block)
- Teacher can preview/edit explanation in lesson editor
- Works for all current exercise types

---

## Deferred Items (with rationale)

| Item | Issue | Rationale |
|------|-------|-----------|
| Audio Post-Class Reflections | #99 | Jordi skeptical ("why is this important?"). Revisit after Course Planner exists. |
| Group Class Support | #101 | Real need but complex. Course Planner must exist first. Next sprint. |
| File attachments per section | #26 | Overlaps with Material Upload. Merge or sequence after #102. |
| Gamification/ludic activities | (no issue) | Strong signal but needs more definition. Waiting for Jordi's answer on game types. |
| Online whiteboard | (Phase 3) | Confirmed valuable by Jordi (Preply's best feature) but not near-term. |

---

## Dependencies and Sequencing

```
#98 Course Planner (P0, largest)
  |
  +-- #100 Enhanced Difficulty Tracking (can start in parallel, but benefits from Course context)
  |
  +-- #127 Exercise Correction (independent, can start anytime)

#102 Material Upload (independent, can start anytime)
```

Recommended order: Start #98 and #127 in parallel (one is large, one is small). Then #102 and #100 can run in parallel or sequentially depending on capacity.

---

## Carry-over Risk

Some Demo 1 issues may carry over into this sprint. Slots reserved for:
- Any P1 bugs not closed before sprint starts
- UX guidelines (#126) if not completed

---

## Success Criteria

A teacher (Jordi) can:
1. Create a course for a student with a target level and session count
2. See a generated curriculum plan and adjust it
3. Upload an existing worksheet and have AI reference it in generation
4. See correct answers with explanations when reviewing exercises
5. View granular difficulty tracking for a student (not just "grammar" but "ser/estar in descriptions")

---

## Teacher Review Checkpoint (lightweight, non-blocking)

For features that generate Spanish content (#98 curriculum, #127 exercise explanations), send Jordi 2-3 sample outputs for a quick sanity check.

**Rules:**
- One email per feature, max. Batch if two features land the same week.
- Keep it simple: "Does this look right for a B1 student?" No forms.
- Voice note replies are fine (he prefers that).
- Never block on his response. His input is a bonus, not a gate. If no reply in a week, move on.
- Jordi is busy and this is a hobby for him. Do not overwhelm.

---

*Prepared: 2026-03-20 | Launch: pending Demo 1 closure*
