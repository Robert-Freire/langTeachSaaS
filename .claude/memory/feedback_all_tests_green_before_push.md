---
name: All tests must pass before pushing
description: Never push code changes unless all e2e tests pass (all green). Only exception is non-code pushes like memory or documentation files.
type: feedback
---

Before any push of code changes, run the full e2e test suite and confirm all tests pass (all green). No exceptions for code changes.

The only pushes allowed without all-green tests are non-code changes (memory files, documentation, plan files).

If tests fail, investigate and fix them before pushing, even if the failures appear pre-existing or unrelated to the current changes.
