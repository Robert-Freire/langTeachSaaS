---
name: Critically evaluate PR review comments
description: Never blindly fix PR review comments; assess validity against project context, conventions, and complexity before deciding to fix or decline
type: feedback
---

When handling PR review comments (CodeRabbit or otherwise), never apply suggestions blindly. For each comment:

1. **Assess validity**: Does the suggestion actually improve correctness, readability, or maintainability?
2. **Check context**: Does it contradict established project conventions or intentional design decisions?
3. **Evaluate complexity**: Does it over-engineer, add unnecessary abstraction, or reduce clarity?
4. **Decide**: Fix only what genuinely improves the code. Decline with a clear explanation when the suggestion is wrong, inapplicable, or counterproductive.

Reason: automated reviewers like CodeRabbit lack full project context. Blindly applying their suggestions can introduce unnecessary churn, contradict conventions, or over-engineer simple code. A thoughtful "no, because X" is better than a mindless fix.
