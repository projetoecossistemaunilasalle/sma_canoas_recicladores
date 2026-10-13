import { z } from "zod"

// The seg/ter/qua/qui/sex/sab/dom vocabulary of route schedules — matches the
// EXTRACT(ISODOW ...) 1=Monday..7=Sunday mapping in lib/schedule.ts.
const WEEKDAY_VALUES = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"] as const

// Widened to plain string[] so callers can .indexOf()/.includes() against
// values read back from the DB (typed as `string`) without a cast; the
// literal tuple above is still what backs the exhaustive Zod enum.
export const WEEKDAY_ORDER: readonly string[] = WEEKDAY_VALUES

export const weekdaySchema = z.enum(WEEKDAY_VALUES)
