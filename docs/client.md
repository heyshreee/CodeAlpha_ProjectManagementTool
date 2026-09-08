# Workspace — client (`client/`)

> [← Back to documentation](index.md)

The workspace SPA is the product UI. React 19 + TypeScript + Vite + Tailwind CSS v4, single stylesheet, dark developer aesthetic.

## Pages & routing

React Router 7 with a collapsible sidebar (`components/layout/Sidebar.tsx`).

| Route | Page | Description |
| ----- | ---- | ----------- |
| `/` | Dashboard | Live stats, completion bars, activity feed |
| `/login` `/register` `/forgot-password` `/reset-password` | auth/* | Auth flows |
| `/tasks` | MyTasks | Tasks assigned to you |
| `/projects` | Projects | Project cards + create |
| `/calendar` | Calendar | Month view with task pills + overdue highlighting |
| `/notifications` | Notifications | Notification inbox |
| `/search` | Search | Global search (tasks, projects, members) |
| `/settings` | Settings | Profile, avatar, accent theme, security |
| `/projects/:id/board` | project/BoardPage | Kanban board (drag-and-drop) |
| `/projects/:id/members` | project/Members | Member roles + invites |
| `/projects/:id/activity` | project/Activity | Project audit feed |
| `/projects/:id/analytics` | project/Analytics | Charts (Recharts) |
| task detail | project/TaskDetail | Slide-in drawer with comments, labels, attachments |

## State management

| Concern | Library | Notes |
| ------- | ------- | ----- |
| Server cache | TanStack Query | `useQuery`/`useMutation` around `lib/api.ts` |
| Client/session state | Zustand | Auth store (`stores/authStore.ts`), drawers, UI |
| Optimistic updates | TanStack Query + dnd-kit | Board drags update cache before server confirms |
| Realtime | socket.io-client | `hooks/useRealtime.ts` invalidates queries on socket events |

## API client (`src/lib/api.ts`)

- `API_BASE = '/api/v1'` — same-origin; the dev proxy (or Vercel rewrite) forwards it.
- Token auth: access token from `localStorage` (`pf_access_token`) sent as `Authorization: Bearer`.
- **Auto-refresh:** any `401` triggers `POST /auth/refresh` with the httpOnly cookie, then retries once. Expired refresh → token cleared.
- `uploadFile()` — raw multipart for attachments and avatars with the same `401`-retry logic.
- `avatarUrl(avatar)` — accepts a Cloudinary URL (absolute) or a dev filename (`/uploads/...`).

## Realtime (`src/lib/socket.ts`)

- Single shared socket; reconnects fresh when the auth token changes.
- Transports: `['websocket', 'polling']` with Socket.IO auth payload carrying the Bearer token.

## Theme

Six accent themes (Violet, Ocean, Mint, Rose, Amber, Cyan) persisted per user via the API and applied at the root; restored on any device.