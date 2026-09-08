---
layout: default
title: Testing
---

# Testing

> [← Back to documentation](index.md)

## API — Vitest + Supertest

7 suites, **62 tests**, isolated SQLite DB (see `server/test/global-setup.js`).

```bash
cd server
npm test              # one-shot
npm run test:watch    # watch mode
```

### Suites

| Suite | Scope |
| ----- | ----- |
| `auth.test.js` | register / login / refresh / logout, token rotation, cookie flags |
| `auth-security.test.js` | rate limiting, enumeration resistance, password rules |
| `idor.test.js` | cross-project/task/attachment access attempts |
| `bola-extended.test.js` | role boundary checks across owner/admin/member/viewer |
| `rbac.test.js` | project/member role enforcement |
| `validation.test.js` | zod input validation, malformed payloads |
| `upload-security.test.js` | MIME allow/deny lists, magic bytes, sanitized names, auth-gated downloads |

## Client & landing page

No unit test runner — CI-grade verification is **lint + production build** plus manual E2E flows.

```bash
cd client
npm run lint && npm run build

cd web
npm run lint && npm run build
```

`client/` runs ESLint + Vite build; `web/` runs `tsc --noEmit` + Vite build.

## Manual smoke matrix (two users)

A useful E2E pass uses two accounts to confirm security boundaries and realtime:

| Step | Expected |
| ---- | -------- |
| Login user A and user B | 200 + access token + refresh cookie |
| `/users/me`, `/projects` for both | correct identity + project lists |
| Open a shared project as both | both read its detail |
| User A tries a project only B owns | 403/404 (IDOR guard) |
| Upload an attachment, then refresh the list | file appears; download 200 |
| Open the landing page logged-in | nav shows **"Go to dashboard"** |
| Expire/clear the refresh cookie | landing shows **Sign in / Get started** |

## Coverage notes

- The Supertest suites exercise the **HTTP layer only** (what the browser/SPA actually talks to); Socket.IO and the scheduler are validated by manual smoke tests.
- `NODE_ENV=test` disables the scheduler and uses the isolated test DB.