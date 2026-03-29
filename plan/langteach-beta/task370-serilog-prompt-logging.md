# Task 370: Fix Serilog prompt logging env var namespace

## Problem

`docker-compose.qa.yml` and `docker-compose.e2e.yml` set:
```
Logging__LogLevel__LangTeach.Api.AI: Debug
```

This targets the Microsoft logging provider. The app uses Serilog (`Program.cs:32-33`), which reads from the `Serilog` config section and silently ignores `Logging__*` overrides.

## Fix

Replace in both compose files:
```
Serilog__MinimumLevel__Override__LangTeach.Api.AI: Debug
```

## Files changed

- `docker-compose.qa.yml` line 50
- `docker-compose.e2e.yml` line 52

## Verification

Run QA stack, generate one content block, confirm `PromptSystem` and `PromptUser` log lines appear in `docker compose logs api`.
