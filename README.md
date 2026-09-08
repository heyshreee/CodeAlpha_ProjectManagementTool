<div align="center">

# ProjectFlow

**A full-stack project-management workspace — kanban boards, task tracking, team roles, real-time collaboration, notifications, and analytics.**

Built as a **CodeAlpha internship project**.

![License: Internal](https://img.shields.io/badge/license-internal-blue) ![PRs: welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)

</div>

---

## Table of Contents

- [About](#about)
- [Feature Highlights](#feature-highlights)
- [Tech Stack](#tech-stack)
- [Repository Layout](#repository-layout)
- [Quick Start](#quick-start)
- [Documentation](#documentation)
- [Deployment](#deployment)
- [Security](#security)
- [Testing](#testing)

---

## About

ProjectFlow is a production-minded project management application with three distinct surfaces:

| Surface | What it is | Where it runs |
| ------- | ---------- | ------------- |
| **Workspace** (`client/`) | The product — boards, tasks, dashboards, teams | `http://localhost:5173` |
| **API** (`server/`) | REST API `/api/v1` + Socket.IO realtime bus | `http://localhost:3000` |
| **Landing page** (`web/`) | Marketing site with auth-aware CTAs | `http://localhost:5000` |

It is styled as a fast, compact, GitHub/Linear-class developer tool: a dense dark UI, keyboard-friendly editing, drag-and-drop boards, and instant updates across teammates.

## Feature Highlights

**Workspace**
- Dashboard with live stats: active / assigned / overdue tasks, upcoming deadlines, per-project completion bars, and a recent-activity feed
- Projects with ownership, team invites, and a 4-tier role model (`Owner → Admin → Member → Viewer`)
- Global search across tasks, projects, and members (scoped to your projects)
- Month calendar view with task pills and overdue highlighting
- Command palette, notification bell, and collapsible mobile sidebar

**Kanban boards**
- Drag-and-drop tasks between columns (dnd-kit) with optimistic updates
- Create / rename / reorder / delete columns

**Tasks**
- Full lifecycle: status, priority, assignee, due date, position, and description
- Comments, project labels, and file attachments
- Slide-in task drawer with inline editing and real-time label assignment
- Deadline-reminder scheduler that notifies assignees/creators the day before

**Real-time collaboration**
- Socket.IO pushes notifications and activity instantly to per-user (`user:{id}`) and per-project (`project:{id}`) channels

**Appearance**
- Six accent themes (Violet, Ocean, Mint, Rose, Amber, Cyan), persisted per user and restored on any device

## Tech Stack

| Layer      | Technology |
| ---------- | ---------- |
| Client     | React 19, TypeScript, Vite, Tailwind CSS v4, React Router 7, TanStack Query, Zustand, dnd-kit, Recharts, socket.io-client |
| API        | Node.js, Express 5, Prisma 6, Socket.IO, zod, argon2, jsonwebtoken, nodemailer, pino, helmet |
| Landing    | React 19, TypeScript, Vite |
| Database   | SQLite (dev/CI) — PostgreSQL-ready schema |
| Storage    | Local disk (dev) + Cloudinary CDN (production uploads/avatars) |
| Testing    | Vitest + Supertest (API) · ESLint + Vite build (client/landing) |

## Repository Layout

```
├── client/        React SPA — the workspace product UI
├── server/        Express REST API (/api/v1) + Socket.IO + Prisma
│   ├── prisma/    Schema (SQLite dev / PostgreSQL prod) + migrations
│   ├── api/       Vercel serverless entry (production)
│   └── test/      Vitest + Supertest suites
├── web/           React + Vite landing page (auth-aware navigation)
├── docs/          Full project documentation (see below)
└── .env.example   Environment template
```

## Quick Start

> Prerequisites: Node.js 20+, npm

**1. API**

```bash
cd server
npm install
cp .env.example .env
npx prisma db push     # creates SQLite dev.db + generates the Prisma client
npm run dev            # API on http://localhost:3000
```

**2. Workspace**

```bash
cd client
npm install
npm run dev            # SPA on http://localhost:5173
```

**3. Landing page**

```bash
cd web
npm install
npm run dev            # landing page on http://localhost:5000
```

Open `http://localhost:5173`, register an account, and create your first project. Full setup details in [`docs/getting-started.md`](docs/getting-started.md).

## Documentation

The `docs/` directory covers the entire project:

| Document | Covers |
| -------- | ------ |
| [Home](docs/index.md) | Documentation homepage; project intent and the three surfaces |
| [Getting Started](docs/getting-started.md) | Local development setup, ports, first-run walkthrough |
| [Architecture](docs/architecture.md) | Monorepo layout, request flow, realtime event bus |
| [Workspace (client)](docs/client.md) | Pages, routing, state management, realtime hooks |
| [API (server)](docs/api.md) | Auth model, full endpoint map, storage drivers |
| [Landing page (web)](docs/web.md) | Landing page features and auth-aware CTA behavior |
| [Database](docs/database.md) | Prisma schema, models, enums, SQLite ↔ PostgreSQL |
| [Security](docs/security.md) | Threat model, auth flows, BOLA/IDOR, upload hardening |
| [Testing](docs/testing.md) | Test suites, how to run them, coverage areas |
| [Deployment](docs/deployment.md) | Vercel, Postgres (Neon), Cloudinary, env config |

## Deployment

Each surface deploys as its own **Vercel project**:

1. **`server/`** — serverless Express (`api/index.js`) + PostgreSQL (Neon) + Cloudinary for uploads
2. **`client/`** — Vite SPA; rewrites `/api`, `/uploads`, `/socket.io` to the API project
3. **`web/`** — Vite landing page; rewrite `/api` to the API project

Full instructions, the required env variables, and known serverless limitations are in [`docs/deployment.md`](docs/deployment.md).

**Documentation site** — the `docs/` folder also publishes as a GitHub Pages site. In **Repository → Settings → Pages**, set *Source: Deploy from a branch*, *Branch: `main`*, *Folder: `/docs`*. The site appears at `https://<username>.github.io/<repo>/` with [`docs/index.md`](docs/index.md) as the homepage.

## Security

- Role-hierarchy authorization on every protected route (`Viewer < Member < Admin < Owner`)
- BOLA/IDOR guards on projects, tasks, and attachments — acting on any id requires membership + role
- Short-lived JWT access tokens + rotating httpOnly refresh cookie with reuse detection
- Zod validation on all input; Argon2 password hashing; rate-limited auth endpoints
- Upload hardening: MIME allow-list, magic-byte verification, sanitized filenames, auth-gated serving

Details in [`docs/security.md`](docs/security.md).

## Testing

```bash
cd server && npm test    # Vitest + Supertest — 7 suites, 62 tests
cd client && npm run lint && npm run build
cd web    && npm run lint && npm run build
```

See [`docs/testing.md`](docs/testing.md) for the full matrix.

---

*CodeAlpha internship project — internal use unless otherwise licensed. For issues or contributions, open a PR.*