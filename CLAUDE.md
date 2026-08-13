# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Route/fleet management system for waste-picker cooperatives ("recicladores") in Canoas, RS, Brazil. It tracks cooperatives, vehicles, vehicle GPS positions, and collection routes built from a street network (via pgRouting), so cooperatives can plan and follow recycling collection routes.

Monorepo with three independent parts, each with its own package manager and lockfile:
- `backend/` — Fastify + TypeScript REST API (pnpm)
- `frontend/` — Next.js 16 App Router UI (npm) — currently still the default `create-next-app` scaffold, no app-specific pages/components have been built yet
- `docker/postgres/` — custom Postgres image (PostGIS + pgRouting) plus numbered init SQL scripts

## Commands

### Backend (run from `backend/`)
```
pnpm install
pnpm dev              # tsx watch src/index.ts — dev server with reload
pnpm start            # tsx src/index.ts — runs TS directly, no compiled dist/ step despite tsconfig outDir
pnpm db:generate      # drizzle-kit generate
pnpm db:migrate       # drizzle-kit migrate
pnpm db:seed          # tsx src/db/seed.ts — seeds cooperatives, admin users, vehicles, positions
pnpm db:studio        # drizzle-kit studio
```
There is no backend test suite (`pnpm test` is a placeholder) and no lint script.

`drizzle.config.ts` (schema `./src/db/schema.ts`, output `./drizzle`, reads `DATABASE_URL`) drives `db:generate`/`db:migrate`/`db:studio`. Note the existing dev DB's tables were created by the hand-written SQL in `docker/postgres/initdb/`, not by a Drizzle migration, so running `db:migrate` against it will try to (re)create tables that already exist — reconcile that (e.g. baseline/introspect) before relying on Drizzle migrations against that DB.

### Frontend (run from `frontend/`)
```
npm install
npm run dev           # next dev
npm run build         # next build
npm run start         # next start
npm run lint          # eslint
```
No frontend test suite is configured.

### Database / Docker (run from repo root)
```
docker compose up
```
This currently only starts the `db` service (Postgres 16 + PostGIS + pgRouting, built from `docker/postgres/Dockerfile`, exposed on `localhost:5432`, credentials `postgres`/`postgres`, database `recicladores`). The `backend`/`frontend` services in `docker-compose.yml` are commented out, so day-to-day development runs the backend and frontend locally (`pnpm dev` / `npm run dev`) against this containerized DB — set `DATABASE_URL` accordingly (see `.env.example`).

First-run DB initialization executes `docker/postgres/initdb/*.sql` in filename order (extensions, cooperatives, vehicles, user, maps/streets tables) — these only run once, on empty volume creation.

## Architecture

### Backend: per-resource module pattern
Each domain resource lives in `backend/src/routes/<resource>/` as four files, and new resources should follow the same split:
- `<resource>.routes.ts` — Fastify plugin registering HTTP routes; declares `preHandler` auth chains and Zod request/response schemas (via `fastify-type-provider-zod`) inline
- `<resource>.controller.ts` — thin HTTP glue: pulls params/body off the request, calls the service, shapes the reply/status code
- `<resource>.service.ts` — all Drizzle ORM queries against `db` (from `src/db/index.ts`)
- `<resource>.schema.ts` — Zod schemas used both for request validation and Swagger docs generation

`backend/src/index.ts` is the composition root: it registers the error handler, CORS, Swagger UI (`/admin/docs`), and each resource's route plugin (`health`, `cooperativeRoutes`, `userRoutes`, `routeRoutes`, `vehicleRoutes`). It also binds `process.env.PORT` (falling back to 3333 for local dev without an env file).

### Auth & multi-tenancy
- JWT auth: `src/lib/jwt.ts` signs/verifies HS256 tokens (`JWT_SECRET` env var required, no default). Payload is `{ userId, email, role, cooperativeId }`.
- `authenticate` (`src/middleware/auth.middleware.ts`) reads the `Bearer` header and attaches `request.user`; `requireRole(...roles)` gates by role string (`"admin"`, `"cooperative_admin"`, `"user"`).
- Tenant isolation is done per-controller, not via a shared middleware: each controller defines its own local `getCooperativeFilter(request)` helper that returns `request.user.cooperativeId` only when `role === "cooperative_admin"`, then passes it as an optional `filterCooperativeId` arg into the service's `findAll`/`findById`/`update`/`delete` methods, which AND it into the Drizzle `where` clause. `"admin"` role gets no filter (sees everything); `"user"` role also gets no filter at the service level even though it can't write — read scoping for plain `"user"` role isn't enforced by this mechanism. Follow this same `getCooperativeFilter` + `filterCooperativeId` pattern when adding tenant-scoped resources.
- `requireCooperativeAccess` (`src/middleware/cooperative.middleware.ts`) exists but is not wired into any route currently — it's dead code, not an active guard.
- Login (`POST /login`) and `GET /me` live in `user.routes.ts`, not a separate auth module.

### Data model (`backend/src/db/schema.ts`, Drizzle + Postgres/PostGIS)
`cooperatives` → `users` / `vehicles` / `collectionRoutes` (all FK'd to a cooperative). `vehicles` → `vehiclePositions` (GPS history). `streets` is the routable street network (populated externally via pgRouting/osm2pgsql tooling, not through the app) with `source`/`target`/`cost`/`reverseCost` columns pgRouting expects. `collectionRoutes` → `routeStreets` is an ordered join table (`stopOrder`, `direction`) representing the planned stop sequence of a route along the street graph.

`vehiclePositions.location` (`geometry(Point,4326)`) and `streets.geom` (`geometry(LineString,4326)`) are real PostGIS columns, modeled in `schema.ts` via a `customType` (Drizzle's built-in `geometry()` only supports Points and silently ignores SRID, so it can't represent either column correctly). The app-level contract is WKT text in/out (e.g. `"POINT(lng lat)"`): writes rely on Postgres's implicit text→geometry cast, and reads must go through `ST_AsText(...)` — see `positionColumns` in `vehicle.service.ts` for the pattern. There is currently no service reading `streets.geom`, so if one is added it needs the same `ST_AsText` treatment.

### Deployment
`render.yaml` deploys backend and frontend as separate Docker services on Render plus a managed Postgres DB, wiring `DATABASE_URL` from the DB service and `NEXT_PUBLIC_API_URL=/api` / `BACKEND_URL` between the two app services. Both services bind to `process.env.PORT` (backend defaults to 3001 per `render.yaml`/Dockerfile).
