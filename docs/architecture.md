# Architecture

> [← Back to documentation](index.md)

ProjectFlow is a monorepo with three independent applications. This document explains the layout, the request flow, and the realtime event bus.

## Repository layout

```
├── client/                      React SPA (workspace product UI)
│   └── src/
│       ├── pages/               Route-level pages
│       ├── components/          UI + layout components
│       ├── hooks/               useRealtime, TanStack Query wrappers
│       ├── lib/                 api client, socket client, auth store
│       ├── stores/              Zustand stores
│       ├── types/               shared types
│       └── vite.config.js       dev proxy → localhost:3000
├── server/                      Express REST API + Socket.IO + Prisma
│   ├── src/
│   │   ├── app.js               Express app assembly (middleware, routes)
│   │   ├── config/env.js        Env schema + production validation
│   │   ├── routes/              Versioned route modules
│   │   ├── controllers/         HTTP handlers
│   │   ├── middleware/          auth, authorization, upload, rate limiters
│   │   ├── services/            internal, scheduler, activity
│   │   ├── lib/                 prisma, logger, mailer, realtime, cloudinary
│   │   └── socket/              Socket.IO server (rooms, events)
│   ├── api/index.js             Vercel serverless entry (production)
│   ├── prisma/                  Schema + migrations
│   ├── test/                    Vitest + Supertest suites
│   └── server.js                Local entry: HTTP server + socket + scheduler
└── web/                         React + Vite landing page
    └── src/App.tsx              Single-page marketing site with auth detection
```

## Cross-cutting flow

```
 Browser (client:5173)
      │  fetch('/api/v1/...')           fetch('/socket.io' + websocket)
      ▼                                ▼
Vite dev proxy (or Vercel rewrites)   Socket.IO client
      │  same-origin rewrite
      ▼
Express app (server:3000 / Vercel function)
      │  helmet → cors → pino → cookieParser → routes
      │  auth middleware → role guards → controller → Prisma → SQLite/Postgres
      ▼
  result + Socket.IO emit to room(s)
```

### API request lifecycle

1. `helmet` adds security headers; `trust proxy` is enabled so rate limiting and `req.ip` behave behind a proxy.
2. CORS allows the configured origins **with credentials** (needed for the httpOnly refresh cookie).
3. `pino-http` logs each request with a request id.
4. Route controller runs **authorization guards** before touching data:
   - `ensureProjectAccess` — membership + minimum role
   - `ensureTaskAccess` — task belongs to a member's project
   - `ensureAttachmentAccess` — same, scoped to the task
5. Handlers validate with **zod**, query Prisma, and **emit realtime events**.

## Realtime event bus

Socket.IO rooms: `user:{id}` (notifications) and `project:{id}` (project activity).

**Server → client events**

| Event | Emitted when |
| ----- | ------------ |
| `task.created` / `task.updated` / `task.deleted` / `task.moved` | Task CRUD / board moves |
| `comment.created` / `comment.updated` / `comment.deleted` | Comments |
| `attachment.created` | File attachment added |
| `activity.created` | Activity feed entry |
| `notification.created` | New notification for a user |

**Client → server events**

| Event | Purpose |
| ----- | ------- |
| `project:join` | Join a project room (subscribe to realtime) |
| `project:leave` | Leave a project room |
| `projects:resync` | Request fresh project data (e.g., after invite) |

The client subscribes via `hooks/useRealtime.ts` and the `NotificationBell`; state is synchronized optimistically before the server confirms.

## Auth session flow

1. **Login** → server returns a short-lived JWT access token (default 15m) and sets a rotating httpOnly refresh cookie (`pf_refresh`, default 7d).
2. The client stores the access token in `localStorage` (`pf_access_token`) and attaches it as `Authorization: Bearer ...`.
3. On a `401`, the client calls `POST /api/v1/auth/refresh` with the cookie; the server rotates the token pair (reuse of an old refresh token revokes the whole family).
4. Cross-app, the landing page (`web`) calls the same refresh endpoint through its proxy to detect an active session.

## Storage drivers

`server` supports configurable file storage via `STORAGE_DRIVER`:

| Driver | Use case | Behavior |
| ------ | -------- | -------- |
| `local` | Local development | Multer writes to `server/uploads/`; downloads stream from disk |
| `memory` | Tests | Files held as buffers in memory |
| `cloudinary` | Production (Vercel) | Streams buffers to Cloudinary; downloads redirect to freshly signed URLs |

## Production topology (Vercel)

```
vercel.com
├── projectflow-api     Express serverless function + Neon Postgres + Cloudinary
├── projectflow-client  Vite SPA, rewrites /api /uploads /socket.io → API
└── projectflow-web     Vite landing, rewrites /api → API
```

Detailed production layout and limitations in [Deployment](deployment.md).