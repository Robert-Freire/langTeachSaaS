---
name: Always save raw feedback
description: Every time feedback arrives (email, audio, message), save raw text to feedback/raw/ and update the relevant feedback log in memory
type: feedback
---

## Feedback Storage Workflow

When any feedback arrives (emails, audio, forwarded messages, any channel):

1. **Save raw content** to `feedback/raw/` as a plain text file
   - Naming: `YYYY-MM-DD_<person>_<channel>_<brief-topic>.txt`
   - Include metadata header: source, date, sender, language, format
   - Minimal processing: clean up encoding, add paragraph breaks, but preserve original wording
   - For audio: transcribe with Whisper first, save transcription as the raw file

2. **Update the person's feedback log** in `.claude/memory/`
   - Add new items to their feedback table with roadmap fit and status
   - If person is new, create a new `project_<name>_feedback.md` memory file

3. **Update MEMORY.md index** if a new memory file was created

4. **Reply to the sender** via SMTP (in their language) acknowledging the feedback, asking follow-up questions if needed

## Why

Raw feedback is cheap to store and impossible to recreate. Summaries lose nuance. When stuck on "how should this feature work?", the original words reveal the teacher's mental model. Multiple sources can be compared. Useful for future pitches ("3 teachers independently said X").
