---
name: E2E stack coordination
description: Only one e2e Docker stack at a time; check before starting, notify user if busy, never tear down another agent's stack
type: feedback
---

The e2e stack (docker-compose.e2e.yml) uses mock auth and fixed ports. It can run alongside the dev stack (different compose, different ports), but two e2e stack instances cannot run at the same time.

**Rule:** Before starting the e2e stack (for e2e tests or review-ui), check `docker ps --filter "name=langteachsaas-e2e"`. If containers are running, stop and notify the user. Do not tear them down, do not retry, do not try alternate ports. Another agent owns them.

**Why:** Parallel e2e stacks cause port conflicts, resource contention (slow API causing skeleton screenshots), and auth mode conflicts (mock vs real Auth0). Automated coordination (locks, teardowns) leads to death loops or stale state. Human decision is the correct escalation.

**Also:** Screenshot scripts must wait for `.animate-pulse` selectors to disappear after `networkidle`, otherwise list pages show skeleton loading states instead of real content.
