# Worktree Workflow: Plan Review Details

Detail for step 4 of the Worktree-First Workflow in `.claude/CLAUDE.md`.

## Revision flow

After running the `review-plan` agent:

- If **NEEDS REVISION**: critically evaluate findings. Fix valid ones. Note disagreements in the plan.
- Escalate to user only after **2 failed rounds** on architectural disagreements.
- Once approved, proceed to implementation. Do NOT ask the user for plan approval.

## Infrastructure gap rule

If the plan or review reveals that the existing API/backend cannot fulfill an acceptance criterion (missing endpoint, missing field, unsupported operation), **STOP and ask the user**. Do not invent frontend workarounds for backend gaps.

Present the options:
- (a) descope the criterion
- (b) create a prerequisite backend issue
- (c) get explicit approval for the workaround approach

## Architectural decision rule

If the plan requires choosing a technology, vendor, external service, or architectural approach that the issue does not explicitly specify, **STOP and ask the user**. Do not pick a vendor or service on your own (e.g., OpenAI vs Azure, picking a library, selecting a cloud service).

Present the options with tradeoffs and let the user decide.
