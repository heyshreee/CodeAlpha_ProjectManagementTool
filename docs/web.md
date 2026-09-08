---
layout: default
title: Landing page — web
---

# Landing page — web (`web/`)

> [← Back to documentation](index.md)

The public marketing page for ProjectFlow — a single-page **React 19 + Vite** site with a minimalist dark design. It exists to convert visitors (hero, features, security, analytics) and, for logged-in users, to route them straight into the workspace.

## Components

`web/src/App.tsx` renders the entire page: sticky header, hero with a live product mock, capabilities bar, feature cards, security and analytics sections, FAQ, and final call-to-action.

Sections are anchor-linked from the nav:

| Nav item | Anchor |
| -------- | ------ |
| Product | `#product` |
| Features | `#features` |
| Security | `#security` |
| Analytics | `#analytics` |

## Auth-aware CTAs

The landing page detects whether the visitor already has a session in the workspace and swaps its CTAs accordingly.

**How it works**

1. On mount, `App` calls `POST <apiBase>/auth/refresh` with `credentials: 'include'`.
2. `apiBase` comes from `VITE_API_BASE`; when unset it defaults to `/api/v1`, which the Vite dev proxy (and the Vercel rewrite) forwards to the API.
3. **Refresh 200** → `authenticated = true`:
   - Nav: single **"Go to dashboard"** button
   - Hero: **"Go to dashboard"** primary CTA, hero note hidden
   - Final CTA: **"Go to dashboard"**
4. **Refresh failure (401/network)** → `authenticated = false`:
   - Nav: **Sign in** + **Get started**
   - Hero: **"Get started free"** → workspace register
   - Final CTA: **"Get started"**

All CTA links point at the workspace app URL from `VITE_APP_URL` (default `http://localhost:5173`).

## Build-time environment

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `VITE_APP_URL` | `http://localhost:5173` | Workspace origin linked by all CTAs |
| `VITE_API_BASE` | `/api/v1` | Refresh endpoint root; leave unset in dev (proxy) |

Production values should be set as Vercel environment variables — see [Deployment](deployment.md).

## Dev server proxy

`web/vite.config.ts` proxies `/api` → `http://localhost:3000` so the browser sees a same-origin request and the httpOnly refresh cookie is transmitted (cookies are host-scoped, so the `localhost` cookie works across ports).