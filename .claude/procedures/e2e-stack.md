# E2E Stack Coordination

The e2e stack (`docker-compose.e2e.yml`) uses mock auth and fixed ports. It can run alongside the dev stack but **only one e2e stack instance at a time.**

This procedure applies when YOU (the agent) start the e2e stack directly (e.g., running e2e tests, Playwright). It does **NOT** apply when launching the `review-ui` agent, which manages its own stack.

## Before starting

Check if e2e containers are already running:
```bash
docker ps --filter "name=langteachsaas-e2e" --format "{{.Names}}"
```
- **Running:** STOP. Do not tear them down. Start a 5-minute cron checking `docker ps --filter "name=langteachsaas-e2e"`. When containers are gone, delete the cron and notify the user.
- **Not running:** proceed.

## Start the stack

```bash
docker compose -f docker-compose.e2e.yml --env-file .env.e2e --profile test up --build --exit-code-from playwright
```

## Tear down when done

```bash
docker compose -f docker-compose.e2e.yml --env-file .env.e2e down -v
```
