# Task 202: Teacher QA Triage Workflow + First Full QA Run

## Goal

Establish the triage workflow for Teacher QA findings, then execute the first full run across all 5 personas and triage with Robert.

## Deliverables

1. `plan/teacher-qa-agent/triage-workflow.md` — documented triage categories and actions
2. `type:ai-quality` GitHub label
3. `plan/teacher-qa-agent/jordi-questions.md` — batching format for Jordi questions
4. First full QA run output (all 5 personas)
5. Triage session with Robert: categorize each finding, file issues as appropriate

## Steps

### Step 1: Documentation (no blockers)
- [x] Write `plan/teacher-qa-agent/triage-workflow.md`
- [x] Create `type:ai-quality` GitHub label
- [x] Write `plan/teacher-qa-agent/jordi-questions.md` with batching format

### Step 2: QA Run (requires onboarding wizard completed)
- Prerequisite: QA user onboarding wizard must be completed manually (see SKILL.md)
- Run `/teacher-qa full` (or `Agent tool with subagent_type: teacher-qa`)
- Collect findings from all 5 personas

### Step 3: Triage with Robert
- Present all findings organized by category
- Robert decides: bug / content quality / gap / suggestion / ask-jordi
- File GitHub issues for bugs and content quality findings
- Batch any Jordi questions into jordi-questions.md

## Notes
- This task produces files, not code changes — no pre-push checks needed
- PR targets sprint branch as usual for any file changes
- The QA run itself produces output in `.claude/skills/teacher-qa/output/`
