---
name: Always add new issues to the GitHub project board
description: When creating GitHub issues, always add them to the project board immediately after creation
type: feedback
---

Every new GitHub issue must be added to the project board right after creation:

```bash
gh project item-add 2 --owner Robert-Freire --url <issue-url>
```

This has been forgotten multiple times. Do it as part of issue creation, not as a separate step.
