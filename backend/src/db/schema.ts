import { pgTable, uuid, text, boolean, timestamp, integer, doublePrecision, serial, bigint, date, time, customType } from "drizzle-orm/pg-core"
import { relations, sql } from "drizzle-orm"

// WKT text in/out (e.g. "POINT(lng lat)"); reads must go through ST_AsText, see vehicle.service.ts
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
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"),
  active: boolean("active").notNull().default(true),
  cooperativeId: uuid("cooperative_id").references(() => cooperatives.id),
  address: text("address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
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
  cooperativeId: uuid("cooperative_id").references(() => cooperatives.id),
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
})

// ============================================
// COLLECTION ROUTES
// ============================================
export const collectionRoutes = pgTable("collection_routes", {
  id: uuid("id").primaryKey().defaultRandom(),
  vehicleId: uuid("vehicle_id").references(() => vehicles.id),
  cooperativeId: uuid("cooperative_id").references(() => cooperatives.id),
  status: text("status").default("planned"),
  totalDistanceKm: doublePrecision("total_distance_km"),
  totalDurationSeconds: doublePrecision("total_duration_seconds"),
  scheduledDate: date("scheduled_date"),
  // Recurring weekly schedule: e.g. daysOfWeek = ["seg","qua"], shift = "manha", startTime = "08:00"
  daysOfWeek: text("days_of_week").array(),
  shift: text("shift"), // 'manha' | 'tarde' | 'noite'
  startTime: time("start_time"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
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
  distanceFromPreviousKm: doublePrecision("distance_from_previous_km"),
  durationFromPreviousSeconds: doublePrecision("duration_from_previous_seconds"),
  // true for the streets the cooperative actually picked as stops; false for
  // the connector segments pgr_dijkstra filled in between them. Lets the
  // route-edit UI re-show only what the user originally drew.
  isStop: boolean("is_stop").notNull().default(false),
})

// ============================================
// RELATIONS
// ============================================
export const cooperativesRelations = relations(cooperatives, ({ many }) => ({
  users: many(users),
  vehicles: many(vehicles),
  routes: many(collectionRoutes),
}))

export const usersRelations = relations(users, ({ one }) => ({
  cooperative: one(cooperatives, {
    fields: [users.cooperativeId],
    references: [cooperatives.id],
  }),
}))

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  cooperative: one(cooperatives, {
    fields: [vehicles.cooperativeId],
    references: [cooperatives.id],
  }),
  positions: many(vehiclePositions),
  routes: many(collectionRoutes),
}))

export const vehiclePositionsRelations = relations(vehiclePositions, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [vehiclePositions.vehicleId],
    references: [vehicles.id],
  }),
}))

export const collectionRoutesRelations = relations(collectionRoutes, ({ one, many }) => ({
  vehicle: one(vehicles, {
    fields: [collectionRoutes.vehicleId],
    references: [vehicles.id],
  }),
  cooperative: one(cooperatives, {
    fields: [collectionRoutes.cooperativeId],
    references: [cooperatives.id],
  }),
  routeStreets: many(routeStreets),
}))

export const routeStreetsRelations = relations(routeStreets, ({ one }) => ({
  route: one(collectionRoutes, {
    fields: [routeStreets.routeId],
    references: [collectionRoutes.id],
  }),
  street: one(streets, {
    fields: [routeStreets.streetId],
    references: [streets.id],
  }),
}))

// Types
export type Cooperative = typeof cooperatives.$inferSelect
export type NewCooperative = typeof cooperatives.$inferInsert
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Vehicle = typeof vehicles.$inferSelect
export type NewVehicle = typeof vehicles.$inferInsert
export type VehiclePosition = typeof vehiclePositions.$inferSelect
export type NewVehiclePosition = typeof vehiclePositions.$inferInsert
export type Street = typeof streets.$inferSelect
export type NewStreet = typeof streets.$inferInsert
export type CollectionRoute = typeof collectionRoutes.$inferSelect
export type NewCollectionRoute = typeof collectionRoutes.$inferInsert
export type RouteStreet = typeof routeStreets.$inferSelect
export type NewRouteStreet = typeof routeStreets.$inferInsert