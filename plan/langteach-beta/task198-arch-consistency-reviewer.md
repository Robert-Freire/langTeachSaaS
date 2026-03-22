# Task 198: Architectural Consistency Reviewer Agent

## Goal

Build an agent that runs alongside the existing `review` agent and checks for cross-codebase consistency violations: duplicated patterns, reinvented helpers, inconsistent conventions, and missing reuse of shared utilities.

## What's being built

A new file: `.claude/agents/architecture-reviewer.md`

This agent:
1. Takes the same diff as the `review` agent
2. For each changed/new file, searches the codebase for 3-5 similar files by name pattern, imports, or directory siblings
3. Compares how the new code implements patterns vs how the existing codebase does
4. Produces a structured consistency report

## Agent design

### Input
- The caller provides the branch to diff (defaults to current branch vs sprint branch or main)
- Optionally: a brief description of what changed

### Process
1. Determine base branch (sprint or main, same as review agent)
2. Get diff stat to identify changed/new files
3. Get full diff
4. For each changed file, identify its "type" (GitHub Action workflow, React component, backend endpoint, test file, service, etc.)
5. For each file type, run targeted searches to find similar files in the codebase
6. Read the similar files (3-5 max per changed file)
7. Compare: env var patterns, hook usage, error handling, DI registration, test helper usage, etc.
8. Produce the consistency report

### Findings categories
- **Inconsistency**: new code diverges from how existing code does the same thing
- **Duplication**: new code reimplements something that already exists
- **Missing reuse**: a shared utility/hook/helper exists for this pattern, not used
- **Convention break**: naming, file placement, DI registration, test structure differs from established pattern

### VITE env var regression test (PR #197)
The agent must catch: a new GitHub Action workflow that runs `npm run build` without the VITE_* env vars that the existing `frontend.yml` uses. This is the canonical example — the agent searches for similar workflow files and compares their `env:` sections.

### Scope (v1)
- GitHub Actions workflows (.github/workflows/*.yml): env vars, step patterns, trigger patterns
- React components (frontend/src/**/*.tsx): hook usage, loading/error states, component structure
- Backend API controllers/endpoints (backend/**/*Controller.cs): error handling, DI, response format
- Test files (*.test.tsx, *.Tests.cs, *.spec.ts): helper usage, setup/teardown, data namespacing

## Integration with task completion protocol

The agent runs **in parallel with** the `review` agent (step 4 of task completion protocol), not after it. Both produce separate reports. The architecture reviewer is a different lens (cross-codebase consistency vs code quality within the diff).

CLAUDE.md task completion protocol update: add step 4b after the `review` agent:
> 4b. Run the `architecture-reviewer` agent in parallel with or just after the `review` agent. If verdict is FAIL or NEEDS REVISION: fix the identified inconsistencies. If PASS: proceed.

## Files to create/modify

1. **Create**: `.claude/agents/architecture-reviewer.md` — the new agent
2. **Modify**: `CLAUDE.md` (project rules) — integrate into task completion protocol
3. **Modify**: `docs/dev-workflow.md` — document the new agent

## Acceptance criteria mapping

- [x] Agent can be invoked as a subagent → agent file in `.claude/agents/`
- [x] Reads diff and identifies similar files → process steps 2-5
- [x] Produces structured consistency report → findings categories + report format
- [x] Catches VITE env var scenario → GitHub Actions workflow comparison in scope
- [x] Integrated into task completion protocol → CLAUDE.md update

## Approach notes

The agent needs to be smart about searching — not just by filename but by:
- File extension patterns (*.yml in .github/workflows/ = CI workflow)
- Import patterns (importing from a specific module = similar pattern)
- Directory siblings (other files in the same folder follow the same conventions)

The key insight: for each new/changed file, search for files of the same "kind" and read them to establish what "normal" looks like in this codebase.
