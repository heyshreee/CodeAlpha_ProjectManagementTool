# ProjectFlow

A full-stack project-management workspace — kanban boards, task tracking, team roles, real-time notifications, and analytics — styled as a fast, compact, GitHub/Linear-class developer tool.

Built as a CodeAlpha internship project.

## Features

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
- Full lifecycle: status, priority, assignee, due date, position, description
- Comments, project labels, and file attachments
- Slide-in task drawer with inline editing and real-time label assignment
- Deadline-reminder scheduler that notifies assignees/creators the day before

**Real-time collaboration**
- Socket.IO pushes notifications and activity instantly to per-user and per-project channels

**Appearance**
- Six accent themes (Violet, Ocean, Mint, Rose, Amber, Cyan), persisted per user and restored on any device

## Tech Stack

| Layer    | Technology |
| -------- | ---------- |
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS v4, React Router 7, TanStack Query, Zustand, dnd-kit, Recharts, socket.io-client |
| Backend  | Node.js, Express 5, Prisma 6, Socket.IO, zod, argon2, jsonwebtoken, nodemailer, pino |
| Database | SQLite (dev/CI) — PostgreSQL-ready schema |
| Testing  | Vitest + Supertest (server), ESLint + production build (client) |

## Architecture

```
client/   React SPA — compact dark UI, single Tailwind v4 stylesheet
server/   Express REST API under /api/v1 + Socket.IO event bus
```

- **Auth:** short-lived JWT access tokens in memory/localStorage, rotating httpOnly refresh-token cookie (`pf_refresh`) with reuse detection that revokes the whole session family.
- **Authorization:** every project/task/attachment route passes a role-hierarchy guard (`ensureProjectAccess` / `ensureTaskAccess` / `ensureAttachmentAccess`) that doubles as the BOLA/IDOR protection.
- **Real time:** HTTP handlers write to the DB and emit via a `realtime.js` bridge into Socket.IO rooms (`user:{id}`, `project:{id}`); the client mirrors state optimistically.

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### 1. Backend

```bash
cd server
npm install
cp ../.env.example .env
npx prisma db push   # creates SQLite dev.db + generates the Prisma client
npm run dev          # API on http://localhost:3000
```

### 2. Frontend

```bash
cd client
npm install
npm run dev          # SPA on http://localhost:5173
```

Open http://localhost:5173, register an account, and create your first project.

### Production database

Edit `server/.env` and switch to PostgreSQL:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/project_management
```

The Prisma schema is provider-agnostic; run `npx prisma db push` (or adopt `prisma migrate`) after switching.

## Configuration

All settings live in `server/.env` (copy from `.env.example`). Never commit real secrets.

| Variable | Purpose |
| -------- | ------- |
| `PORT` | API port (default `3000`) |
| `CLIENT_URL` / `CORS_ORIGIN` | Frontend origin for CORS (default `http://localhost:5173`) |
| `DATABASE_URL` | SQLite file or PostgreSQL connection string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Token signing secrets (generate long random values in production) |
| `ACCESS_TOKEN_TTL` / `REFRESH_TOKEN_TTL` | Token lifetimes (default `15m` / `7d`) |
| `COOKIE_SECURE` / `COOKIE_SAMESITE` | Refresh-cookie flags (secure + none in production) |
| `APP_URL` | Base URL used for password-reset email links |
| `SMTP_*` | Nodemailer config; leave `SMTP_HOST` empty in dev to log emails to the console |
| `STORAGE_DRIVER` / `STORAGE_LOCAL_DIR` | `local` filesystem storage (S3-compatible env vars available) |
| `MAX_UPLOAD_BYTES` | Per-file upload limit (default 10 MB) |

## Scripts

| Command | Where | Description |
| ------- | ----- | ----------- |
| `npm run dev` | `server/` | Run API with nodemon + hot reload |
| `npm start` | `server/` | Run API |
| `npm run prisma:push` | `server/` | Sync schema + regenerate client |
| `npm run prisma:studio` | `server/` | Open Prisma Studio |
| `npm test` | `server/` | Run API test suite (Vitest) |
| `npm run dev` | `client/` | Run Vite dev server |
| `npm run build` | `client/` | Production build |
| `npm run lint` | `client/` | ESLint |

## API Overview

```
auth        /api/v1/auth            register, login, logout, refresh, password reset
users       /api/v1/users           profile, avatar, change-password
projects    /api/v1/projects        CRUD, members/invites/roles, activity, analytics
boards      /api/v1/projects/:id/boards   columns, reorder, task lists
tasks       /api/v1/projects/:id/tasks    CRUD, move
            /api/v1/tasks/:id             standalone item access
comments    /api/v1/tasks/:id/comments    CRUD
attachments /api/v1/tasks/:id/attachments upload (auth-gated download)
labels      /api/v1/projects/:id/labels   CRUD
notifications /api/v1/notifications       list, mark read, read-all
analytics   /api/v1/analytics             dashboard stats, search, calendar
```

Health check: `GET /health`.

## Security Model

- Role-hierarchy authorization on every protected route (`VIEWER < MEMBER < ADMIN < OWNER`)
- BOLA/IDOR guards: acting on a project, task, or attachment by id always requires membership + role
- Zod validation on all inputs; bounded search length
- Upload hardening: MIME allow-list + dangerous-type deny-list, magic-byte verification, sanitized filenames, and auth-gated (never static) attachment serving
- Argon2 password hashing, rotating refresh tokens with reuse detection, rate-limited auth endpoints, and uniform login errors to prevent account enumeration

## Testing

The API ships 62 tests across 7 suites (`server/test/`): authentication, IDOR/BOLA, RBAC, input validation, and upload security. Isolated SQLite DB, configured via `global-setup.js`.

```bash
cd server && npm test
```

Client verification: `npm run lint` + `npm run build`.

## Repository

- Repo: `heyshreee/CodeAlpha_ProjectManagementTool`
- License: see project files (internship project — internal use unless otherwise licensed)