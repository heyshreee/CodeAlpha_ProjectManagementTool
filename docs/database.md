# Database — Prisma schema

> [← Back to documentation](index.md)

Prisma 6, provider-agnostic. **SQLite in development/CI**, **PostgreSQL in production** — the data model is fully portable between the two (`provider = "sqlite"` → `"postgresql"`).

## Schema location

- Dev schema: `server/prisma/schema.prisma`
- Dev DB: `server/prisma/dev.db` (SQLite file, gitignored)

## Models

| Model | Purpose | Key relations |
| ----- | ------- | ------------- |
| `User` | Account + profile | owned projects; memberships; avatar |
| `Project` | Workspace container | members, boards, labels, analytics |
| `ProjectMember` | Membership + `ProjectRole` | user ↔ project |
| `Board` | Kanban board in a project | columns |
| `Column` | Board column with position | tasks |
| `Task` | Work item | status, priority, assignee, due date, position, label links |
| `Comment` | Task discussion | task, author |
| `Label` | Reusable project label | task label links |
| `TaskLabel` | Many-to-many task ↔ label | |
| `Attachment` | Uploaded file metadata | task, uploader, `storageKey` |
| `Notification` | Per-user inbox | type, entity refs |
| `Activity` | Audit/feed entries | project, actor, action |
| `RefreshToken` | Auth session family | user, token hash, rotation state |
| `LoginAttempt` | Auth rate limiting/forensics | hashed email/ip |
| `PasswordResetToken` | Reset flow | user, hashed token, expiry |
| `PasswordChangeLog` | Password-change audit | user |

## Enums

| Enum | Values |
| ---- | ------ |
| `ProjectRole` | `OWNER`, `ADMIN`, `MEMBER`, `VIEWER` |
| `TaskStatus` | `BACKLOG`, `TODO`, `IN_PROGRESS`, `DONE` |
| `TaskPriority` | `LOW`, `MEDIUM`, `HIGH`, `URGENT` |
| `NotificationType` | `TASK_ASSIGNED`, `TASK_MOVED`, `TASK_COMMENTED`, `COMMENT_MENTION`, `DEADLINE_REMINDER`, `MEMBER_ADDED`, `MEMBER_REMOVED` |
| `NotificationStatus` | `UNREAD`, `READ` |

## Managing schema changes

**SQLite (dev/CI)**

```bash
cd server
npx prisma db push       # sync schema → dev.db and regenerate client
npx prisma generate      # client only
npx prisma studio        # visual browser
```

**PostgreSQL (production)**

1. Switch `provider` to `postgresql` and set `DATABASE_URL`.
2. For trackable, versioned schema history use **migrations**:

```bash
npx prisma migrate dev --name init        # create + apply locally
npx prisma migrate deploy                 # apply on the production DB
```

`db push` is fine for solo projects but does **not** keep versioned history — `prisma migrate` is preferred once multiple environments exist.

> `prisma db push` requires `DATABASE_URL` in the environment where it runs (dev env vs. Neon/Postgres both work).

## Notes

- `RefreshToken` stores a **hash** (sha256) of the token, never the raw token.
- `LoginAttempt` and `PasswordChangeLog` are the basis for rate limiting and password-change audits.
- Attachments store only **metadata** in the DB; bytes live in the storage backend via `storageKey` (`server/uploads/` in dev, Cloudinary in production).