# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm run dev          # Start all apps in dev mode
pnpm run dev:web      # Start web app only (port 3001)
pnpm run build        # Build all packages (pnpm turbo build)
pnpm run check-types  # TypeScript type checking across all packages
```

No linter or test runner is configured.

## Architecture

Monorepo using **pnpm workspaces** + **Turborepo**. Shared dependency versions managed via `catalog:` in `pnpm-workspace.yaml`.

### Packages

| Package | Purpose |
|---------|---------|
| `apps/web` | Next.js 16 fullstack app (App Router, React 19, Turbopack) |
| `packages/api` | oRPC API layer — procedures, routers, business logic |
| `packages/auth` | Better-Auth config with MongoDB adapter |
| `packages/db` | Mongoose models and MongoDB connection |
| `packages/env` | T3 Env validation — separate `server.ts` and `web.ts` exports |
| `packages/config` | Shared `tsconfig.base.json` |

### Request Flow

1. Client calls API via oRPC client (`apps/web/src/utils/orpc.ts`) → `POST /api/rpc`
2. `apps/web/src/app/api/rpc/[[...rest]]/route.ts` handles request via `RPCHandler` (or `OpenAPIHandler` for docs at `/api/rpc/api-reference`)
3. `createContext()` (`packages/api/src/context.ts`) extracts session from Better-Auth
4. oRPC routes to the appropriate procedure in `packages/api/src/routers/`
5. Procedures use Mongoose models from `packages/db/src/models/`

### Key Patterns

**Procedures**: `publicProcedure` (no auth) and `protectedProcedure` (session required) defined in `packages/api/src/index.ts`. All input validated with Zod.

**Mongoose models**: String `_id` (UUID), explicit `{ collection: "name" }`, manual `createdAt`/`updatedAt` fields. No Mongoose timestamps plugin. See `packages/db/src/models/auth.model.ts` for the pattern.

**ID generation**: `generateId()` from `packages/db/src/utils/id.ts` (wraps `crypto.randomUUID()`).

**Package exports**: Barrel exports with wildcard pattern (`"./*": { "default": "./src/*.ts" }`). Import as `@we-grow/db/models/index`, `@we-grow/env/server`, etc.

**Group authorization**: `requireGroupRole()` in `packages/api/src/middlewares/group-auth.ts` — a guard function called at the start of handlers (not oRPC middleware).

### Gamification System

XP constants in `packages/api/src/lib/xp.ts`. Level formula: `XP for level N = 100 * N * (N+1) / 2`. Streak calculation handles daily, weekly, and specific_days frequencies with bonuses at 7/30/100 days.

## Environment Variables

Required in `apps/web/.env`:
```
DATABASE_URL=         # MongoDB connection string
BETTER_AUTH_SECRET=   # 32+ char secret
BETTER_AUTH_URL=      # e.g. http://localhost:3001
CORS_ORIGIN=          # e.g. http://localhost:3001
```

Optional:
```
VAPID_PUBLIC_KEY=     # For Web Push notifications
VAPID_PRIVATE_KEY=
```

## TypeScript

Strict mode enabled with `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, and `isolatedModules`. Target is ESNext with bundler module resolution. Mongoose `_id` fields are typed as `string | null` — use `as string` when passing to functions that require `string`.
