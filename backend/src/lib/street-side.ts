import { z } from "zod"

// Sides are always relative to a street segment's own geometry direction
// (source→target) — see street_side() in docker/postgres/initdb/007-collection-sides.sql.

// Which side of a stop a route collects.
export const collectionSideSchema = z.enum(["both", "left", "right"])

// Which side of a segment a citizen's house is on.
export const houseSideSchema = z.enum(["left", "right"])

export type CollectionSide = z.infer<typeof collectionSideSchema>
export type HouseSide = z.infer<typeof houseSideSchema>
