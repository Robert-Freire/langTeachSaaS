---
name: GitHub search milestone quoting
description: Always use wildcard syntax for multi-word milestone names in GitHub search queries; plain text with spaces breaks the query silently
type: feedback
---

When building GitHub search queries with multi-word milestone names (e.g. "Student-Aware Curriculum"), always use wildcard syntax:

```
milestone:*Student-Aware*
```

**Never** use unquoted multi-word values:
```
milestone:Student-Aware Curriculum   ← WRONG: "Curriculum" becomes a separate keyword, returns 0 results
```

Quoting with `"..."` inside a query string is also fragile depending on how the MCP tool serializes parameters. Wildcards are always safe and the MCP server instructions explicitly recommend them.

This applies to label filtering too: `label:*bug*` not `label:bug 🐛`.
