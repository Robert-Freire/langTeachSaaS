---
name: LangTeach SaaS — Project Overview
description: What this project is, the stack, the goal, and development phases
type: project
---

## What it is
B2B SaaS tool for independent language teachers. Core value: structured lesson planning workspace with AI-assisted content generation (not just raw AI — the workflow is the differentiator). Teachers create lessons, attach student profiles, generate content per section, and export.

## Stack
- Frontend: React + TypeScript (Vite), hosted on Azure Static Web Apps
- Backend: C# / .NET 9 Web API, hosted on Azure App Service
- Database: Azure SQL (EF Core)
- Auth: Auth0 (free tier, supports Google OAuth)
- AI: Claude API (Anthropic) — called directly from backend, NOT Azure OpenAI
- Infra-as-code: Azure Bicep (infra/ directory)
- Containers: Docker / docker-compose for local dev

## Monetization
- Free: 25 AI generations/month, 10 lessons, no PDF export
- Solo ($19/mo): 200 generations/month, unlimited lessons, PDF export
- Pro ($39/mo): 1000 generations/month + priority support

## Development Phases
- Phase 1 (Weeks 1-3): Foundation — auth, teacher profile, student profiles, lesson CRUD, templates
- Phase 2 (Weeks 4-6): AI Core — Claude client, prompt service, caching, generation endpoints, streaming SSE, lesson editor UI, usage tracking
- Phase 3 (Weeks 7-8): Library & Export — content library, PDF export, shareable links
- Phase 4 (Weeks 9-10): Monetization & Launch — Stripe, free-tier enforcement, onboarding

## Key files
- Requirements: C:\ws\PersonalOS\03_Workspace\langTeachSaaS\requirements-v1.md
- Competitor analysis: C:\ws\PersonalOS\03_Workspace\langTeachSaaS\competitor-analysis.md
