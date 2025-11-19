/**
 * Prisma Client Instance
 * Singleton pattern for Prisma Client
 */

import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
};

declare global {
  // eslint-disable-next-line no-var
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (env.NODE_ENV !== 'production') globalThis.prisma = prisma;

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
