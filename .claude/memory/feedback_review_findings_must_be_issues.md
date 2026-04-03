---
name: Review findings must become GitHub issues
description: Every sprint-close review finding (Isaac, prompt health, Teacher QA, UI) must be filed as a GitHub issue before the sprint closes
type: feedback
---

Every review finding with severity >= minor must be filed as a GitHub issue before the sprint closes. Markdown reports are not enough; findings without issues get lost.

**Why:** During Pedagogical Quality sprint close (2026-04-02), Isaac detected 4 findings. Only 1 was addressed; the other 3 were written to a markdown file but never filed as issues. They were discovered missing a week later.

**How to apply:** After sprint-close reviews (Stage 2), scan every reviewer's output. Batch related findings into themed issues. Assign to the next sprint milestone. Do not move to Stage 3 until all findings are filed. See `sprint-lifecycle.md` Stage 2b.
