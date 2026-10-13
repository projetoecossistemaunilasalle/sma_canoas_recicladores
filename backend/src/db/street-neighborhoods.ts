import { sql, type SQL } from "drizzle-orm"

// ~10m (in degrees) of slack around a segment's midpoint, so a border
// street — drawn right on the line dividing two bairros — lands in both.
const BORDER_SLACK_DEG = 0.0001

// Fills streets.neighborhood_names, which the address search matches and
// shows bairros from. Both imports call this: streets are re-created from
// scratch on every streets:import, and bairro limits can change.
export async function assignStreetNeighborhoods(executor: { execute(query: SQL): Promise<unknown> }) {
  await executor.execute(sql`
    UPDATE streets s SET neighborhood_names = (
      SELECT array_agg(n.name ORDER BY n.name)
      FROM neighborhoods n
      WHERE ST_DWithin(n.geom, ST_LineInterpolatePoint(s.geom, 0.5), ${BORDER_SLACK_DEG})
    )
  `)
}
