import { eq, and } from "drizzle-orm"
import { db } from "../../db"
import { users, pushSubscriptions, type NewUser, type NewPushSubscription } from "../../db/schema"
import { hashPassword } from "../../lib/password"
import { scopeCondition } from "../../lib/db-scope"

export class UserService {
  async findAll(filterCooperativeId?: string) {
    return db.select().from(users).where(scopeCondition(undefined, users.cooperativeId, filterCooperativeId))
  }

  async findById(id: string, filterCooperativeId?: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(scopeCondition(eq(users.id, id), users.cooperativeId, filterCooperativeId))
      .limit(1)
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

    const [user] = await db
      .update(users)
      .set(payload)
      .where(scopeCondition(eq(users.id, id), users.cooperativeId, filterCooperativeId))
      .returning()
    return user ?? null
  }

  async delete(id: string, filterCooperativeId?: string) {
    const [user] = await db
      .delete(users)
      .where(scopeCondition(eq(users.id, id), users.cooperativeId, filterCooperativeId))
      .returning()
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
