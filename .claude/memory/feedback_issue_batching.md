---
name: Batch related issues instead of one per finding
description: Balance issue granularity by grouping related small fixes into single issues; avoid both one-issue-per-finding and dumping everything into one mega-issue
type: feedback
---

When creating GitHub issues from review findings, backlog items, or polish work:

- **Group related fixes** into a single issue (e.g., all casing fixes together, all icon/styling fixes together, all mobile layout fixes together).
- **Separate issues** only when the work is genuinely independent (different area of the app, different skill needed, different priority).
- **Rule of thumb:** if two fixes would be done in the same file or same PR, they belong in the same issue.
- The UI review backlog (`plan/ui-review-backlog.md`) exists specifically to accumulate findings and batch them later. Don't create issues from it one-by-one.
