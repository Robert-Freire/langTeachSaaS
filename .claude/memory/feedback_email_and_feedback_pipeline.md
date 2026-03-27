---
name: Email and feedback processing pipeline
description: Full workflow for checking email, processing feedback from any channel, saving raw text, replying, and creating issues
type: feedback
---

## Inbound (any channel: email, audio, message)

1. Save raw text to `feedback/raw/YYYY-MM-DD_<person>_<channel>_<topic>.txt`
2. Update the person's feedback log memory file (create one if new person)
3. Create/update GitHub issues from actionable items

## Email-specific

- Check inbox via IMAP, reply via SMTP
- CC robert.freire@gmail.com on all outgoing
- Use "PM - LangTeach" display name
- Reply in sender's language
- Keep thread discipline (In-Reply-To headers)
- Check inbox before sending (avoid crossing wires)
- Move processed emails to "Processed" IMAP folder

## After processing

- Reply with summary + planned issues, wait 4 days for corrections before creating issues (from feedback_reply_before_acting)
- Run /qa on newly created issues
