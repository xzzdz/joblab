import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma Client แบบ singleton
 *
 * ทำไมต้องทำแบบนี้: ตอน `next dev` ไฟล์จะถูก reload ทุกครั้งที่แก้โค้ด
 * ถ้าเขียน `new PrismaClient()` ตรง ๆ จะได้ connection pool ใหม่ทุกครั้งที่ reload
 * จนเต็ม limit ของ Postgres แล้วพัง
 * เลยเก็บ instance ไว้บน globalThis ซึ่งอยู่รอดข้าม hot reload
 *
 * บน production ไม่ต้องเก็บลง global เพราะโมดูลถูกโหลดครั้งเดียวอยู่แล้ว
 */

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("ไม่พบ DATABASE_URL — คัดลอก .env.example เป็น .env ก่อน");
}

function createPrismaClient() {
  // Prisma 7 คุยกับ DB ผ่าน driver adapter (ไม่ใช่ engine binary แบบเวอร์ชันเก่า)
  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
