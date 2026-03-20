---
name: Verify project board after sprint prep
description: After preparing a sprint, always verify the GitHub project board matches expectations (correct columns, priorities, all items visible)
type: feedback
---

After preparing a sprint (updating priorities, adding qa:ready, assigning milestones), always verify the project board state before declaring ready:

1. Fetch the project items: `gh project item-list 2 --owner Robert-Freire --format json`
2. Check every sprint issue is present and in the correct status column (Ready, not Backlog or No Status)
3. Check deferred/non-sprint items are NOT in Ready
4. Verify priority labels on items match what was set on the issues

Don't trust that `gh issue edit` or `gh project item-add` worked. Verify the final state. This has been missed before, causing mismatches between issue labels and board display.
