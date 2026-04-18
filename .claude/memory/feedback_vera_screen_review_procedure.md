---
name: Vera screen review procedure
description: How to run a Vera UI review session — steps, file locations, issue batching pattern
type: feedback
---

When doing a Vera screen review, follow this order:

1. **Connect Chrome** (`mcp__claude-in-chrome__tabs_context_mcp`, create tab if needed, navigate to `localhost:5173`)
2. **Read the Stitch mockup** for the screen: `plan/langteach-beta/stitch-design-system/<screen>/` — there's a screenshot PNG and a DESIGN.md
3. **Read the component code** — don't rely only on what the screen shows. What looks broken may be missing data, not a code gap. Always check the actual component logic before writing a finding.
4. **Screenshot and compare** side-by-side (Stitch PNG vs live screenshot)
5. **Write a behavior doc** at `plan/langteach-beta/scenarios-by-screen.vera/<screen>-behavior.md` with three sections: Quick Reference, Full Behavior, Test Scenarios. See existing dashboard doc as template.
6. **Update `plan/ui-redesign-feedback2.md`** with only actionable items — no "confirmed implemented" entries, no "what was working" sections.
7. **Create issues** in batches: seed data fixes separate from code fixes. Don't create issues for screens still to be reviewed.

**Why:** Reading code before writing findings avoids false positives (e.g. the hero countdown and briefing looked missing but were fully implemented — only invisible due to empty data). Robert's annotation: "look at the code not only what shows the screen."

**How to apply:** In every future Vera review session, after screenshotting, read the relevant component files before concluding something is broken.
