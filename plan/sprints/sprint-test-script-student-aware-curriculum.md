# Test Script: Student-Aware Curriculum Sprint

Quick manual test of the main flows before merging to main. Not exhaustive, just the sprint story moments.

**Frontend:** http://localhost:5173 | **API:** http://localhost:5000

---

## 1. Course creation (the main flow)

- Go to a student's edit page (e.g., Marco)
- Click **"Create Course"** button
- Verify language and CEFR level are pre-filled from the student
- Select a template (e.g., General Spanish A1)
- Set session count to 12
- Click **Generate Curriculum**
- Verify the course detail shows 12 session cards with learning targets

## 2. Curriculum cards

- Expand 2-3 session cards
- Check: grammar topic, vocabulary themes, competency focus, personalized context
- Does the context reference Marco's profile (Barcelona relocation, etc.)?

## 3. Exam prep mode

- Create a new course, toggle to **"Exam preparation"**
- Pick DELE, set a date
- Generate
- Check at least one session is labeled "Mock Test" or "Strategy"

## 4. Session to lesson

- On a course detail, click **"Generate lesson"** on a session
- Verify LessonNew opens with objectives pre-filled
- Generate the lesson content
- Go back to course detail, verify session badge changed to "Draft" or "Ready"

## 5. Lesson editor

- Open the generated lesson
- Check **objectives summary** in the header (colored pills with grammar/vocab/skills)
- Check **learning target labels** on each content block
- Try the **grammar constraints** field in the generation panel

## 6. Warnings

- If any AI guardrail warnings appear on a course, verify you can dismiss them individually

## 7. Student profile completeness

- On CourseNew with a student selected, check the **StudentProfileSummary** card
- Verify it shows a completeness score based on filled profile fields

## 8. Session management

- On a course detail, try **adding** a session (+ Add session button)
- Try **removing** a session (delete icon)
- Try **dragging** to reorder sessions
- Verify the session numbers update correctly

---

*Sprint: Student-Aware Curriculum | Date: 2026-03-27*
