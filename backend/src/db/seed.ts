import { db } from "./index"
import { cooperatives, users, vehicles, vehiclePositions } from "./schema"
import { hashPassword } from "../lib/password"

async function seed() {
  console.log("🌱 Seeding database...")

  // ============================================
  // 1. COOPERATIVES
  // ============================================
  const coopNames = [
    "Coopcamate",
    "Renascer",
    "Cooarlas",
    "Coopermag",
    "Coopersol",
    "CMGC",
    "Coopertec",
    "Mãos Dadas",
  ]

  // Real contact/location info supplied for 6 of the above. Coordinates were
  // geocoded via Nominatim (same service backing /public/geocode), biased to
  // Canoas; Mãos Dadas and Coopermag only resolved to neighborhood/landmark
  // precision (exact address not in OSM) — correctable later via each
  // cooperative's own self-edit screen (PUT /cooperatives/:id).
  const coopDetails: Record<
    string,
    { cnpj?: string; phone?: string; address?: string; lat?: number; lng?: number }
  > = {
    Renascer: {
      cnpj: "13.577.932/0001-43",
      phone: "51 99281985",
      address: "Estrada do Nazario, 3303",
      lat: -29.9047642,
      lng: -51.1297268,
    },
    Coopertec: {
      cnpj: "17.681.134/0001-18",
      phone: "51 984169301",
      address: "Rua Primavera, 198, Rio Branco",
      lat: -29.9650022,
      lng: -51.2030159,
    },
    "Mãos Dadas": {
      cnpj: "19.502.991/0001-39",
      address: "Rua Edy Frederico Link, 85, Bairro Fátima",
      lat: -29.9448424,
      lng: -51.1867844,
    },
    Coopermag: {
      cnpj: "13.502.010/0001-77",
      address: "Rua Maria Elizabeth Finkler, S/N, em frente ao 270, Bairro Mato Grande",
      lat: -29.9368266,
      lng: -51.2021416,
    },
    CMGC: {
      cnpj: "43.590.573/0001-25",
      address: "Rua Engenheiro Kindler, 1261",
      lat: -29.9139447,
      lng: -51.2108885,
    },
    Coopersol: {
      cnpj: "16.646.801/0001-69",
      address: "Rua Washington Luiz, 165, Bairro Niterói, Canoas-RS",
      lat: -29.9650632,
      lng: -51.1710547,
    },
  }

  for (const name of coopNames) {
    const details = coopDetails[name]
    if (details) {
      await db
        .insert(cooperatives)
        .values({ name, ...details })
        .onConflictDoUpdate({ target: cooperatives.name, set: details })
    } else {
      await db.insert(cooperatives).values({ name }).onConflictDoNothing({ target: cooperatives.name })
    }
  }

  const allCoops = await db.select().from(cooperatives)
  const coopMap = new Map(allCoops.map(c => [c.name, c.id]))

  // ============================================
  // 2. USERS
  // ============================================
  const admins = [
    { email: "admin@coopcamate.com", coop: "Coopcamate" },
    { email: "admin@renascer.com", coop: "Renascer" },
    { email: "admin@cooarlas.com", coop: "Cooarlas" },
    { email: "admin@coopermag.com", coop: "Coopermag" },
    { email: "admin@coopersol.com", coop: "Coopersol" },
    { email: "admin@cmgc.com", coop: "CMGC" },
    { email: "admin@coopertec.com", coop: "Coopertec" },
    { email: "admin@maosdadas.com", coop: "Mãos Dadas" },
  ]

  for (const a of admins) {
    await db
      .insert(users)
      .values({
        name: "Admin",
        email: a.email,
        password: await hashPassword("password"),
        role: "cooperative_admin",
        cooperativeId: coopMap.get(a.coop)!,
      })
      .onConflictDoNothing({ target: users.email })
  }

  await db
    .insert(users)
    .values({
      name: "User",
      email: "user@example.com",
      password: await hashPassword("password"),
      role: "user",
    })
    .onConflictDoNothing({ target: users.email })

  // ============================================
  // 3. VEHICLES
  // ============================================
  const vehicleData = [
    { plate: "TQQ8I27", model: "Truck", color: "White", coop: "Coopcamate" },
    { plate: "IRG3B70", model: "Truck", color: "White", coop: "Coopcamate" },
    { plate: "ILP1F49", model: "Truck", color: "White", coop: "Coopcamate" },
    { plate: "IBW5F26", model: "Truck", color: "White", coop: "Coopcamate" },
    { plate: "IKQ3D59", model: "Truck", color: "Blue", coop: "Renascer" },
    { plate: "ITM6I78", model: "Truck", color: "Blue", coop: "Renascer" },
    { plate: "UIX3A70", model: "Truck", color: "Blue", coop: "Renascer" },
    { plate: "LXH5I27", model: "Truck", color: "White", coop: "Cooarlas" },
    { plate: "ITM6I76", model: "Truck", color: "White", coop: "Cooarlas" },
    { plate: "IJI6D69", model: "Truck", color: "Green", coop: "Coopermag" },
    { plate: "TQQ8A19", model: "Truck", color: "Green", coop: "Coopermag" },
    { plate: "IOW2E82", model: "Truck", color: "Green", coop: "Coopermag" },
    { plate: "IQJ9774", model: "Truck", color: "Silver", coop: "Coopersol" },
    { plate: "IBJ7D85", model: "Truck", color: "White", coop: "CMGC" },
    { plate: "TQROC37", model: "Truck", color: "White", coop: "CMGC" },
    { plate: "UIX3B41", model: "Truck", color: "Red", coop: "Coopertec" },
    { plate: "INY4F75", model: "Truck", color: "Red", coop: "Coopertec" },
    { plate: "IRQ2B89", model: "Truck", color: "Red", coop: "Coopertec" },
    { plate: "CBL3F92", model: "Truck", color: "Yellow", coop: "Mãos Dadas" },
    { plate: "TQQ8A18", model: "Truck", color: "Yellow", coop: "Mãos Dadas" },
    { plate: "JDL4I58", model: "Truck", color: "Yellow", coop: "Mãos Dadas" },
  ]

  for (const v of vehicleData) {
    await db
      .insert(vehicles)
      .values({
        plate: v.plate,
        model: v.model,
        color: v.color,
        cooperativeId: coopMap.get(v.coop)!,
      })
      .onConflictDoNothing({ target: vehicles.plate })
  }

  const allVehicles = await db.select().from(vehicles)
  const vehicleMap = new Map(allVehicles.map(v => [v.plate, v.id]))

  // ============================================
  // 4. VEHICLE POSITIONS
  // ============================================
  const positions = [
    { plate: "TQQ8I27", point: "POINT(-51.218 -29.918)" },
    { plate: "IRG3B70", point: "POINT(-51.219 -29.919)" },
    { plate: "ILP1F49", point: "POINT(-51.220 -29.920)" },
    { plate: "IBW5F26", point: "POINT(-51.221 -29.921)" },
    { plate: "IKQ3D59", point: "POINT(-51.222 -29.922)" },
    { plate: "ITM6I78", point: "POINT(-51.223 -29.923)" },
    { plate: "UIX3A70", point: "POINT(-51.224 -29.924)" },
    { plate: "LXH5I27", point: "POINT(-51.225 -29.925)" },
    { plate: "ITM6I76", point: "POINT(-51.226 -29.926)" },
    { plate: "IJI6D69", point: "POINT(-51.227 -29.927)" },
    { plate: "TQQ8A19", point: "POINT(-51.228 -29.928)" },
    { plate: "IOW2E82", point: "POINT(-51.229 -29.929)" },
    { plate: "IQJ9774", point: "POINT(-51.230 -29.930)" },
    { plate: "IBJ7D85", point: "POINT(-51.231 -29.931)" },
    { plate: "TQROC37", point: "POINT(-51.232 -29.932)" },
    { plate: "UIX3B41", point: "POINT(-51.233 -29.933)" },
    { plate: "INY4F75", point: "POINT(-51.234 -29.934)" },
    { plate: "IRQ2B89", point: "POINT(-51.235 -29.935)" },
    { plate: "CBL3F92", point: "POINT(-51.236 -29.936)" },
    { plate: "TQQ8A18", point: "POINT(-51.237 -29.937)" },
    { plate: "JDL4I58", point: "POINT(-51.238 -29.938)" },
  ]

  for (const p of positions) {
    const vid = vehicleMap.get(p.plate)
    if (vid) {
      await db.insert(vehiclePositions).values({
        vehicleId: vid,
        location: p.point,
      })
    }
  }

  console.log("✅ Seed completed successfully!")
  console.log(`   - ${coopNames.length} cooperatives`)
  console.log(`   - ${admins.length + 1} users`)
  console.log(`   - ${vehicleData.length} vehicles`)
  console.log(`   - ${positions.length} positions`)
  process.exit(0)
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err)
  process.exit(1)
})