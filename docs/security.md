---
layout: default
title: Security
---

# Security

> [← Back to documentation](index.md)

ProjectFlow treats authorization and file uploads as the two highest-risk areas. This document maps the threat model to the implemented controls.

## Control inventory

| Area | Control | Where |
| ---- | ------- | ----- |
| Password storage | Argon2 (argon2id) hashing | `server/src/utils/password.js` |
| Session tokens | Short-lived JWT access (15m) + rotating httpOnly refresh cookie (7d) | `server/src/utils/tokens.js`, `authController.js` |
| Refresh reuse | Rotation with reuse detection — reused token revokes the family | `tokens.js` |
| Enumeration | Uniform login errors; rate-limited auth endpoints | `authController.js`, `middleware/rateLimiters.js` |
| Authorization | Role hierarchy guards on every protected route | `middleware/authorize.js` |
| BOLA/IDOR | Membership + role required to act on any project/task/attachment id | guards + controllers |
| Input validation | zod schemas; bounded search length | controllers |
| Headers | helmet (CSP, nosniff, HSTS, frame/bot protections) | `app.js` |
| Uploads | MIME allow-list, dangerous-type deny-list, magic-byte verification, sanitized names, auth-gated serving, no-sniff | `middleware/upload.js`, `attachmentController.js` |

## Authentication flows

1. **Register/login** → `hashPassword` (Argon2) / `verifyPassword`; on success issue access token + rotate refresh cookie.
2. **Refresh** → cookie presented to `POST /api/v1/auth/refresh`; pair rotated; old token hashes tracked for reuse detection.
3. **Logout** → revoke the refresh token row (cookie cleared by the browser on expiry).
4. **Password change** → verify current password, log the change (`PasswordChangeLog`).
5. **Forgot/reset** → rate-limited, `PasswordResetToken` hashed + expiring; reset links use `APP_URL`.

## Authorization model

Role hierarchy: `VIEWER < MEMBER < ADMIN < OWNER`.

- `ensureProjectAccess` — resolves the membership from `req.user` + `projectId`; attaches `req.membership`; enforces `role` where required (e.g. `ADMIN` for member management).
- `ensureTaskAccess` — a task may only be acted on if its project has a matching membership.
- `ensureAttachmentAccess` — scoped to the task/project; uploader deletes own files, admins/owners may delete others'.

Because every id-bearing route passes these guards first, cross-tenant access (IDOR/BOLA) is prevented even if the client guessed another project's UUID.

## Upload hardening

1. **Allow-list** — only safe MIME types (PDF, raster images, text, office docs, zip, JSON).
2. **Deny-list** — HTML/SVG/JS/XML/executables rejected by extension **and** MIME.
3. **Magic-byte verification** — the actual bytes are checked against `verifyMagicBytes` (PNG/JPEG/WebP/GIF/PDF/ZIP); non-text files that don't match are rejected.
4. **Random storage names** — user filenames are sanitized for display only; on disk/CDN files live under a random `storageKey` with no exploitable extension.
5. **Auth-gated serving** — downloads only via the authenticated endpoint; `nosniff` + safe `Content-Disposition`. In production, file bytes live on Cloudinary and the server issues a **freshly signed URL** only after the role check.

## Production posture

- `COOKIE_SECURE=true` + `COOKIE_SAMESITE=none` (HTTPS + cross-origin refresh cookie).
- `CORS_ORIGIN` whitelist must contain exactly the deployment origins.
- Mandatory secrets fail fast: `server/src/config/env.js` throws in production if JWT secrets or Cloudinary credentials are unset.
- Node/Vercel function runtime carries helmet defaults; `trust proxy` retained for correct `req.ip`.

## Known caveats

- **Scheduler** — the hourly deadline-reminder job is in-process (`server.js`); on serverless it does not run (see [Deployment](deployment.md)).
- **Local-only avatar serving** — the `/uploads` static route is dev-only (`app.js`); production avatars come from Cloudinary URLs stored on the user.
- **Rate limits** are fixed-window; fine for the internship scale but revisit for production hardening.