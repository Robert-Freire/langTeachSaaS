# Task 221: Add PR Template Checklist for New Secrets and Environment Variables

## Goal
Create `.github/PULL_REQUEST_TEMPLATE.md` with a checklist that surfaces config and infrastructure dependencies at PR review time.

## Acceptance Criteria
- [ ] PR template exists at `.github/PULL_REQUEST_TEMPLATE.md`
- [ ] Template includes a "Config & Infrastructure" checklist section
- [ ] Template pre-populates on every new PR in the repo
- [ ] Existing PR description fields (summary, test plan) are preserved

## Implementation Plan

### 1. Create `.github/PULL_REQUEST_TEMPLATE.md`

Sections:
- **Summary**: bullet points of what changed and why
- **Test Plan**: markdown checklist of how to verify
- **Config & Infrastructure** (new): checklist for new secrets/env vars, Bicep changes, API route changes
- **Closes**: issue reference

### 2. No other files to change

PR template is picked up automatically by GitHub for all new PRs.

## Out of Scope
- CI secret validation (tracked in #222/#223)
- Azure Container App rollback/alerting (tracked in #224)
