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

### PR #130 (2026-03-20) — Regeneration workflow redesign

| Severity | Finding |
|----------|---------|
| Important | ContentBlock "Regenerate" button uses variant="ghost" which looks like a text label at rest. Consider variant="outline" or adding a sparkle icon for better affordance. |
| Minor | Replace indicator uses bg-amber-50 which barely contrasts with the panel's bg-indigo-50 background. Consider bg-amber-100 for stronger differentiation. |
| Minor | "Regenerate" vs "Generate" vocabulary difference between block-level and section-level buttons could confuse users. Both open the same panel. |
| Minor | Direction textarea has maxLength={200} but no character count indicator. A subtle "42/200" counter would help users. |
| Minor | GeneratePanel "Close" text link uses text-zinc-400 which is low contrast. Consider text-zinc-500. |
