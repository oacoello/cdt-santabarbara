import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const databaseUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const adapter = new PrismaBetterSqlite3({ url: databaseUrl });

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  databaseReady?: Promise<void>;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    errorFormat: "minimal",
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export async function ensureDatabase() {
  if (!globalForPrisma.databaseReady) {
    globalForPrisma.databaseReady = initializeDatabase();
  }

  return globalForPrisma.databaseReady;
}

async function initializeDatabase() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "username" TEXT NOT NULL UNIQUE,
      "password" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "rank" TEXT DEFAULT 'Operador',
      "role" TEXT NOT NULL DEFAULT 'USER',
      "canUseSim" BOOLEAN NOT NULL DEFAULT true,
      "canUseCalc" BOOLEAN NOT NULL DEFAULT false,
      "canUseArchive" BOOLEAN NOT NULL DEFAULT false,
      "canUseFT" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Report" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "title" TEXT NOT NULL,
      "data" JSONB NOT NULL,
      "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "userId" TEXT NOT NULL,
      CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "Report_userId_idx" ON "Report" ("userId");
  `);

  const userCount = await prisma.user.count();

  if (userCount === 0) {
    const password = process.env.CDT_ADMIN_PASSWORD ?? "TuPasswordSeguro123";
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        username: process.env.CDT_ADMIN_USERNAME ?? "admin",
        email: process.env.CDT_ADMIN_EMAIL ?? "admin@santabarbara.local",
        password: hashedPassword,
        rank: "Administrador",
        role: "SUPERADMIN",
        canUseSim: true,
        canUseCalc: true,
        canUseArchive: true,
        canUseFT: true,
      },
    });
  }
}
