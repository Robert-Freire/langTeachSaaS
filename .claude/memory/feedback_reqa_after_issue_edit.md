---
name: Re-run QA after editing a qa:ready issue
description: Any time a qa:ready issue body is edited, immediately re-run QA and verify no implementation has started
type: feedback
---

If you need to edit the body of a GitHub issue that already has the `qa:ready` label:

1. **Check implementation status first**: `gh issue view <N> --json assignees` — if the issue is assigned, stop and notify the user instead of editing, as implementation may already be in progress.
2. **Remove `qa:ready` before editing**: `gh issue edit <N> --remove-label "qa:ready"` — do this before making any body changes so a failed or incomplete edit never leaves the issue with a stale qa:ready flag.
3. **Make the body edit.**
4. **Re-run QA after the edit**: launch a QA agent to re-verify the issue meets all QA criteria.
5. **Restore `qa:ready` only if QA passes**: `gh issue edit <N> --add-label "qa:ready"`.

Reason: issue edits can inadvertently change scope, introduce conflicting ACs, or add out-of-scope items that make the issue ambiguous. The qa:ready label must reflect the current body, not the original.
