# API — server (`server/`)

> [← Back to documentation](index.md)

Express 5 REST API under `/api/v1` plus a Socket.IO realtime bus. Node.js + Prisma 6 + zod + argon2 + jsonwebtoken + pino + helmet.

## Auth model

- **Access token** — short-lived JWT (default `15m`), returned in the login/refresh body. The client keeps it in `localStorage`.
- **Refresh token** — stored as an httpOnly cookie `pf_refresh` (default `7d`), rotated on every refresh.
- **Reuse detection** — presenting an already-rotated refresh token revokes the entire session family.
- **Rate limiting** — auth endpoints rate-limited to slow brute force.
- **Uniform errors** — invalid user/password return identical responses to prevent account enumeration.

### Endpoints

```
POST   /api/v1/auth/register        create account
POST   /api/v1/auth/login           email + password → token + cookie
POST   /api/v1/auth/refresh         rotate token pair (cookie)
POST   /api/v1/auth/logout          revoke refresh token
POST   /api/v1/auth/forgot-password send reset email
POST   /api/v1/auth/reset-password  set new password with token

GET    /api/v1/users/me             profile + project counts
PATCH  /api/v1/users/me             update profile
POST   /api/v1/users/me/avatar      upload avatar
PATCH  /api/v1/users/me/password    change password
```

## Authorization & roles

Role hierarchy on `ProjectMember`:

```
Viewer < Member < Admin < Owner
```

Guards (`middleware/authorize.js`) run before controllers and double as BOLA/IDOR protection:

| Guard | Enforced for |
| ----- | ------------ |
| `ensureProjectAccess` | any `/projects/:id/...` route |
| `ensureTaskAccess` | `/api/v1/tasks/:id/...` |
| `ensureAttachmentAccess` | attachment upload/download/delete |

## Projects, boards, tasks

```
GET   /api/v1/projects                     list mine
POST  /api/v1/projects                     create
GET   /api/v1/projects/:id                 detail (+members, boards, counts)
PATCH /api/v1/projects/:id                 update
DELETE /api/v1/projects/:id

GET/POST   /api/v1/projects/:id/members    list / invite
PATCH/DELETE
          /api/v1/projects/:id/members/:userId   role change / remove

GET   /api/v1/projects/:id/boards          boards + columns + tasks
POST  /api/v1/projects/:id/boards          create board
GET/PATCH/DELETE
          /api/v1/projects/:id/boards/:boardId
POST  /api/v1/projects/:id/boards/:boardId/columns     add column
PATCH /api/v1/projects/:id/boards/:boardId/columns/reorder

GET/POST   /api/v1/projects/:id/tasks
GET/PATCH/DELETE
          /api/v1/tasks/:id                          standalone access
POST  /api/v1/projects/:id/tasks/move                move between columns
```

## Comments, labels, attachments, notifications, analytics

```
GET/POST   /api/v1/tasks/:taskId/comments
PATCH/DELETE /api/v1/tasks/:taskId/comments/:id

GET/POST   /api/v1/projects/:id/labels
PATCH/DELETE /api/v1/projects/:id/labels/:id
GET        /api/v1/projects/:id/tasks/:taskId/labels      assign/remove

POST       /api/v1/tasks/:taskId/attachments             upload (multipart)
GET        /api/v1/tasks/:taskId/attachments
GET        /api/v1/tasks/:taskId/attachments/:id/download (auth-gated)
DELETE     /api/v1/tasks/:taskId/attachments/:id
GET        /api/v1/attachments/:id/download              item router form

GET        /api/v1/notifications                           inbox
PATCH      /api/v1/notifications/:id                       mark read
POST       /api/v1/notifications/read-all

GET        /api/v1/analytics/dashboard                     stats + deadlines
GET        /api/v1/analytics/search?q=...                  global search
GET        /api/v1/analytics/calendar?month=YYYY-MM        calendar feed
GET        /api/v1/projects/:id/analytics                  per-project analytics
```

Health: `GET /health`.

> The exact route shapes live in `server/src/routes/*`. Supertest suites in `server/test/` are the executable contract.

## Storage drivers

| Driver (`STORAGE_DRIVER`) | Flow |
| ------------------------- | ---- |
| `local` | Multer disk → `server/uploads/`; downloads streamed from disk |
| `memory` | Multer memory buffers (used by tests) |
| `cloudinary` | Buffer streamed to Cloudinary; downloads redirect to a freshly **signed** URL after the auth check; deletes call `destroy` |

Configuration: `server/src/config/env.js` — fails fast in production if required secrets (JWT, Cloudinary) are missing.

## Services & libraries

- `services/scheduler.js` — deadline-reminder job (hourly, dev only; see deployment caveats)
- `services/internal.js` — activity feed + notification creation + realtime emit
- `lib/realtime.js` — `emitToProject` / `emitToUser`
- `lib/mailer.js` — nodemailer; in dev prints emails to the console when SMTP is unset
- `lib/cloudinary.js` — upload/destroy/signed-URL wrapper