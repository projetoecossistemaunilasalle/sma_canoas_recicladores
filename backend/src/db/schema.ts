import { pgTable, uuid, text, boolean, timestamp, integer, doublePrecision, serial, bigint, date, time, customType } from "drizzle-orm/pg-core"
import type { Role } from "../lib/jwt"

// PostGIS columns. Drizzle's built-in geometry() only does Points and ignores
// the SRID, so these are custom types. The app never reads or writes them
// as values: writes pass a SQL expression (ST_SetSRID(ST_MakePoint(...))),
// reads go through the helpers in lib/geometry.ts — the API speaks
// {lat, lng} and [lat, lng][], never WKT.
const geometryPoint = customType<{ data: string }>({
  dataType() {
    return "geometry(Point,4326)"
  },
})

const geometryLineString = customType<{ data: string }>({
  dataType() {
    return "geometry(LineString,4326)"
  },
})

const geometryMultiPolygon = customType<{ data: string }>({
  dataType() {
    return "geometry(MultiPolygon,4326)"
  },
})

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return "bytea"
  },
})

// ============================================
// COOPERATIVES
// ============================================
export const cooperatives = pgTable("cooperatives", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  cnpj: text("cnpj").unique(),
  phone: text("phone"),
  address: text("address"),
  instagram: text("instagram"),
  website: text("website"),
  // Pin for the citizen-facing maps (the address itself is free text).
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// ============================================
// USERS
// ============================================
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  // Always lowercase (the API normalizes; the DB has a CHECK).
  email: text("email").unique().notNull(),
  // A cooperative_admin signs in with a password (argon2id hash); a citizen
  // only with their Google account, matched by its stable `sub` (CHECK).
  password: text("password"),
  googleSub: text("google_sub").unique(),
  // "user" (citizen) or "cooperative_admin" — no global admin; a
  // cooperative_admin always has a cooperativeId and a citizen never does (CHECKs).
  role: text("role").$type<Role>().notNull().default("user"),
  active: boolean("active").notNull().default(true),
  cooperativeId: uuid("cooperative_id").references(() => cooperatives.id),
  address: text("address"),
  addressNumber: text("address_number"),
  // The citizen's house pin, plus the segment it sits on and which side
  // ('left' | 'right', relative to source→target) — confirmed by the citizen
  // and compared directly against routeStreets.streetId/side. The four go
  // together or not at all. Deliberately no FK to streets: import-streets
  // TRUNCATEs streets with CASCADE, which would wipe this whole table.
  addressLat: doublePrecision("address_lat"),
  addressLng: doublePrecision("address_lng"),
  addressStreetId: integer("address_street_id"),
  addressSide: text("address_side"),
  // Last day the "truck is arriving" push went out — one per collection,
  // and survives a backend restart (see proximity-notifier.ts).
  proximityNotifiedOn: date("proximity_notified_on"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// ============================================
// PUSH SUBSCRIPTIONS (Web Push) — having one is what turns proximity
// notifications on for a citizen.
// ============================================
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// ============================================
// VEHICLES
// ============================================
export const vehicles = pgTable("vehicles", {
  id: uuid("id").primaryKey().defaultRandom(),
  plate: text("plate").unique(),
  model: text("model"),
  color: text("color"),
  type: text("type").notNull().default("caminhao"), // 'caminhao' | 'bicicleta'
  cooperativeId: uuid("cooperative_id").notNull().references(() => cooperatives.id),
  loanedToCooperativeId: uuid("loaned_to_cooperative_id").references(() => cooperatives.id),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// ============================================
// VEHICLE POSITIONS
// ============================================
export const vehiclePositions = pgTable("vehicle_positions", {
  id: uuid("id").primaryKey().defaultRandom(),
  vehicleId: uuid("vehicle_id").references(() => vehicles.id, { onDelete: "cascade" }),
  location: geometryPoint("location").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
})

// ============================================
// STREETS
// ============================================
export const streets = pgTable("streets", {
  id: serial("id").primaryKey(),
  osmId: bigint("osm_id", { mode: "number" }),
  name: text("name"),
  geom: geometryLineString("geom").notNull(),
  source: integer("source"),
  target: integer("target"),
  cost: doublePrecision("cost"),
  reverseCost: doublePrecision("reverse_cost"),
  lengthKm: doublePrecision("length_km"),
  requiresCollection: boolean("requires_collection").default(false),
  oneway: boolean("oneway").default(false),
  highwayType: text("highway_type"),
  // Bairro(s) the segment's midpoint is in (both, for a border street) —
  // derived, see street-neighborhoods.ts.
  neighborhoodNames: text("neighborhood_names").array(),
})

// ============================================
// NEIGHBORHOODS (bairros)
// ============================================
// Populated by `pnpm neighborhoods:import` from OSM boundaries, not through
// the app (see 008-neighborhoods.sql).
export const neighborhoods = pgTable("neighborhoods", {
  id: serial("id").primaryKey(),
  osmId: bigint("osm_id", { mode: "number" }),
  name: text("name").notNull(),
  geom: geometryMultiPolygon("geom").notNull(),
})

// ============================================
// COLLECTION ROUTES
// ============================================
export const collectionRoutes = pgTable("collection_routes", {
  id: uuid("id").primaryKey().defaultRandom(),
  vehicleId: uuid("vehicle_id").references(() => vehicles.id),
  cooperativeId: uuid("cooperative_id").notNull().references(() => cooperatives.id),
  totalDistanceKm: doublePrecision("total_distance_km"),
  totalDurationSeconds: doublePrecision("total_duration_seconds"),
  // Recurring weekly schedule: e.g. daysOfWeek = ["seg","qua"], shift = "manha", startTime = "08:00"
  daysOfWeek: text("days_of_week").array(),
  shift: text("shift"), // 'manha' | 'tarde' | 'noite'
  startTime: time("start_time"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// ============================================
// ROUTE STREETS
// ============================================
export const routeStreets = pgTable("route_streets", {
  id: uuid("id").primaryKey().defaultRandom(),
  routeId: uuid("route_id").notNull().references(() => collectionRoutes.id, { onDelete: "cascade" }),
  streetId: integer("street_id").notNull().references(() => streets.id),
  stopOrder: integer("stop_order").notNull(),
  direction: text("direction").default("forward"), // 'forward' or 'reverse'
  // true for the streets the cooperative actually picked as stops; false for
  // the connector segments pgr_dijkstra filled in between them. Lets the
  // route-edit UI re-show only what the user originally drew.
  isStop: boolean("is_stop").notNull().default(false),
  // Only meaningful on stops: which side of the segment is collected
  // ('both' | 'left' | 'right', relative to source→target — the direction
  // computePath always drives a stop in) and which stretch of it
  // (0..1 along the geometry, same space as ST_LineLocatePoint).
  side: text("side").notNull().default("both"),
  startFraction: doublePrecision("start_fraction").notNull().default(0),
  endFraction: doublePrecision("end_fraction").notNull().default(1),
})

// ============================================
// ANNOUNCEMENTS (avisos / notícias)
// ============================================
export const announcements = pgTable("announcements", {
  id: uuid("id").primaryKey().defaultRandom(),
  cooperativeId: uuid("cooperative_id").notNull().references(() => cooperatives.id),
  type: text("type").notNull().default("aviso"), // 'aviso' | 'noticia'
  title: text("title"),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// Up to 3 images per announcement, served by URL (GET /announcement-images/:id).
// Replacing one inserts a new row, so an image's URL never changes content
// and can be cached forever.
export const announcementImages = pgTable("announcement_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  announcementId: uuid("announcement_id").notNull().references(() => announcements.id, { onDelete: "cascade" }),
  slot: text("slot").notNull(), // 'main' | 'sub1' | 'sub2'
  mime: text("mime").notNull(),
  data: bytea("data").notNull(),
})

// Types
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert
export type Vehicle = typeof vehicles.$inferSelect
export type NewVehicle = typeof vehicles.$inferInsert
export type CollectionRoute = typeof collectionRoutes.$inferSelect
export type NewCooperative = typeof cooperatives.$inferInsert
