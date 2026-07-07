import { PrismaPg } from "@prisma/adapter-pg";

import { createPgPool } from "@/lib/db/pg-pool";
import { PrismaClient } from "@/app/generated/prisma";

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL?.trim();

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = createPgPool(connectionString);
  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
}

const PRISMA_CLIENT_KEY = "__prisma_client_v2__";

const globalForPrisma = globalThis as unknown as {
  [PRISMA_CLIENT_KEY]?: PrismaClient;
};

export const prisma =
  globalForPrisma[PRISMA_CLIENT_KEY] ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma[PRISMA_CLIENT_KEY] = prisma;
}
