import { eq, and } from "drizzle-orm"
import { db } from "../../db"
import { users, pushSubscriptions, type NewUser, type NewPushSubscription } from "../../db/schema"
import { hashPassword } from "../../lib/password"

export class UserService {
  async findAll(filterCooperativeId?: string) {
    if (filterCooperativeId) {
      return db.select().from(users).where(eq(users.cooperativeId, filterCooperativeId))
    }
    return db.select().from(users)
  }

  async findById(id: string, filterCooperativeId?: string) {
    let query = db.select().from(users).where(eq(users.id, id)).limit(1)
    if (filterCooperativeId) {
      query = db.select().from(users).where(and(eq(users.id, id), eq(users.cooperativeId, filterCooperativeId))).limit(1)
    }
    const [user] = await query
    return user ?? null
  }

  async findByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
    return user ?? null
  }

  async create(data: NewUser) {
    const payload = { ...data }
    if (data.password) {
      payload.password = await hashPassword(data.password)
    }
    const [user] = await db.insert(users).values(payload).returning()
    return user
  }

  async update(id: string, data: Partial<NewUser>, filterCooperativeId?: string) {
    const payload = { ...data, updatedAt: new Date() }
    if (data.password) {
      payload.password = await hashPassword(data.password)
    }

    let query
    if (filterCooperativeId) {
      query = db
        .update(users)
        .set(payload)
        .where(and(eq(users.id, id), eq(users.cooperativeId, filterCooperativeId)))
        .returning()
    } else {
      query = db.update(users).set(payload).where(eq(users.id, id)).returning()
    }

    const [user] = await query
    return user ?? null
  }

  async delete(id: string, filterCooperativeId?: string) {
    let query
    if (filterCooperativeId) {
      query = db.delete(users).where(and(eq(users.id, id), eq(users.cooperativeId, filterCooperativeId))).returning()
    } else {
      query = db.delete(users).where(eq(users.id, id)).returning()
    }
    const [user] = await query
    return user ?? null
  }

  // Push subscriptions (Web Push, for proximity notifications)
  async savePushSubscription(data: NewPushSubscription) {
    const [sub] = await db
      .insert(pushSubscriptions)
      .values(data)
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: { userId: data.userId, p256dh: data.p256dh, auth: data.auth },
      })
      .returning()
    return sub
  }

  async deletePushSubscription(userId: string, endpoint: string) {
    await db
      .delete(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)))
  }

  async findPushSubscriptions(userId: string) {
    return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId))
  }
}
