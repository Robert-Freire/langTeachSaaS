---
name: Review agent retired in favor of CodeRabbit
description: Pre-push code review agent dropped; CodeRabbit handles line-level review post-push
type: feedback
---

Do not run the `review` agent (subagent_type: "review") as part of the pre-push review sequence.

**Why:** CodeRabbit covers the same ground (line-level bugs, style, unused imports, null checks) with better PR-level context. Running both was redundant and slow.

**How to apply:** The mandatory pre-push reviewers are `architecture-reviewer` plus conditional reviewers (Sophy, Isaac, prompt-health). Line-level code quality findings come from CodeRabbit after the PR is opened and are addressed via follow-up commits. Started as a trial during the UI Redesign & Student Profile Polish sprint (2026-04-12).
