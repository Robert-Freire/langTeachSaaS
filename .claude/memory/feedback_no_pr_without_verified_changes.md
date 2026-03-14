---
name: No PR without verified changes
description: Never open a PR for code changes without writing tests and confirming they pass; a successful build alone is not sufficient
type: feedback
---

Never open a PR without:
1. Writing tests that cover the changed behavior (unit tests at minimum for UI changes)
2. Running those tests and confirming they pass

A successful `npm run build` / `dotnet build` is a type-check, not a correctness check. Always verify the actual behavior works via tests before pushing.
