# Sprint: Student Profile Voice Input

## The teacher's story

Jordi finishes a trial lesson with a new student. He's still at his desk, the student just left. He clicks "New student via voice," presses record, and speaks for 20 seconds: "Maria, 34 años, arquitecta, de Barcelona. Catalán como lengua materna, nivel B1 de inglés aproximadamente. Quiere mejorar para presentaciones en el trabajo."

He stops the recording. A drawer slides open. It shows what the system heard: name, age, profession, city, native language, level, reason for studying. He glances at it — it looks right — and presses "Create student." Done. No form, no typing.

Two hours later he finishes a session with Ana. He opens her profile, presses "Update via voice," and records: "Ha mejorado mucho con el subjuntivo. Añade como objetivo pasar el DELE B2 en junio. Me ha dicho que tiene una presentación importante en abril — apuntar para próximas clases."

The drawer opens: CEFR reassessment, a new short-term objective with a June target date, a new "ideas para próximas clases" entry. He removes the CEFR row — he's not sure yet — and saves the other two. The profile updates instantly.

Meanwhile on the session screen, when he uses the existing voice recorder after class, the fields that got filled in now flash briefly with an indigo ring so he can see at a glance what the AI wrote. And there's a small strip at the top: "4 fields filled from recording." If something looks wrong he taps "Undo extraction" and all four fields snap back to blank.

He doesn't have to think about any of this. It just works.

## What changes for Jordi

**Before this sprint:** Creating a student means filling out a long form. Updating a student profile means navigating to Edit and manually typing changes after each session. After a voice recording in the session screen, fields appear but there is no feedback about what changed.

**After this sprint:** Student data flows from voice to profile in seconds. A confirmation drawer shows what the AI extracted before anything is saved. The session screen voice recorder shows what it filled in and lets him undo in one tap.

## What this sprint delivers

**Voice to student profile**
- Record button on student detail page: "Update via voice" extracts profile fields and shows a confirmation drawer
- Record button on student list page: "New student via voice" extracts fields and creates a new student record
- Shared confirmation drawer component with CHANGED / ADDED / NEW row types, inline edit, and remove per row
- Drawer uses Academic Atelier glassmorphism, no-line rule, append-with-dedup merge strategy for lists
- Backend: new `POST /api/students/extract-profile` endpoint, `IStudentProfileExtractionService`, conservative extraction prompt

**Session screen voice feedback**
- Brief indigo highlight on the 9 fields changed by extraction (fades out automatically)
- Dismissible "N fields filled from recording" strip with "Undo extraction" button
- Undo reverts extracted values but preserves fields manually edited after extraction

**Companion fixes in this sprint**
- #605 AudioRecorder double-click guard + VoiceNote MaxLength constraints
- #929 Null entries in tag arrays — API-level validation
- #931 TeacherFollowup status/kind validation unification
- #927 Settings page DS compliance (CTA label, toggle pill chips)
- #928 Edit full session link — ghost button style on expanded session row
- #940 QA seeder Sprint Tester upgrade

## Smoke Test Appendix

Issues merged into this sprint that are not exercised by the main story walkthrough. Each needs a pass/fail check before sprint close.

**A1. Session extraction: whatWasCovered is populated (#983, #986)**

Open a session for an existing student. Use the voice recorder to record a short post-class note (e.g., "Today we worked on the present perfect and reviewed vocabulary for travel."). After extraction completes, verify the "What Was Covered" field is populated. It must not be blank or null even for short recordings.

**A2. LastSessionCard: title not truncated by JS, title is clickable (#951, #965, #966, #967)**

On a student detail page, find the Last Session card. Verify the session title is not cut off with a literal "..." appended by JavaScript. Click the session title. Verify it navigates to the session screen (same behaviour as clicking the title in the compact session list).

**A3. Compact session rows: 2-line titles, clickable (#952)**

On a student detail page, in the session history list, find a session with a long title. Verify the row displays up to 2 lines of title rather than clipping to one. Click anywhere on the row. Verify it navigates to the session screen.

**A4. Settings page: CTA label and toggle pill chips (#927)**

Open the Settings page. Verify the save/update CTA button uses the correct DS label. Verify toggle controls render as pill chips (not plain checkboxes or other non-DS controls).

**A5. Expanded session row: Edit full session is a ghost button (#928)**

On the session history list on a student detail page, expand a session row. Verify the "Edit full session" link renders as a ghost button (outlined, no fill), not as a plain text link or a filled button.

**A6. AudioRecorder double-click guard (#605)**

On any screen with a voice recorder, click the record button twice quickly. Verify only one recording starts (no duplicate recorder state, no UI glitch).

---

## What we are NOT building

- Chat interface for student data (future sprint)
- Voice recording on the lesson editor or course screens
- Any changes to the session reflection extraction logic (that's a separate service)
- Student portal or student-facing features
- Automatic save without teacher confirmation (the drawer is always required)
