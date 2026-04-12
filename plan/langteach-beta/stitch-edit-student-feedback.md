# Edit Student — Stitch revision prompt

Paste this in the Stitch conversation after the current Edit Student screen.

~~~
Changes needed for the Edit Student screen:

1. REMOVE the "Change Photo" option from Basic Info. We use avatar
   initials only. No photo upload for this version.

2. ADD a "Languages" section to Basic Info (or as its own section
   between Basic Info and Personal Background):
   - Native Languages: multi-select dropdown (can be 1 or 2).
     Example: "Portuguese" or "Portuguese, Catalan"
   - Spoken Languages: tag input for other languages the student
     speaks (besides native and the one they're learning).
     Example: "English", "French"
   These are critical fields that feed AI content generation.

3. MOVE Skill Assessment Overrides (Reading, Writing, Speaking,
   Listening) out of Basic Info and into the "Proficiency" tab.
   Basic Info should only have: Full Name, Learning Language,
   Teacher's Assessment level, Official Level.

4. SPLIT the Teaching Goals section into two distinct groups:
   - "Learning Goals" — long-term objectives with no date.
     Example: "Professional Fluency", "Mastering vocabulary related
     to construction materials." Add button: "+ Add Goal"
   - "Short-Term Objectives" — time-pressured goals with a target
     date. Example: "DELE B2 Exam — June 15, 2024." Add button:
     "+ Add Objective"
   They can live in the same visual area but need separate add
   flows (goals have no date field, objectives have a date field).

5. ADD a "Weaknesses / Areas to Improve" section near Key
   Difficulties. These are free-text descriptions with a category
   (grammatical, lexical, orthographic). Different from structured
   Difficulties: Weaknesses are prose observations, Difficulties
   are tracked with severity/trend/status. Example weakness:
   "Tends to overcomplicate sentence structure when writing formally."

6. CHANGE the Pending Followups action buttons from "MARK SENT"
   to "Done". Not all followups are about sending something.
   "Confirm new rate with Paula" would need "Done", not "Mark Sent."
   Use a generic "Done" label for all followups.

7. VERIFY that the Difficulties tab in the tab bar shows both
   Weaknesses (free text) and Key Difficulties (structured table).

Everything else looks great. Keep the layout, the two-column notes
section (Sensitivities / Pedagogical Observations), the Teaching
Todos vs Pending Followups separation, Commercial Info with the
toggles and rate, and the Linked Courses section.
~~~
