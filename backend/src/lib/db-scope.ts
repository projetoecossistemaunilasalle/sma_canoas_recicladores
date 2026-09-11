import { and, eq, type AnyColumn, type SQL } from "drizzle-orm"

/**
 * ANDs a tenant filter (`eq(filterColumn, filterId)`) onto `base` when
 * `filterId` is present, otherwise returns `base` unchanged (or `undefined`
 * for "no filter at all", which Drizzle's `.where()` treats as no-op) — the
 * `let query; if (filter) {...} else {...}` shape every tenant-scoped
 * service's findAll/findById/update/delete repeated.
 */
export function scopeCondition(base: SQL | undefined, filterColumn: AnyColumn, filterId: string | undefined): SQL | undefined {
  if (!filterId) return base
  const scoped = eq(filterColumn, filterId)
  return base ? and(base, scoped) : scoped
}
