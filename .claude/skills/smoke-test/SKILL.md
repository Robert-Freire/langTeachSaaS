---
name: smoke-test
description: "Sprint Stage 0B smoke test. Starts the visual stack if needed, generates a context-aware prompt from the sprint story + appendix, and launches `claude --chrome` with that prompt so no copy-paste is needed. The chrome session does the actual walkthrough and reports results back."
model: claude-opus-4-6
---

# Sprint Smoke Test — Launcher

You prepare and launch the Stage 0B smoke test. Your job is to:
1. Get the stack running
2. Build the exact prompt the chrome session needs
3. Launch it with one command

The chrome session does the actual walking and reporting. You do not do the walkthrough yourself.

---

## Step 1: Detect sprint slug

```bash
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "$BRANCH"
```

Slug = everything after `sprint/`. Sprint story = `plan/sprints/<slug>.md`.

If no story file exists, stop and tell the user.

---

## Step 2: Read the sprint story

Read `plan/sprints/<slug>.md`. You need the full content: teacher narrative, appendix scenarios, and the "What we are NOT building" section.

---

## Step 3: Check and start the visual stack

```bash
docker ps --filter "name=langteachsaas-e2e" --format "{{.Names}}\t{{.Status}}"
```

If api + frontend are not healthy, start the stack using the script (handles build, health checks, mock teacher registration, and visual seed):

```bash
bash e2e/scripts/start-visual-stack.sh
```

Note whether you started the stack or it was already running (affects teardown at the end).

---

## Step 4: Build the chrome session prompt

Construct the prompt below. Insert the actual sprint story content into the `<sprint-story>` block — do not reference the file path, paste the actual text.

```
You are running Stage 0B of the sprint close smoke test for LangTeach.

The app is running at http://localhost:5174 with mock auth — no login needed, just navigate directly.
API is at http://localhost:5178. Use Authorization: Bearer test-token for any direct API calls.

<sprint-story>
[PASTE FULL CONTENTS OF plan/sprints/<slug>.md HERE]
</sprint-story>

Your task:
1. Walk every scenario in "The teacher's story" section as a teacher would. Navigate the app, interact with the UI, verify the behaviour described.
2. Walk every scenario in "## Smoke Test Appendix" the same way.
3. For any scenario requiring data that does not exist yet, create it via the API using Bearer test-token.
4. While walking scenarios, note anything that looks broken, confusing, or improvable but is unrelated to the scenario. Collect these as "Observations".

## Result states (use exactly these)

- **PASS** -- the scenario's end-to-end behavior was directly observed in the browser. The user-facing outcome described in the scenario was produced by the real pipeline.
- **FAIL** -- the scenario was exercised end-to-end and the user-facing outcome did not match the description.
- **UNVERIFIED** -- you were UNABLE to exercise the scenario end-to-end with the harness available to you. Examples: file upload blocked by browser sandbox, voice recording requires a real microphone, file picker dialog cannot be driven, OS-native print dialog appears. UNVERIFIED is NOT a pass. Do NOT write `PASS(partial)`, `PASS(UI)`, `PASS(button visible)`, or `PASS(API responds)` as a substitute. If you cannot drive the full scenario as a teacher would, the result is UNVERIFIED with a one-line reason.
- **PASS(scope)** -- the screen or behavior tested is genuinely out of scope per the issue AC. ONLY use this after confirming via `gh issue view <N>` that the AC does not actually include the surface you tested. NOT a substitute for UNVERIFIED.

UNVERIFIED scenarios are not failures, but they are also not passes. They surface as an explicit "needs human verify before sprint close" list that the operator must address before the sprint can close. They are the most important thing you can find -- a scenario that is impossible to verify with the available harness is exactly the kind of gap that hides shipped-but-broken features.

For voice-recording scenarios specifically: navigate to the screen, verify the voice recorder button exists and clicking it opens the recording UI. Result: UNVERIFIED (audio flow requires real microphone). Do NOT mark these PASS.

For file-upload scenarios specifically: attempt the real upload. If the browser sandbox or chrome extension blocks the file picker or drag-drop, the result is UNVERIFIED (chrome harness cannot drive native file picker). Do NOT mark these PASS based on the button existing or the API endpoint responding to a non-file POST. The scenario asks for "teacher uploads X and Y appears" -- if you cannot upload, you cannot verify.

Before marking any scenario FAIL:
- Check the original GitHub issue AC (`gh issue view <N>`). If the screen you tested is out of scope per the AC, record PASS(scope) with a one-line scope note.
- If the FAIL is a design system violation, check docs/design-system.md and quote the rule. Do not infer DS conventions.

At the end, output:
1. A result table: | Scenario | Source | Result | Notes |
2. A list of Observations to log (format: | #smoke-<slug> | <date> | <severity> | <description> |)
3. Any FAILs that survived both guards, with a one-line description of what to fix.
4. **A separate UNVERIFIED list** with one row per unverifiable scenario: | Scenario | Why unverifiable | Suggested human-verify path |. Do NOT bury UNVERIFIED items in the main table notes or in Observations -- they get their own list so the operator cannot miss them.

Keep the final report under 800 words.
```

---

## Step 5: Launch the chrome session

Write the prompt to a temp file and launch:

```bash
SLUG=$(git rev-parse --abbrev-ref HEAD | sed 's|sprint/||')
PROMPT_FILE="/tmp/smoke-test-${SLUG}.txt"

# Write the prompt (with story content already inserted) to the temp file
cat > "$PROMPT_FILE" << 'PROMPT_EOF'
<GENERATED PROMPT FROM STEP 4 — with story content inlined>
PROMPT_EOF

echo "Launching claude --chrome with smoke test prompt..."
echo "Prompt saved to: $PROMPT_FILE"
echo ""
echo "Run this command in your terminal:"
echo "  claude --chrome \"\$(cat $PROMPT_FILE)\""
```

**Important:** `claude --chrome` needs to be launched in the user's terminal, not via Bash here (it requires a TTY and interactive session). Write the generated prompt to the temp file, then tell the user the exact command to run — one line, nothing to construct manually.

Tell the user:
- The stack is running at http://localhost:5174
- Their command to copy: `claude --chrome "$(cat /tmp/smoke-test-<slug>.txt)"`
- To paste the chrome session's result table back here when done

---

## Step 6: After results come back

When the user pastes the chrome session output back:

1. Parse the result table AND the separate UNVERIFIED list.
2. Append all Observations to `plan/observed-issues.md` (read it first, append only).
3. Present any FAILs to the user with a clear description and ask: fix now or accept?
4. **Present every UNVERIFIED row to the user as an explicit human-verify checklist.** Each row must be resolved before Stage 0B is complete -- by one of:
   - (a) the user runs the manual verify and reports PASS / FAIL back here
   - (b) the user explicitly waives the scenario with a recorded rationale (logged to `plan/observed-issues.md` so the waiver is auditable)
   - (c) a follow-up issue is opened to add an automated check the harness CAN drive (e.g. a Playwright spec that bypasses the file-picker sandbox via `setInputFiles`), and the scenario is rerun under that automation
   UNVERIFIED rows MUST NOT silently roll into PASS just because the user did not respond. If the user is unresponsive or wants to defer, the waiver path (b) is the only acceptable bypass and must be explicit.
5. If the user chooses "fix now" on a FAIL, follow the worktree workflow to open a fix issue and implement it, then re-run that scenario only.
6. Once all FAILs are resolved or accepted AND all UNVERIFIED rows are either human-verified or waived, confirm Stage 0B is complete and the sprint can proceed to Stage 1.

---

## Step 7: Stack teardown

Only if you started the stack in Step 3:

```bash
docker compose -f docker-compose.e2e.yml -f docker-compose.visual.yml --env-file .env.e2e down -v
```

If the stack was already running when you arrived, leave it alone.
