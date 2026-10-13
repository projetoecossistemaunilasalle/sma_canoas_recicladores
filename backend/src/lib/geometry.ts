import { sql, type AnyColumn, type SQL } from "drizzle-orm"

// The API speaks {lat, lng} and [lat, lng][] (Leaflet's order) — PostGIS
// geometry never leaves the DB as WKT. These build the SQL for both ways.

export function pointFromLatLng(lat: number, lng: number): SQL {
  return sql`ST_SetSRID(ST_MakePoint(${lng}::double precision, ${lat}::double precision), 4326)`
}

/** A LineString column as a JSON [lat, lng][] (node-postgres parses it). */
export function lineLatLngs(column: AnyColumn | SQL): SQL<[number, number][]> {
  return sql<[number, number][]>`(
    SELECT json_agg(json_build_array(ST_Y(dp.geom), ST_X(dp.geom)) ORDER BY dp.path)
    FROM ST_DumpPoints(${column}) dp
  )`
}
