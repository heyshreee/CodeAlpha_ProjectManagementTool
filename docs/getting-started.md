---
layout: default
title: Getting Started
---

# Getting Started

> [← Back to documentation](index.md)

Run the entire stack locally. Ports and commands assume a Windows/Linux/macOS shell.

## Prerequisites

- **Node.js 20+**
- **npm** (bundled)

No database server is required locally — the API uses a SQLite file by default (`server/prisma/dev.db`).

## 1. API (`server/`)

```bash
cd server
npm install
cp .env.example .env        # creates your local env file
npx prisma db push          # creates SQLite dev.db + generates the Prisma client
npm run dev                 # API on http://localhost:3000
```

Health check: `GET http://localhost:3000/health` → `{"status":"ok","database":"connected",...}`.

## 2. Workspace (`client/`)

```bash
cd client
npm install
npm run dev                 # SPA on http://localhost:5173
```

The Vite dev server proxies `/api`, `/uploads`, and `/socket.io` to the API on `localhost:3000`, so the browser never deals with cross-origin requests in dev.

## 3. Landing page (`web/`)

```bash
cd web
npm install
npm run dev                 # landing page on http://localhost:5000
```

`web/vite.config.ts` proxies `/api` to the API the same way, which powers the landing page's session-aware CTAs.

## First-run walkthrough

1. Open **http://localhost:5173**.
2. **Register** an account (name, email, password).
3. You land on the Dashboard (empty state).
4. **New project** from the top-left command menu, then invite a second browser/user to the same project to see real-time updates.
5. Create columns and tasks on the **Board**, assign/prioritize/comment, and add an attachment.
6. Open **http://localhost:5000** — if you're still logged in (refresh cookie alive), the nav shows **"Go to dashboard"** instead of "Sign in / Get started".

## Ports reference

| App | Port | Env override |
| --- | ---- | ------------ |
| API | 3000 | `PORT` in `server/.env` |
| Workspace | 5173 | `server.port` in `client/vite.config.js` |
| Landing | 5000 | `server.port` in `web/vite.config.ts` |

## Environment variables

All server settings are documented in `server/.env.example`. The workspace and landing pages rely on optional Vite build-time vars (`VITE_*`) documented in `client/.env.example` and `web/.env.example`.

- **Local dev** — server defaults to the SQLite file and local-disk uploads (`STORAGE_DRIVER=local`). No external services required.
- **Production** — see [Deployment](deployment.md).

## Troubleshooting

- **`/api` calls 404 in the browser** — confirm the API server is up (health check) and that ports match the proxy targets.
- **Prisma client errors after pulling** — run `npx prisma generate` in `server/`.
- **Landing page shows "Sign in" even when logged in** — the refresh cookie expired (default 7 days) or the API isn't reachable through the proxy.
- **Uploads visibly stored** — in dev, files land in `server/uploads/`; the `client` never sees raw paths.