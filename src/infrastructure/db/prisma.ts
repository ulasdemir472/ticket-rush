/**
 * Prisma Client Singleton with PostgreSQL Adapter
 *
 * Prisma 7.x requires an adapter for database connections.
 * This pattern prevents multiple Prisma Client instances during Next.js hot-reload
 * in development mode. In production, a single instance is created normally.
 *
 * @see https://www.prisma.io/docs/guides/database/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

function createPrismaClient(): PrismaClient {
  // Create PostgreSQL connection pool
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const pool = globalForPrisma.pool ?? new Pool({ connectionString });
  globalForPrisma.pool = pool;

  // Create Prisma adapter
  const adapter = new PrismaPg(pool);

  // Create Prisma client with adapter
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
