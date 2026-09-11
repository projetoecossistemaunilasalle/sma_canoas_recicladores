import { sql } from "drizzle-orm"
import { db } from "../db"

// Server process time zone isn't guaranteed to match Canoas/Brazil (e.g. a
// UTC container), so "today"/"now" for weekly-schedule comparisons are read
// from Postgres (whose session time zone is configured for the app) rather
// than from `new Date()`. Shared by public-tracking.service.ts (per-street
// ETA) and route.service.ts (per-route "running now" status).
export async function getTodayContext(): Promise<{ today: string; nowTime: string }> {
  const result = await db.execute<{ today: string; now_time: string }>(sql`
    SELECT
      (CASE EXTRACT(ISODOW FROM CURRENT_DATE)
        WHEN 1 THEN 'seg' WHEN 2 THEN 'ter' WHEN 3 THEN 'qua'
        WHEN 4 THEN 'qui' WHEN 5 THEN 'sex' WHEN 6 THEN 'sab'
        WHEN 7 THEN 'dom'
      END) AS today,
      LOCALTIME::text AS now_time
  `)
  const row = result.rows[0]
  return { today: row.today, nowTime: row.now_time }
}
