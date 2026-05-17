# Issue Management

## Issue creation checklist

**Every issue must pass this checklist before creation. No exceptions.**

### Before writing the issue

1. **All decisions are made.** The issue body must not contain open choices ("A or B", "TBD", "consider X or Y", "Options:"). If a decision is needed, make it with the user first, then create the issue. An implementer should never have to choose between approaches.
2. **Scope is one concern.** If you're writing "also" or "additionally" for unrelated work, it's two issues.

### Required labels (set at creation time, not later)

| Label type | Rule |
|------------|------|
| Priority | Exactly one: `P0:blocker`, `P1:must`, `P2:should`, `P3:nice` |
| Area | At least one: `area:frontend`, `area:backend`, `area:e2e`, `area:infra`, `area:design`, `area:ai` |
| Size | One of: `size:XS`, `size:S`, `size:M`, `size:L`, `size:XL`. Estimate based on AC count and complexity. |
| qa:ready | Add only after verifying the checklist below passes. |

### Body quality gate

Before adding `qa:ready`, verify:

- [ ] **Problem statement**: 2+ sentences explaining what changes and why. Not a title restatement.
- [ ] **Acceptance criteria**: every AC is a `- [ ]` checkbox that is verifiable (pass/fail, not subjective).
- [ ] **No open decisions**: every "or" in the ACs is a red flag. Grep your own body for "or", "consider", "options", "TBD", "alternatively" before creating.
- [ ] **Milestone assigned**: every issue belongs to a milestone.
- [ ] **Out of scope section**: explicitly lists what this issue does NOT cover (prevents scope creep during implementation).
- [ ] **Stitch/design reference**: for `area:frontend` issues, include the path to the relevant Stitch design files.
- [ ] **Dependencies**: if this issue depends on another, state it explicitly.
- [ ] **Full-stack split**: if both `area:frontend` and `area:backend`, the body must justify why it's one issue (see "Full-stack issues" section below).

### UX-affecting issue body structure (REQUIRED for area:frontend / area:design)

Issues that read like a code shopping list ("change line 94 from X to Y") cause implementers to literally do those changes and stop. Two real examples from sprint `student-profile-voice-input`:

- **#951/#952** (truncation): issues named exact lines + exact CSS to change. Implementer changed exactly those. Missed the upstream JS slice in `sessionUtils.ts` that pre-baked `'...'` into the title data. Fix issued in #965.
- **#964** (voice trigger autostart): issue gave a complete recipe (add `autoStart` prop, hide chooser, add fallback link). Implementer did all three. Never asked "what does the user see while `getUserMedia` is pending?", which produced the blank-panel regression in #971.

In both cases, **all acceptance criteria passed but the user goal was broken**. The fix is not stricter ACs, it is reframing the body around the user's perception, with explicit negative space and mandatory in-browser verification.

For any issue with `area:frontend` or `area:design`, the body MUST include these sections, in this order:

1. **What the teacher experiences today**: current state from user POV (gestures, confusion, what they see and feel).
2. **What we want them to experience**: desired feel, flow, gestures, tempo. Use second person if it helps.
3. **What MUST NOT happen**: three or more bullets describing failure modes the user must never encounter. This is the negative-space contract that forces defensive thinking. Without it, edge cases get optimized away.
4. **Edge cases / states the implementer must handle**: pending, error, denied, empty data, first-time user, slow network, no mic. If you do not list them, they do not get handled.
5. **Where to start looking (the fix may extend further)**: files/components as investigation starting points, not "fix exactly here." Phrase as investigation, not prescription.
6. **Verification (in a real browser)**: `- [ ]` checklist of user gestures and expected results. Unit tests alone do NOT satisfy this section.

Anti-patterns to avoid:

- **Specific line numbers as the contract** ("Affected line: 94"). Line numbers rot, and they push the implementer to skip upstream investigation. Use them as starting points only, never as ACs.
- **Implementation prescriptions in ACs** ("Add an `autoStart?: boolean` prop", "AudioRecorder is now a forwardRef"). The user does not care. Replace with the user-facing outcome the change enables. If the architecture is contested, an "Implementation hint, not prescriptive" section can be present, but ACs stay user-facing.
- **Issue body listing only the happy path**. The implementer will only build the happy path.
- **Verification entirely in unit tests**. Unit tests mock the states real users hit (e.g., a resolved or rejected `getUserMedia` promise instead of a pending one). UX-affecting issues need browser verification.

### Specialist gates (check before adding qa:ready)

These replace the qa-ready agent's specialist checks. Only apply when the trigger matches.

**Data model and endpoint gate (trigger: issue adds or changes any of: API endpoint, DTO, entity, DB table/column, EF migration, foreign key, service interface, content type schema)**
- **Mandatory Sophy review before adding `qa:ready`.** Run the Sophy agent (`subagent_type: "sophy"`, model `opus`) on the full issue body plus the existing code the issue extends. Ask: "Is this issue well-specified enough for a bot to implement without producing sloppy code? Is it clear where new logic belongs and what the service/class boundaries are?"
- If Sophy returns NEEDS CLARIFICATION: rewrite the issue to address her findings, then re-run. Do not add `qa:ready` until she approves.
- Rationale: a sloppy issue (missing dispatcher pattern, wrong class named in the spec, ambiguous DI strategy) produces sloppy code that passes all ACs but creates debt. This is cheaper to fix in the issue than in a PR review. Example: #1257 was initially missing the `ITextExtractor` dispatcher spec -- a bot would have added an if/else inside the Azure Vision class.

**AI traceability gate (trigger: issue changes PromptService, prompt templates, exercise/content types, pedagogy config)**
- The ACs must include: `- [ ] After PR merge, update .claude/skills/teacher-qa/output/prior-findings.md with what changed`
- Without this, Teacher QA loses track of generation behavior changes.

**Frontend data availability gate (trigger: issue has `area:frontend`)**
- Check: do the fields referenced in the ACs actually exist in the API response? Grep the relevant DTO or API endpoint to confirm.
- If a field is missing from the backend, **STOP**. Do not create the issue with a frontend-only label. Either: (a) add `area:backend` and include the API change in scope, (b) create a prerequisite backend issue, or (c) ask the user. Never assume a field exists without checking.

**Visual test coverage gate (trigger: issue has `area:frontend`)**
- Check: does a `@visual` spec exist in `e2e/tests/visual/` for the affected route?
- Check: does `DemoSeeder.cs` create the data needed for that screen to render?
- If gaps exist, note them in the issue body under "Notes for implementation" so the implementer adds the spec. These are non-blocking for `qa:ready` but must be flagged.

**External infrastructure gate (trigger: issue introduces or uses a new Azure resource, third-party API, secret, config key in appsettings.json, or any runtime dependency on external infrastructure)**
- The issue body MUST include an "Infrastructure wiring" subsection answering, for every new external dependency it introduces:
  - (a) Is the resource provisioned in production (Azure / third-party)? If no, link the infra issue that provisions it (open one if needed).
  - (b) Is the secret added to `infra/required-secrets.json` and to `StartupConfigValidator` enforcement in `Program.cs`?
  - (c) Is the env var passed to the `api` service environment block in `docker-compose.qa.yml` AND `docker-compose.e2e.yml`?
  - (d) Is the placeholder added to `.env.qa.example` (and `.env.e2e.example` if it exists)?
  - (e) Does the code register a real implementation in dev/QA/e2e -- not a stub-as-only-implementation? Stubs may be a fallback when credentials are absent, but they MUST NOT be the only registered implementation in any environment that claims to test the feature.
- If any answer is incomplete, mark the issue `infra-pending` and add ACs covering the missing wiring. Do not add `qa:ready` until either (a) all five answers are concrete and verifiable, or (b) the infra work is explicitly scoped to a linked sibling issue that is also `qa:ready`.
- Rationale: features can ship passing tests while broken at runtime when the wiring contract is incomplete and a stub silently absorbs the gap. Examples that hit this pattern: #1237 (image upload, never had Vision provisioned -- #1280), #1257 (.docx upload, same Vision dependency), Whisper / Speech / Telegram (declared, validated in production, never wired to QA/e2e containers -- #1281). All were caught at sprint close by manual testing rather than by any automated check. This gate moves the catch to issue creation.

**XL size gate**
- Any issue sized XL must be explicitly approved by the user before adding `qa:ready`. Present the scope breakdown and ask: "This is XL. Should we split it, or is it good to go as one issue?" Do not proceed without confirmation.

### After creation

- Verify the issue appears on the project board (the sync workflow handles this, but check).
- If created during a PM session where decisions were made interactively, add `qa:ready` directly (no need to run the qa-ready agent). The PM conversation IS the quality gate.
- If created outside a PM session (backlog grooming, triage), run the `qa-ready` agent.

## Editing existing issues

- Before editing a `qa:ready` issue: check it's not assigned (stop if it is), remove `qa:ready`, make the edit, re-run the `qa-ready` agent, restore the label only if QA passes.

### Full-stack issues: split by default

When creating an issue that touches both frontend and backend, decide explicitly at creation time: **one issue or two?**

Split into two issues when:
- The frontend and backend work can be PR'd and reviewed independently
- A backend developer could implement the API without needing the UI to be done first
- The issue body lists distinct backend deliverables (endpoints, services, migrations) AND distinct frontend deliverables (components, pages, hooks)

Keep as one issue only when:
- The change is trivially atomic end-to-end (e.g., rename a field in the DTO and update the display label)
- Splitting would create a meaningless stub PR on one side

If kept as one, **the body must explicitly say why** (one sentence is enough). The qa-ready agent will flag any dual-area issue that does not justify itself.

## Adding issues to the project board

**Automatic sync (via GitHub Actions):** The `sync-board.yml` workflow fires on `milestoned`, `labeled`, `unlabeled`, `assigned`, `unassigned`, and `reopened` events. It adds the issue to the board and sets Status automatically:
- assigned -> In Progress
- `qa:ready` label (unassigned) -> Ready
- everything else -> Backlog

This requires the `GH_PROJECT_TOKEN` repository secret (classic PAT with `project` scope).

**Manual add (when workflow hasn't fired yet):** Every new issue must be added to the board with a status. **Never use `gh project item-add` directly** (leaves items in "No Status").

Use the helper script:
```bash
./scripts/add-to-board.sh <issue-url> [status]
```
Status values: `backlog` (default), `ready`, `in-progress`, `ready-to-test`, `done`

**Full milestone sync (fix drift):** If the board has drifted from the issue list, run:
```bash
./scripts/sync-board-milestone.sh "Adaptive Replanning"
```
Run this at sprint start and whenever you notice missing items.

## Labels

- **Priority** (mutually exclusive): `P0:blocker`, `P1:must`, `P2:should`, `P3:nice`
- **Area** (stackable): `area:frontend`, `area:backend`, `area:e2e`, `area:infra`, `area:design`, `area:ai`
- **Type**: `type:polish`, `type:tech-debt`
- **Workflow**: `qa:ready`, `demo-sprint`
- **Sprint**: `sprint:active` (deprecated, no longer added to new issues)

## Closing issues via PR

- PR body must include `Closes #N` for documentation, but **auto-close only works for PRs targeting `main`**. Sprint PRs will NOT auto-close.
- Apply appropriate area/type labels when creating issues.

## After PR is merged

Run the `task-merged` agent (pass the issue number). It closes the issue and moves it to "Ready to Test" on the board. Then call `ExitWorktree(action: "remove")`.

Never move issues to "Done" (user does sanity checks and moves manually).
