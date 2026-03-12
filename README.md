# LangTeach SaaS

Language teaching platform built with React + .NET.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8, TanStack Query, React Router
- **Backend**: .NET 9 Web API, Entity Framework Core, SQL Server 2022
- **Auth**: Auth0 (planned)
- **Testing**: Vitest + Testing Library (frontend), xUnit + FluentAssertions (backend)

## Prerequisites

- Node.js 24+
- .NET 9 SDK
- Docker

## Quick Start

```bash
# Start all services (SQL Server, API, Frontend)
docker compose up --build -d

# Frontend: http://localhost:5173
# API:      http://localhost:5000/api/health
# SQL:      localhost:1434 (sa / LangTeach_Dev1!)
```

## Local Dev (without Docker)

```bash
# Start SQL Server only
docker compose up sqlserver -d

# Frontend
cd frontend
npm install
npm run dev          # http://localhost:5173

# Backend
cd backend/LangTeach.Api
dotnet run           # http://localhost:5000
```

## Tests

```bash
# Frontend
cd frontend && npm test

# Backend
cd backend && dotnet test
```

## Project Structure

```
langTeachSaaS/
├── frontend/          # React + Vite
├── backend/
│   ├── LangTeach.Api/         # .NET Web API
│   └── LangTeach.Api.Tests/   # xUnit integration tests
└── docker-compose.yml          # SQL Server + API + Frontend
```
