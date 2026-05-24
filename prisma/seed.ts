import "dotenv/config"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error("DATABASE_URL não definida.")

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD

  if (!email || !password) {
    throw new Error(
      "ADMIN_BOOTSTRAP_EMAIL e ADMIN_BOOTSTRAP_PASSWORD são obrigatórios no .env"
    )
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`✓ Admin já existe (${email}), pulando seed.`)
    return
  }

  const passwordHash = await hash(password, 12)
  const admin = await prisma.user.create({
    data: {
      name: "Admin",
      email,
      passwordHash,
      isSystemAdmin: true,
      mustChangePassword: true,
    },
  })

  console.log(`✓ Admin criado: ${admin.email} (id: ${admin.id})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
