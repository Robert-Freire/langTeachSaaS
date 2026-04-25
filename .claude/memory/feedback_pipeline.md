---
name: Feedback intake pipeline
description: How to process incoming feedback from any channel. Save raw, log per-person, reply with summary, wait 4 days, then create issues, run /qa.
type: feedback
originSessionId: 16259888-ac9c-4212-80e1-8b4865a397c7
---
## Inbound (any channel: email, audio, message)
1. Save raw text to `feedback/raw/YYYY-MM-DD_<person>_<channel>_<topic>.txt`
2. Update the person's feedback log memory file (create one if new person)
3. Reply with summary + planned issues (high-level description, not yet created), ask for confirmation/correction
4. Set a 4-day reminder
5. **Do NOT create GitHub issues yet**
6. After 4 days: incorporate any reply, then create issues; run `/qa` on them

**Why:** Avoids acting on misunderstood feedback and gives the person a chance to correct or add context before we commit to specific issues.

## Email-specific
- IMAP for inbox, SMTP for replies
- CC robert.freire@gmail.com on outgoing
- Display name "PM - LangTeach"
- Reply in sender's language
- Keep thread discipline (In-Reply-To headers)
- Check inbox before sending (avoid crossing wires)
- Move processed emails to "Processed" IMAP folder
