# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Route/fleet management system for waste-picker cooperatives ("recicladores") in Canoas, RS, Brazil. Cooperatives manage their vehicles and plan weekly collection routes on the street network (pgRouting); citizens find out when the truck passes their house (public map, citizen area, push notifications); trucks report GPS through the Multiportal integration. Not in production — there's no live database to migrate.

Monorepo with three independent parts, each with its own package manager and lockfile:
- `backend/` — Fastify + TypeScript REST API (pnpm)
- `frontend/` — Next.js 16 App Router UI (npm): public home, citizen area (`/citizen`), cooperative dashboard (`/dashboard`)
- `docker/postgres/` — custom Postgres image (PostGIS + pgRouting) plus the numbered init SQL scripts, which are the schema

## Commands

### Backend (run from `backend/`)
```
pnpm install
pnpm dev                    # tsx watch src/index.ts — dev server with reload
pnpm start                  # tsx src/index.ts — runs TS directly, no compiled dist/ step
pnpm db:seed                # cooperatives, admin users, vehicles, positions
pnpm streets:import         # data/canoas.osm → streets (+ pgRouting topology) — wipes routes
pnpm neighborhoods:import   # data/canoas-bairros.json → neighborhoods
pnpm openapi                # writes openapi.json (no server/DB needed)
pnpm password:hash '<pw>'   # argon2id hash for a users row created by hand
pnpm db:studio              # drizzle-kit studio
```
There is no backend test suite (`pnpm test` is a placeholder) and no lint script. Typecheck with `pnpm exec tsc --noEmit`.

### Frontend (run from `frontend/`)
```
npm install
npm run dev           # next dev
npm run build         # next build
npm run lint          # eslint
npm run api:types     # lib/api-types.ts from ../backend/openapi.json
```
No frontend test suite is configured.

### Database (run from repo root)
```
docker compose up -d db
```
Postgres 16 + PostGIS + pgRouting on `localhost:5432` (`postgres`/`postgres`, database `recicladores`). Only the DB runs in Docker; backend and frontend run locally. Fresh setup: start the DB, then in `backend/` run `db:seed`, `streets:import`, `neighborhoods:import`.

## Schema

`docker/postgres/initdb/*.sql` **is** the schema — run once, in filename order, when the DB volume is created (`001` extensions, `002` cooperatives, `003` vehicles/positions, `004` users/push subscriptions, `005` streets/routes + the ETA function, `006` announcements/images, `007` `street_side()`, `008` neighborhoods). There are no migrations: since nothing is in production, change the `CREATE TABLE`s directly (no `ADD COLUMN IF NOT EXISTS` patches). `backend/src/db/schema.ts` mirrors it by hand for typed Drizzle queries and must be kept in sync. An existing local DB volume doesn't re-run initdb — apply the change by hand or recreate the volume.

## Architecture

### Backend
Each resource lives in `backend/src/routes/<resource>/` as `<resource>.routes.ts` (Fastify plugin: routes, `preHandler` auth chain, Zod request/response schemas), `.controller.ts` (thin HTTP glue), `.service.ts` (all Drizzle queries) and `.schema.ts` (Zod schemas). New resources follow the same split.

`src/server.ts` builds the app (error handler, Swagger at `/admin/docs`, CORS, websocket, every route plugin) without listening; `src/index.ts` listens on `PORT` (3333 if unset) and starts the background jobs (`integrations/multiportal-sync.ts`, `integrations/proximity-notifier.ts`); `src/openapi.ts` writes the OpenAPI document.

**API types are generated, not hand-written.** The Zod schemas are the API contract: after changing one, run `pnpm openapi` (backend) then `npm run api:types` (frontend). `frontend/lib/types.ts` derives every API shape from the generated `lib/api-types.ts` (OpenAPI 3.1, so `[lat, lng]` tuples survive); only frontend-only shapes are written there.

**Geometry never leaves the DB as WKT.** The API speaks `{lat, lng}` points and `[lat, lng][]` lines (Leaflet's order); `src/lib/geometry.ts` builds the SQL both ways (`pointFromLatLng`, `lineLatLngs`). PostGIS columns are Drizzle `customType`s (Drizzle's `geometry()` only does Points and ignores SRID) that are never read as values.

**Drizzle gotcha:** in a single-table `select`, Drizzle renders `${table.column}` as a bare `"column"`. Inside a correlated subquery that silently binds to the subquery's own table — write `${table}.column` (see `VehicleService.findAll`'s `lastPosition`).

### Auth & multi-tenancy
- JWT (`src/lib/jwt.ts`, HS256, `JWT_SECRET` required): `{ userId, email, role, cooperativeId }`. Two roles only: `"cooperative_admin"` (the dashboard; always has a `cooperativeId`) and `"user"` (citizens, self-registered via public `POST /register`; never has one) — `users` CHECKs enforce both. **There is no global admin, by design**: cooperatives and their admin accounts are created straight in the database by whoever maintains the system (`pnpm password:hash` makes the argon2id hash `users.password` needs; README has the SQL). Emails are always lowercase (Zod normalizes, the DB has a CHECK).
- Tenant isolation (`src/middleware/auth.middleware.ts`): every dashboard endpoint is behind `requireCooperativeAdmin`, and `getCooperativeId(request)` is the caller's cooperative — services take it as a **required** `cooperativeId` and AND it into their `where`; single loaded rows are compared to it directly. Citizens get 403 on every vehicle/route/cooperative-admin endpoint. `GET /cooperatives` lists the active cooperatives to every role — directory info, used by citizens and by the "lend to…" picker.
- **Vehicle loans**: `vehicles.cooperativeId` is the owner, `loanedToCooperativeId` who currently holds it. `VehicleService.findAll`/`findVisible` let the borrower see and use it (fleet list, assigning it to a route, posting GPS); `findById`/`update`/`delete`/lending stay owner-only. Lending and returning (`POST /vehicles/:id/loan`, `.../loan/return`, both `VehicleService.setLoan`) answer `409` with the routes still using the vehicle unless `confirmUnlink: true`, which clears those routes' `vehicleId` in the same transaction. Follow this confirm-then-unlink pattern for any mutation that could silently orphan a route's vehicle.

### Routes and the street graph
`streets` is the routable network, loaded from OSM by `streets:import` (not through the app), with the `source`/`target`/`cost`/`reverseCost` pgRouting expects. A route (`collectionRoutes`: vehicle + weekly `daysOfWeek`/`shift`/`startTime`) has an ordered `routeStreets` sequence: the stops the cooperative picked (`isStop`) plus the connectors pgRouting filled in between. `POST /routes` and `PUT /routes/:id` take schedule **and** stops together (`RouteService.save`): the path is computed first (`computePath`, one `pgr_dijkstra` call for every pair of stops; an unplannable sequence throws `RoutePlanError` → 400), then the route and its streets are written in one transaction. Every stop is driven in its segment's geometry direction (source→target).

**Collection side / stretch and the citizen's address**: a cooperative can collect only one side of a block, and only part of it. Each stop carries `side` (`both` | `left` | `right`, relative to source→target) and `startFraction`/`endFraction` (0..1, the `ST_LineLocatePoint` space). A citizen's address is a house pin (`users.addressLat/Lng`) plus the segment and side they confirmed (`addressStreetId`/`addressSide`, from `GET /public/address-street`, which suggests the side with `street_side()`); the four go together or not at all. Every "is this citizen served" path — `PublicTrackingService.checkAddress` (public check, citizen screens, notifier) and `get_eta_following_route(route_id, lat, lng, street_id, side)` in `005-maps.sql` — matches on street id + `is_stop` + side + fraction range, and reports `other_side_only` when only the opposite side is collected. `addressStreetId` deliberately has no FK: `streets:import` TRUNCATEs `streets` with CASCADE (which would wipe `users`) and nulls every user's street/side instead, since ids restart.

**Address search** (`GET /public/geocode`, matching in `src/lib/street-search.ts`) queries `streets.name` — plus `streets.neighborhood_names`, so a bairro can be typed along with the street — never an external geocoder (the public Nominatim API forbids search-as-you-type). It's street-level only; the citizen then taps their house. Keep the JS (`normalizeStreetText`) and SQL (`normalizedStreetName`) name folding in sync.

**Bairros**: `neighborhoods` holds the 18 bairro boundaries (`neighborhoods:import` from `backend/data/canoas-bairros.json`, see `backend/data/README.md`). A point's bairro is `ST_Intersects` against them — use the house/cooperative pin, not the street segment, since a border street belongs to both. `streets.neighborhood_names` is a derived copy for the search, recomputed by both imports (`src/db/street-neighborhoods.ts`).

### Tracking and notifications
GPS comes from the Multiportal sync (or `POST /vehicles/:id/positions` for testing) through `lib/position-ingest.ts`, which stores the position and broadcasts it on the public `/ws/tracking` websocket. A citizen has proximity notifications on while they have at least one push subscription (`/me` reports it as `notifyProximity`); turning them off deletes all of them. The notifier runs every minute, only for citizens whose stop is on a route that started today, and records `users.proximity_notified_on` so each collection notifies once.

### Announcements
Images live in `announcement_images` (bytes), served publicly by `GET /announcement-images/:id` with an immutable cache header; the feed only carries their ids. Uploads still arrive as base64 data URLs (hence the 6MB body limits in Fastify and Next server actions); on update, an omitted image is kept and `null` removes it.

### Frontend
The dashboard layout turns away anyone but a cooperative_admin; dashboard pages call `requireCooperativeAdmin()` (`lib/auth.ts`) for the token and their non-null `cooperativeId`. `lib/data.ts` holds the server-only typed API calls (`apiFetch` in `lib/api.ts`, always with the signed-in user's own token from the httpOnly session cookie); `lib/public-api.ts` is the client-side counterpart for anonymous endpoints, through the `/api` rewrite in `next.config.ts`. Every map renders `app/base-map.tsx` (OSM tiles + attribution) and is loaded through a `next/dynamic({ ssr: false })` wrapper (Leaflet needs `window`). Live positions come from `lib/use-fleet-tracking.ts` (`useVehicleTracking` is its one-vehicle case).
