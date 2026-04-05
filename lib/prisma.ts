import { ENV } from "@/config/constant";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaNeon } from '@prisma/adapter-neon';

const connString = ENV.db.direct;
let adapter = null;

// Determine adapter based on connection string or explicit env (using simple logic for now)
if (connString.includes("neon.tech")) {
  adapter = new PrismaNeon({ connectionString: connString });
} else {
  adapter = new PrismaPg({ connectionString: connString });
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;