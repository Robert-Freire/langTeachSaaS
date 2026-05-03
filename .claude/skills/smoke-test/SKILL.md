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

If api + frontend are not healthy, start the stack:

```bash
docker compose -f docker-compose.e2e.yml -f docker-compose.visual.yml --env-file .env.e2e up -d api sqlserver frontend 2>&1
```

Poll until healthy (max 90s):

```bash
for i in $(seq 1 18); do
  HEALTHY=$(docker ps --filter "name=langteachsaas-e2e" --format "{{.Status}}" | grep -c "healthy" || true)
  echo "[$i/18] healthy containers: $HEALTHY"
  [ "$HEALTHY" -ge 3 ] && break
  sleep 5
done
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
3. For scenarios involving voice recording: you cannot submit real audio, so navigate to the relevant screen, verify the voice recorder button exists and clicking it opens the recording UI. Mark these as PASS(UI) to indicate the UI is correct but audio flow was not tested end-to-end.
4. For any scenario requiring data that does not exist yet, create it via the API using Bearer test-token.
5. While walking scenarios, note anything that looks broken, confusing, or improvable but is unrelated to the scenario. Collect these as "Observations".

Before marking any scenario FAIL:
- Check the original GitHub issue AC (search for the issue number in the scenario). If the screen you tested is out of scope per the AC, record PASS with a scope note instead.
- If the FAIL is a design system violation, check docs/design-system.md and quote the rule. Do not infer DS conventions.

At the end, output:
1. A result table: | Scenario | Source | Result | Notes |
2. A list of Observations to log (format: | #smoke-<slug> | <date> | <severity> | <description> |)
3. Any FAILs that survived both guards, with a one-line description of what to fix.

Keep the final report under 600 words.
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

1. Parse the result table.
2. Append all Observations to `plan/observed-issues.md` (read it first, append only).
3. Present any FAILs to the user with a clear description and ask: fix now or accept?
4. If the user chooses "fix now", follow the worktree workflow to open a fix issue and implement it, then re-run that scenario only.
5. Once all FAILs are resolved or accepted, confirm Stage 0B is complete and the sprint can proceed to Stage 1.

---

## Step 7: Stack teardown

Only if you started the stack in Step 3:

```bash
docker compose -f docker-compose.e2e.yml -f docker-compose.visual.yml --env-file .env.e2e down -v
```

If the stack was already running when you arrived, leave it alone.
