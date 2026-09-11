import { z } from "zod"

// Matches the day mapping used by get_eta_following_route() in
// docker/postgres/initdb/005-maps.sql (EXTRACT(ISODOW ...) 1=Monday..7=Sunday).
// Single source of truth for the seg/ter/qua/qui/sex/sab/dom vocabulary used
// across route scheduling (route.schema.ts), the loan-conflict route
// description (vehicle.service.ts), and the "next occurrence" lookup
// (public-tracking.service.ts).
const WEEKDAY_VALUES = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"] as const

// Widened to plain string[] so callers can .indexOf()/.includes() against
// values read back from the DB (typed as `string`) without a cast; the
// literal tuple above is still what backs the exhaustive Zod enum.
export const WEEKDAY_ORDER: readonly string[] = WEEKDAY_VALUES

export const weekdaySchema = z.enum(WEEKDAY_VALUES)

export const WEEKDAY_LABELS: Record<string, string> = {
  seg: "Seg",
  ter: "Ter",
  qua: "Qua",
  qui: "Qui",
  sex: "Sex",
  sab: "Sáb",
  dom: "Dom",
}
