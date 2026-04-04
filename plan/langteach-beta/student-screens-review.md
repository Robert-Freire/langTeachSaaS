# Student Screens Review — Isaac Pedagogical Analysis
**Date:** 2026-04-03  
**Scope:** Students list, student detail (Overview + History tabs), Edit Student form  
**Context:** Post-import of Jordi's Preply student roster (40 students, Excel import 2026-04-03)

---

## Summary

The import worked technically but the UI fails to surface the imported data where a teacher needs it. The edit form is richer than the overview, which is backwards. Several level mismatches could cause the AI to generate content at completely wrong CEFR levels. The notes field is doing too much work, containing structured data (assessment results, student background) mixed with developer metadata.

---

## Finding 1 — Level mismatches: pedagogically critical

**Severity: Critical**

Multiple students show CEFR level badges that contradict the Preply test notes imported alongside them:

| Student | Badge level | Notes say |
|---------|-------------|-----------|
| Alice | A1 | "Preply test: C1" |
| Anastasia | A1 | "Preply test: B1" |
| Ayah | A1 | "A0+" |

If the system uses the badge level for AI generation, content will be generated at a completely wrong level. A C1 student receiving A1 content is useless; an A1 student receiving B1 content is incomprehensible. This is not a cosmetic issue -- it breaks the core value proposition.

**Root cause hypothesis:** The import may have mapped the "enrolled level" (platform level) separately from the Preply assessment level, and defaulted to A1 when no level was found in a specific column. Or the level mapping logic inverted something.

**What needs to happen:** Clarify which level drives generation. If there are two levels (enrolled vs assessed), both should be visible and labeled. The generation system must use the correct one.

---

## Finding 2 — Overview shows almost nothing; edit form shows everything

**Severity: High**

The Overview tab renders:
- A profile completeness widget (with mostly empty circles)
- "Lesson History: No lesson notes yet"
- "Courses: No courses yet"

The Edit form renders:
- Name, learning language, CEFR level
- Interests
- Native language, learning goals, areas to improve, specific difficulties
- Notes (with all the imported Preply data)
- Courses
- Lesson history

A teacher opening a student profile to check context before a class sees almost nothing. They have to click edit just to read the student's profile. This is backwards. Edit mode is for changing data; view mode should show all of it in a readable, non-editable layout.

**Fix:** The Overview tab should render all the same sections as the edit form, in read-only mode. Add a single "Edit profile" button. Nothing that is visible in edit should be hidden in view.

---

## Finding 3 — Raw import metadata is exposed to the teacher

**Severity: High**

Every imported student's notes field starts with `[Excel import 2026-04-03]`. This is a developer artifact. Jordi will read this and think something went wrong with the import.

The notes field currently contains three things mixed together:
1. Developer metadata: `[Excel import 2026-04-03]`
2. Preply assessment notes: `Preply test: test Nivel B1+, pero habla bien`
3. Student background: `Student info: Brasileño en oporto; interesado en los matices de la lengua`

These are three different types of information that deserve three different treatments:
- Strip the import metadata entirely (or move it to a non-visible audit field)
- Surface "Preply test:" content as "Assessment notes" -- a distinct labeled field
- Surface "Student info:" content as "Background" -- a distinct labeled field

At minimum, strip the `[Excel import YYYY-MM-DD]` prefix from the displayed notes.

---

## Finding 4 — "AI Personalization" is the wrong section label for a teacher

**Severity: Medium**

The edit form groups native language, learning goals, areas to improve, and specific difficulties under a section called "AI Personalization" with the subtitle "Used to personalize AI-generated lesson content for this student."

Teachers do not think of this as AI configuration. These are standard pedagogical data points -- the kind of things that go in any student dossier. The label "AI Personalization" frames it as a technical setting rather than teaching-critical information, which may cause teachers to skip it or treat it as optional.

**Suggested label:** "Student Profile" or "Teaching Context." The fact that the AI uses it is an implementation detail, not the teacher's concern.

---

## Finding 5 — Profile completeness widget is misleading after import

**Severity: Medium**

The completeness widget says "17% complete" for Alex. Brasis, listing native language, interests, learning goals, weaknesses, and difficulties as missing.

But Jordi's Excel contained all of this information. The import put it in the Notes field as free text instead of populating the structured fields. From Jordi's perspective: he gave all the data and the system tells him his student is 17% complete. That is demoralizing and incorrect.

Two possible fixes:
1. Parse the imported notes and auto-populate the structured fields (native language from "Brasileño" = Portuguese, interests from "interesado en los matices de la lengua", etc.)
2. If auto-parsing is too risky: show the Notes content prominently on the Overview so the teacher can see what was imported, and offer a one-click "fill from notes" assisted workflow.

---

## Finding 6 — The "Spanish" language tag is ambiguous on the student list

**Severity: Medium**

Every Jordi student card shows "Spanish" as a tag next to the name. It is unclear whether this is:
- The language being learned (target language), or
- The student's native language (L1)

For a teacher who teaches only Spanish to everyone, the target language tag is redundant -- they know all their students are learning Spanish. What matters for lesson generation is the **native language (L1)**, because that determines interference patterns, pronunciation challenges, and grammar transfer issues.

The list card should show L1 prominently (e.g., "Native: Portuguese") rather than (or in addition to) the target language, especially once L1 is populated.

---

## Finding 7 — Lesson History appears inside the edit form

**Severity: Medium**

The Edit Student form includes a "Lesson History" section at the bottom, which shows "No lesson notes yet." History is read-only by nature -- it cannot be edited on this form. Placing it inside an edit form creates confusion about what can be changed.

Lesson History belongs only on the History tab of the view. Remove it from the edit form entirely.

---

## Finding 8 — History entries duplicate content on expand

**Severity: Low**

In the History tab, collapsed entries already show "Planned: [text] Done: [text]". When expanded, the entry shows the same text again under "What was planned" / "What was done" headings, plus a Delete button. No new information is revealed by expanding.

Either the collapsed state should be a truncated summary (so expand reveals the full text), or the collapsed labels should be removed and the full text shown only on expand. Currently the expand adds nothing.

---

## Finding 9 — Delete button on session history is dangerous

**Severity: Low**

Each expanded history entry has a red "Delete" button. Session notes represent irreplaceable teaching history -- particularly after a Preply import that captures months of class records. A misclick deletes real data.

Options: require a confirmation dialog, add a soft-delete with an undo window, or make history read-only by default and require an explicit "Edit history" mode to delete.

---

## Finding 10 — No "Create lesson for this student" action on the student profile

**Severity: Low**

The student overview has one CTA: "Log session." From the profile of a real student, the most natural next action for a teacher is "prepare a lesson." There is no "New lesson for [student]" button that would pre-populate the student and level in the lesson creation flow.

This is a workflow gap, not a bug. Worth addressing once the other issues above are resolved.

---

## Finding 11 — Student names are inconsistent (first name only vs full name)

**Severity: Low**

Most Jordi students are imported with first names only (Alice, Anastasia, Ayah, Gabriel). A few have full names (Alex. Brasis, Ana Souza). The "Alex." prefix on "Alex. Brasis" also looks like a parsing artifact -- it may be "Alex B." with the period and last name concatenated.

This is an import data quality issue rather than a UI issue, but it affects how professional the student list looks.

---

## Priority Order for Issues

1. **Level mismatches** (Critical -- affects generation correctness)
2. **Overview shows nothing / edit shows everything** (High -- core UX problem)
3. **Raw import metadata visible** (High -- first impression for Jordi)
4. **"AI Personalization" label** (Medium -- affects teacher adoption)
5. **Completeness widget misleading** (Medium -- confuses Jordi about data quality)
6. **"Spanish" tag ambiguity** (Medium -- L1 should be prominent)
7. **Lesson History in edit form** (Medium -- conceptual confusion)
8. **History expand duplication** (Low)
9. **Delete on history** (Low)
10. **No "create lesson" shortcut** (Low)
11. **Name formatting** (Low -- import data quality)
