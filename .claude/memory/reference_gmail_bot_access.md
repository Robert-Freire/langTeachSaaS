---
name: Gmail bot account access
description: IMAP/SMTP credentials for robert.freire.bot@gmail.com, used to check, read, and send emails on behalf of the user
type: reference
---

## Gmail Bot Account

- **Email:** robert.freire.bot@gmail.com
- **App password (Claude IMAP):** btqgczsfjyxmekjx
- **IMAP (read):** imaps://imap.gmail.com:993
- **SMTP (send):** smtp://smtp.gmail.com:587 (STARTTLS)

## How to read emails

```bash
# Check for unseen emails
curl -s --url "imaps://imap.gmail.com:993/INBOX" --user "robert.freire.bot@gmail.com:btqgczsfjyxmekjx" --request "SEARCH UNSEEN"

# Fetch headers of recent emails (adjust range as needed)
curl -s --url "imaps://imap.gmail.com:993/INBOX" --user "robert.freire.bot@gmail.com:btqgczsfjyxmekjx" --request "FETCH 455:465 (BODY[HEADER.FIELDS (FROM SUBJECT DATE))"

# Fetch full email body by message number
curl -s --url "imaps://imap.gmail.com:993/INBOX/;UID=<N>" --user "robert.freire.bot@gmail.com:btqgczsfjyxmekjx"
```

## How to send emails

```bash
curl -s --url "smtp://smtp.gmail.com:587" \
  --mail-from "robert.freire.bot@gmail.com" \
  --mail-rcpt "RECIPIENT@example.com" \
  --user "robert.freire.bot@gmail.com:btqgczsfjyxmekjx" \
  --ssl-reqd \
  -T - <<'EOF'
From: "PM - LangTeach" <robert.freire.bot@gmail.com>
To: RECIPIENT@example.com
Subject: Subject here
Content-Type: text/plain; charset="UTF-8"

Body here.
EOF
```

## Reading PDF attachments

- Extract base64 block from IMAP FETCH output, decode with `base64 -d`, save to file
- Use `pdfminer.six` (installed) for text extraction: `from pdfminer.high_level import extract_text`
- Use Windows paths for Python (`C:\Users\Robert\...`), Unix paths for bash (`/tmp/...`)

## Notes

- GitHub notifications are filtered to skip inbox (archived under "GitHub" label) as of 2026-03-19
- Inbox had ~465 unread messages (mostly GitHub notifications) at setup time
- App password "pm-LangTeach" also exists but the working one is "Claude IMAP"
- Same app password works for both IMAP and SMTP
