---
name: Email check and reply workflow
description: When asked to check email, read inbox via IMAP, analyze content, incorporate feedback into plans/memory, and reply directly via SMTP
type: feedback
---

## Email Workflow

When the user says "check email" or similar:

1. **Check inbox** for unseen messages via IMAP
2. **Read each email** (headers + body), decode attachments if present (PDF via pdfminer.six)
3. **Analyze the content** from a PM perspective: what's being said, how it maps to the roadmap, what's actionable
4. **Incorporate feedback** into project memory and/or plan files (update existing docs, don't just analyze verbally)
5. **Reply directly** to the sender via SMTP using the bot account
6. **Always CC robert.freire@gmail.com on every outgoing email** (replies, new threads, follow-ups, any email sent via the bot account)
7. Always use display name `"PM - LangTeach"` in the From header
8. Write replies in the same language the sender used (Spanish for Jordi, etc.)
9. Keep the PM tone: direct, professional, grounded in the vision doc and current roadmap

Do NOT just read and summarize to the user. Take action: update memory, reply to sender.
