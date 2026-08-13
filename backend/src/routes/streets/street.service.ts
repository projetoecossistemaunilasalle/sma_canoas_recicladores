import { and, eq, ilike, inArray, sql } from "drizzle-orm"
import { db } from "../../db"
import { streets } from "../../db/schema"

const streetColumns = {
  id: streets.id,
  name: streets.name,
  geom: sql<string>`ST_AsText(${streets.geom})`.as("geom"),
  highwayType: streets.highwayType,
  requiresCollection: streets.requiresCollection,
  lengthKm: streets.lengthKm,
  source: streets.source,
  target: streets.target,
}

export class StreetService {
  async search(search: string | undefined, limit: number) {
    const conditions = [eq(streets.requiresCollection, true)]
    if (search) conditions.push(ilike(streets.name, `%${search}%`))

    return db
      .select(streetColumns)
      .from(streets)
      .where(and(...conditions))
      .orderBy(streets.name)
      .limit(limit)
  }

  async findById(id: number) {
    const [street] = await db.select(streetColumns).from(streets).where(eq(streets.id, id)).limit(1)
    return street ?? null
  }

  async findByIds(ids: number[]) {
    if (ids.length === 0) return []
    return db.select(streetColumns).from(streets).where(inArray(streets.id, ids))
  }

  async findNearest(lat: number, lng: number) {
    const point = sql`ST_SetSRID(ST_MakePoint(${lng}::double precision, ${lat}::double precision), 4326)`
    const [street] = await db
      .select(streetColumns)
      .from(streets)
      .where(eq(streets.requiresCollection, true))
      .orderBy(sql`${streets.geom} <-> ${point}`)
      .limit(1)
    return street ?? null
  }
}
