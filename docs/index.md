---
layout: default
title: ProjectFlow — Documentation
permalink: /
---

# ProjectFlow — Documentation

Welcome to the ProjectFlow documentation. ProjectFlow is a full-stack project-management workspace — kanban task tracking, team roles, real-time collaboration, notifications, and analytics — styled as a fast, compact developer tool (GitHub/Linear-class).

This documentation is organized as a small manual. Use the navigation below to jump to a topic.

---

## Documentation

- [Overview](README.md) — repo status badge, three surfaces at a glance
- [Getting Started](getting-started.md) — run the full stack locally in minutes
- [Architecture](architecture.md) — monorepo layout, request flow, realtime event bus
- [Workspace (client)](client.md) — pages, routing, state management, realtime hooks
- [API (server)](api.md) — auth model, full endpoint map, storage drivers
- [Landing page (web)](web.md) — marketing site and auth-aware CTAs
- [Database](database.md) — Prisma schema, models, enums, SQLite ↔ PostgreSQL
- [Security](security.md) — threat model, auth flows, BOLA/IDOR, upload hardening
- [Testing](testing.md) — test suites, how to run them, coverage areas
- [Deployment](deployment.md) — Vercel, PostgreSQL (Neon), Cloudinary, env config

## The three surfaces

ProjectFlow ships as three independently deployable applications in a single monorepo:

| Application | Directory | Role | Local URL |
| ----------- | --------- | ---- | --------- |
| **Workspace** | `client/` | The main product — everything a user interacts with day-to-day | http://localhost:5173 |
| **API** | `server/` | REST API under `/api/v1` plus a Socket.IO realtime event bus | http://localhost:3000 |
| **Landing** | `web/` | Public marketing page whose CTAs are aware of the user's session | http://localhost:5000 |

## Quick start

```bash
# 1. API
cd server && npm install
cp .env.example .env
npx prisma db push && npm run dev      # http://localhost:3000

# 2. Workspace
cd client && npm install && npm run dev # http://localhost:5173

# 3. Landing page
cd web && npm install && npm run dev    # http://localhost:5000
```

Full walkthrough: [Getting Started](getting-started.md).

## Guiding principles

- **Server authority** — every permission decision happens on the server; the UI is just a client.
- **Real-time by default** — state changes are pushed over Socket.IO, with optimistic client updates for a snappy feel.
- **Developer-grade UX** — dense UI, keyboard-friendly, dark theme with multiple accent colors.
- **Security-conscious** — role-based authorization, BOLA/IDOR guards, hardened uploads, rotating auth tokens.

---

*Documentation built for the CodeAlpha internship project. Mirrors the live codebase; the Supertest suites in `server/test/` remain the executable contract.*