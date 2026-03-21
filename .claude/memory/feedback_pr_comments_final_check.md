---
name: Always verify no open PR comments before declaring done
description: Check full conversation depth on PR comments, not just whether a top-level comment has one reply. CodeRabbit counter-replies to dismissals.
type: feedback
---

Before declaring a PR fully reviewed/resolved:

1. Fetch ALL current comments: `gh api repos/{owner}/{repo}/pulls/{pr}/comments`
2. For each CodeRabbit comment thread, check the **full conversation depth**, not just whether the top-level comment has a reply. CodeRabbit often counter-replies to our responses with new concerns or evidence. A thread is only resolved when the last message in the chain is ours (or the bot's reply agrees/acknowledges).
3. Specifically: if CodeRabbit replied to our reply, that counter-reply may contain a valid concern. Read it, evaluate it, and respond or fix.
4. Only then confirm everything is addressed.

**Why this matters:** A jq query that checks "has a reply = done" misses conversation depth. In PR #168, CodeRabbit counter-replied to a dismissal with proof that the issue was real (verified QueryClient config, confirmed a race condition). The monitoring logic counted "has reply" and moved on, missing the valid follow-up.

Reason: CodeRabbit posts new comments after each push AND replies to our responses within existing threads. Never assume a single reply closes a thread.
