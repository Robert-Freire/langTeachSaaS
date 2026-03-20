# UI Review Backlog

Non-blocking findings from review-ui runs. Periodically review this file and batch related items into polish GitHub issues.

---

### PR #128 (2026-03-20) — ContentParseError component

| Severity | Finding |
|----------|---------|
| Important | Teacher variant uses neutral colors (bg-zinc-50/border-zinc-200) that look like a normal info box. Should use warmer colors or a warning icon (AlertTriangle) since it signals broken content. |
| Important | Neither variant includes an icon. Add AlertTriangle for student, Info/AlertCircle for teacher for scannability. |
| Minor | Teacher message says "Try regenerating it from the Edit view" but teacher is in Preview tab. Should say "Switch to the Edit tab and regenerate this section." |
| Minor | Lesson editor header buttons (Draft, copy, delete, download, Generate) get cramped on mobile. |
