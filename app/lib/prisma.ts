import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@/generated/prisma/client';

const databasePath = process.env.DATABASE_PATH;

if (!databasePath) {
  throw new Error('A variável DATABASE_PATH não foi encontrada pelo Next.js');
}

const adapter = new PrismaBetterSqlite3({ url: `file:${databasePath}` });

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
