import { eq, inArray, sql } from "drizzle-orm"
import { db } from "../../db"
import { streets } from "../../db/schema"
import { lineLatLngs, pointFromLatLng } from "../../lib/geometry"

const streetColumns = {
  id: streets.id,
  name: streets.name,
  line: lineLatLngs(streets.geom).as("line"),
}

export class StreetService {
  async findById(id: number) {
    const [street] = await db.select(streetColumns).from(streets).where(eq(streets.id, id)).limit(1)
    return street ?? null
  }

  async findByIds(ids: number[]) {
    if (ids.length === 0) return []
    return db.select(streetColumns).from(streets).where(inArray(streets.id, ids))
  }

  async findNearest(lat: number, lng: number) {
    const [street] = await db
      .select(streetColumns)
      .from(streets)
      .where(eq(streets.requiresCollection, true))
      .orderBy(sql`${streets.geom} <-> ${pointFromLatLng(lat, lng)}`)
      .limit(1)
    return street ?? null
  }
}
