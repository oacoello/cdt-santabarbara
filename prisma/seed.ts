import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('TuPasswordSeguro123', 10)
  
  const admin = await prisma.user.upsert({
    where: { username: 'ADMIN_TACTICO' },
    update: {},
    create: {
      username: 'ADMIN_TACTICO',
      password: hashedPassword,
      email: 'admin@tactico.santabarbara',
      rank: 'Comandante',
      role: 'ADMIN',
      canUseSim: true,
      canUseCalc: true,
      canUseArchive: true,
    },
  })

  console.log({ admin })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })