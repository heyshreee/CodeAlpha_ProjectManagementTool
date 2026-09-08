# Deployment — Vercel

> [← Back to documentation](index.md)

All three apps deploy as **separate Vercel projects** (monorepo). Deploy order matters: **server → client → web**.

## Projects

| Project | Root Directory | Framework | Build command | Key files |
| ------- | -------------- | --------- | ------------- | --------- |
| projectflow-api    | `server/` | Other (Node) | `npx prisma generate` | `server/vercel.json`, `server/api/index.js` |
| projectflow-client | `client/` | Vite | `npm run build` | `client/vercel.json` |
| projectflow-web    | `web/`    | Vite | `npm run build` | `web/vercel.json` |

> In each project's Settings → General set **Root Directory** to the folder above. The `vercel.json` files configure build output, rewrites, and (for the API) the serverless function.

## Rewrites (same-origin API calls)

- `client/vercel.json` proxies `/api`, `/uploads`, `/socket.io` → the API project.
- `web/vercel.json` proxies `/api` → the API project.
- Both keep the browser completely same-origin, so the httpOnly refresh cookie and `SameSite=Lax` remain workable, and **no `VITE_API_BASE` is needed**.

## Serverless routing

`server/api/index.js` exports the full Express `app`. Vercel serves every `/api/v1/**` request as one function, and `server/vercel.json` caps `maxDuration` at 30s.

## Environment variables (Production)

**API project (`server/`)**

| Variable | Value |
| -------- | ----- |
| `DATABASE_URL` | PostgreSQL connection string (Neon via Vercel Storage, auto-injected) |
| `JWT_ACCESS_SECRET` | long random hex (e.g. `crypto.randomBytes(48).toString('hex')`) |
| `JWT_REFRESH_SECRET` | long random hex |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | comma-separated client + web origins |
| `CLIENT_URL` | client project URL |
| `APP_URL` | client project URL (password-reset links) |
| `COOKIE_SECURE` | `true` |
| `COOKIE_SAMESITE` | `none` |
| `STORAGE_DRIVER` | `cloudinary` |
| `CLOUDINARY_CLOUD_NAME` | your Cloudinary cloud |
| `CLOUDINARY_API_KEY` | your Cloudinary key |
| `CLOUDINARY_API_SECRET` | your Cloudinary secret |
| `SMTP_*` | *(optional)* password-reset email delivery |

**Client project (`client/`)** — none required (rewrites handle API + socket). Optional cross-origin overrides documented in `client/.env.example`.

**Web project (`web/`)**

| Variable | Value |
| -------- | ----- |
| `VITE_APP_URL` | deployed client URL (`https://projectflow-client.vercel.app` or your domain) |
| `VITE_API_BASE` | leave unset (uses the `/api` rewrite) |

> A ready-to-edit local template with generated secrets lives in `server/.env.production` — **gitignored, never commit it**. Template files use placeholders like `<api-vercel-domain>` that you replace with real URLs.

## Database

1. Create a **Vercel Postgres** (Neon) DB connected to the `server` project.
2. Flip the Prisma provider in `server/prisma/schema.prisma`: `sqlite` → `postgresql`.
3. From a machine with the Neon `DATABASE_URL`:

```bash
cd server
npx prisma db push        # solo projects
# or, for versioned schema history:
npx prisma migrate deploy
```

4. Verify after deploy: `GET https://<api-domain>/health` → `{"database":"connected"}`.

## Storage — Cloudinary

Vercel serverless disks are ephemeral and shared across instances, so uploads/avatars use **Cloudinary** (`STORAGE_DRIVER=cloudinary`):

- Files stream from memory (`multer.memoryStorage`) to Cloudinary under `CLOUDINARY_FOLDER` (default `projectflow`).
- Downloads stay auth-gated: the API checks membership/role, then **302-redirects to a freshly signed URL**.
- Deletes call `cloudinary.uploader.destroy`.
- Avatars are stored as full CDN URLs and render directly from `res.cloudinary.com`.

## Serverless limitations

| Feature | Status on Vercel | Mitigation |
| ------- | ---------------- | ---------- |
| Socket.IO realtime | Partial — no persistent WebSocket; HTTP long-polling only, not guaranteed across instances | Container/VPS (Fly.io, Railway, Render) for full realtime |
| Deadline-reminder scheduler | Doesn't run (in-process `setInterval`) | External cron + scheduled endpoint, or container platform |
| Uploads/avatars | Solved via Cloudinary | — |
| Landing "Go to dashboard" across apps | Works only when client + web share one custom domain (cookie not shared between `.vercel.app` origins) | Deploy both behind one domain, or accept graceful "Sign in" fallback |

## Rollout order

1. Create API project → set env → deploy → confirm `/health`.
2. Create client project → deploy → confirm register/login + board + attachments.
3. Create web project → set `VITE_APP_URL` → deploy → confirm CTAs.

## Custom domain (recommended)

Point one domain (e.g. `projectflow.dev`) as the API/client/web common origin so the session cookie and "Go to dashboard" CTA share context across apps. Keep `CORS_ORIGIN` and `COOKIE_SAMESITE=none` consistent.