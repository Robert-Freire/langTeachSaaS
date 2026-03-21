---
name: Email processing workflow
description: After processing a feedback email, move it to Processed folder, save raw text, update feedback logs, and create/update GitHub issues
type: feedback
---

When processing an incoming email (especially feedback from Jordi or teachers):

1. **Save raw content** to `feedback/raw/YYYY-MM-DD-<source>-<description>.txt`
2. **Update the person's feedback log** in `.claude/memory/` (e.g., `project_jordi_feedback_log.md`)
3. **Create or update GitHub issues** for actionable items. Don't lose data: if it maps to an existing issue, add context there. If it's new, create an issue with the right milestone/labels.
4. **Reply** acknowledging the feedback and answering/re-asking any pending questions
5. **Move the email to the "Processed" IMAP folder** so we can track what's been acted on vs. what hasn't
   - Use: `curl ... --request 'COPY <msgnum> Processed'` on the All Mail folder
   - The "Processed" label/folder exists in Gmail as of 2026-03-21

Unprocessed emails remain in their original location (Inbox or All Mail without the Processed label).
