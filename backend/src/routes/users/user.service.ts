import { eq, sql } from "drizzle-orm"
import { db } from "../../db"
import { users, pushSubscriptions, type NewUser, type NewPushSubscription } from "../../db/schema"
import type { GoogleIdentity } from "../../lib/google-auth"

const profileColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  active: users.active,
  cooperativeId: users.cooperativeId,
  address: users.address,
  addressNumber: users.addressNumber,
  addressLat: users.addressLat,
  addressLng: users.addressLng,
  addressStreetId: users.addressStreetId,
  addressSide: users.addressSide,
}

export class UserService {
  async findByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
    return user ?? null
  }

  /** The signed-in user's own profile, as GET/PUT /me return it. */
  async findProfile(id: string) {
    const [user] = await db
      .select({
        ...profileColumns,
        // Table-qualified on purpose: in a single-table select Drizzle renders
        // ${users.id} as a bare "id", which here would mean ps.id.
        notifyProximity: sql<boolean>`EXISTS (SELECT 1 FROM ${pushSubscriptions} ps WHERE ps.user_id = ${users}.id)`,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1)
    return user ?? null
  }

  async findByGoogleSub(sub: string) {
    const [user] = await db.select().from(users).where(eq(users.googleSub, sub)).limit(1)
    return user ?? null
  }

  /**
   * The citizen a Google account signs in as, created on its first sign-in.
   * Matched by `sub`, never by email — an existing account with the same
   * email (a cooperative's) must not be taken over through Google. null when
   * the email already belongs to another account.
   */
  async findOrCreateGoogleUser({ sub, email, name }: GoogleIdentity) {
    const existing = await this.findByGoogleSub(sub)
    if (existing) return existing

    const [created] = await db
      .insert(users)
      .values({ name, email, googleSub: sub, role: "user" })
      .onConflictDoNothing()
      .returning()
    // A conflict is either that email, or this same account's first sign-in
    // racing another one.
    return created ?? (await this.findByGoogleSub(sub))
  }

  async update(id: string, data: Partial<NewUser>) {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({ id: users.id })
    return user ?? null
  }

  // Push subscriptions (Web Push, for proximity notifications)
  async savePushSubscription(data: NewPushSubscription) {
    await db
      .insert(pushSubscriptions)
      .values(data)
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: { userId: data.userId, p256dh: data.p256dh, auth: data.auth },
      })
  }

  async deletePushSubscriptions(userId: string) {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId))
  }

  async findPushSubscriptions(userId: string) {
    return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId))
  }
}
