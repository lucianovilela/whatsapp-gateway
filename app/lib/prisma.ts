import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;

// Trava a aplicação se a variável não estiver no Vercel, facilitando o debug
if (!connectionString) {
  throw new Error("A variável DATABASE_URL não foi encontrada pelo Next.js");
}

const pool = new Pool({
  connectionString,
  // CRÍTICO: O Supabase exige SSL para conexões externas
  ssl: {
    rejectUnauthorized: false, 
  },
  // Opcional: define um limite máximo de conexões por instância do Serverless
  max: 10,
});

const adapter = new PrismaPg(pool);

// Evita o esgotamento de conexões no modo de desenvolvimento do Next.js
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;