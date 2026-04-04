# MCP Exploration for LangTeach SaaS

**Date:** 2026-04-03
**Context:** Evaluating MCPs that could improve the dev workflow or be useful for company Copilot adoption research.

---

## 1. SQL Server MCP

**What it does:** Direct database queries, schema exploration, and data inspection as tool calls.

**Why it helps:**
- Currently we run `docker exec` + `sqlcmd` with MSYS path workarounds, slow and fragile
- Schema checks during task planning ("does this column exist?", "what FK relationships?")
- Data validation during QA ("did the seed data load correctly?")
- Debugging content generation issues by inspecting stored lessons/sessions

**Options:**
- `mcp-server-mssql` (community): https://github.com/topics/mcp-mssql
- Generic DB MCPs that support ODBC/JDBC connections
- Could point at the Docker SQL Server container (`localhost,1433`)

**Effort:** Low. Config-only, no code changes.

---

## 2. Copilot Cloud Agent MCP (already partially configured)

**What it does:** The repo already has Copilot cloud agent with GitHub and Playwright MCPs enabled by default (visible in repo settings > Copilot > Cloud agent).

**Why it helps:**
- Copilot can use GitHub MCP to read issues, PRs, code when assigned tasks
- Playwright MCP lets Copilot run browser-based validation
- You can add custom MCPs to extend what Copilot's agent can do (e.g., the SQL Server MCP above)

**Action:** Experiment by assigning a small task to Copilot from a GitHub issue and see how it performs with the existing MCPs.

**Effort:** Zero for existing MCPs. Low to add custom ones via the JSON config in repo settings.

---

## 3. Semantic Code Intelligence MCP

**What it does:** Exposes Language Server Protocol features (go-to-definition, find references, type info) as MCP tools.

**Why it helps:**
- "Find all implementations of `ILessonService`" (not just text matches)
- "What calls `GeneratePrompt()` through the interface?" (follows DI resolution)
- "Show the full type of this generic parameter"
- Better than grep for the C# backend with interfaces, DI, and inheritance
- Also useful for React component prop tracing

**Options:**
- Not many mature options yet; this is an emerging area
- Could potentially wrap OmniSharp (C#) or tsserver (TypeScript) as MCP servers

**Effort:** Medium-High. Would likely need custom development or waiting for community maturity.

---

## 4. Azure MCP

**What it does:** Interact with Azure resources (App Service, deployments, logs, configuration).

**Why it helps:**
- Check deployment status, app logs, configuration without switching to Azure Portal
- Verify that a deploy went through after merging to main
- Read application logs when debugging production issues
- Check App Service health, scaling, environment variables

**Options:**
- Microsoft has official Azure MCP tools in preview
- Could cover App Service, Azure SQL, Application Insights

**Effort:** Low-Medium. Microsoft is actively developing these.

---

## 5. Docker MCP

**What it does:** Manage Docker containers, images, logs, and compose stacks as tool calls.

**Why it helps:**
- We run the full e2e stack in Docker (frontend, backend, SQL Server)
- Start/stop/restart containers without long bash commands
- Read container logs directly
- Check container health and resource usage

**Options:**
- Community Docker MCP servers exist
- Could also just wrap `docker compose` commands

**Effort:** Low. Config-only.

---

## 6. Playwright MCP

**What it does:** Run browser automation, take screenshots, interact with web pages.

**Why it helps:**
- Already enabled in Copilot's cloud agent config
- Could also be added to Claude Code for visual testing
- Navigate the running app, take screenshots, verify UI state
- Supplement the existing `review-ui` agent workflow

**Options:**
- Official Playwright MCP (already in Copilot config)
- Can be added to Claude Code's MCP settings too

**Effort:** Low. Well-documented, officially supported.

---

## 7. Auth0 MCP

**What it does:** Manage Auth0 tenants, users, roles, and rules via tool calls.

**Why it helps:**
- Teacher/student user management during testing
- Check token configurations, role assignments
- Debug authentication issues without opening the Auth0 dashboard
- Verify test user setup for e2e tests

**Options:**
- Community Auth0 MCP servers (check availability)
- Could wrap the Auth0 Management API

**Effort:** Medium. Would need Auth0 Management API credentials configured.

---

## Priority Recommendation

| Priority | MCP | Value | Effort |
|----------|-----|-------|--------|
| 1 | SQL Server | High (daily use) | Low |
| 2 | Copilot Cloud Agent (experiment) | High (company eval) | Zero |
| 3 | Playwright | Medium (visual QA) | Low |
| 4 | Docker | Medium (convenience) | Low |
| 5 | Azure | Medium (deploy/logs) | Low-Medium |
| 6 | Auth0 | Low-Medium (occasional) | Medium |
| 7 | Semantic Code Intelligence | High (but immature) | High |

**Suggested first step:** Set up the SQL Server MCP and run a Copilot cloud agent experiment on a small task.
