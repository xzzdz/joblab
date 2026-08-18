import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { createHash } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PrismaClient } from "@/generated/prisma/client";
import {
  RESET_TOKEN_TTL_MS,
  checkResetToken,
  consumeResetToken,
  createPasswordResetToken,
  hashToken,
} from "@/lib/password-reset";

/**
 * เทสต์ตรรกะการตั้งรหัสผ่านใหม่
 *
 * ต่อฐานข้อมูลจริงเพราะสิ่งที่ทดสอบคือพฤติกรรมของ token ในตาราง —
 * ใช้ได้ครั้งเดียว, หมดอายุ, ขอใหม่แล้วอันเก่าต้องใช้ไม่ได้
 * ถ้า mock Prisma ทิ้งก็ไม่ได้พิสูจน์อะไรเลย
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const TAG = "reset-test";
const EMAIL_WITH_PASSWORD = `${TAG}-normal@example.test`;
const EMAIL_OAUTH_ONLY = `${TAG}-oauth@example.test`;

async function cleanup() {
  // Cascade จะลบ PasswordReset ที่ผูกกับผู้ใช้เหล่านี้ไปเอง
  await prisma.user.deleteMany({ where: { email: { startsWith: `${TAG}-` } } });
}

/** นับคำขอรีเซ็ตของผู้ใช้ที่เทสต์ชุดนี้สร้างเท่านั้น */
function countResetsForTestUsers() {
  return prisma.passwordReset.count({
    where: { user: { email: { startsWith: `${TAG}-` } } },
  });
}

beforeAll(cleanup);

beforeEach(async () => {
  await cleanup();
  await prisma.user.create({
    data: { email: EMAIL_WITH_PASSWORD, name: "ผู้ใช้ปกติ", passwordHash: "hash-เดิม" },
  });
  await prisma.user.create({
    // ผู้ใช้ที่สมัครผ่าน Google — ไม่มีรหัสผ่าน
    data: { email: EMAIL_OAUTH_ONLY, name: "ผู้ใช้ Google", passwordHash: null },
  });
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("สร้าง token", () => {
  it("สร้างได้สำหรับผู้ใช้ที่มีรหัสผ่าน", async () => {
    const result = await createPasswordResetToken(EMAIL_WITH_PASSWORD);
    expect(result).not.toBeNull();
    expect(result!.token.length).toBeGreaterThan(30);
  });

  it("⚠ เก็บลง DB เป็นแฮช ไม่ใช่ token จริง", async () => {
    const result = await createPasswordResetToken(EMAIL_WITH_PASSWORD);
    /**
     * จำกัดขอบเขตด้วยอีเมลของเทสต์นี้ — **ห้ามใช้ findFirst ลอย ๆ**
     *
     * เคยเขียนแบบไม่จำกัดขอบเขตแล้วเทสต์ล้ม เพราะ E2E ที่รันก่อนหน้าสร้างแถวของ
     * seeker@joblab.dev ค้างไว้ในตารางเดียวกัน แล้ว findFirst หยิบแถวนั้นมาเทียบ
     * บทเรียน: เทสต์ที่ต่อ DB จริงต้องกรองเฉพาะข้อมูลของตัวเองเสมอ
     * ไม่สมมติว่าตารางว่าง เพราะมันไม่เคยว่างจริงเมื่อรันร่วมกับเทสต์อื่น
     */
    const row = await prisma.passwordReset.findFirstOrThrow({
      where: { user: { email: EMAIL_WITH_PASSWORD } },
      select: { tokenHash: true },
    });

    // ถ้า DB หลุด คนที่ได้ตารางไปต้องเอา token ไปใช้ต่อไม่ได้
    expect(row.tokenHash).not.toBe(result!.token);
    expect(row.tokenHash).toBe(createHash("sha256").update(result!.token).digest("hex"));
    expect(row.tokenHash).toHaveLength(64); // SHA-256 เป็น hex 64 ตัว
  });

  it("อีเมลที่ไม่มีบัญชี → คืน null (ไม่สร้างแถว)", async () => {
    expect(await createPasswordResetToken("nobody-does-not-exist@example.test")).toBeNull();
    // นับเฉพาะแถวของผู้ใช้ที่เทสต์นี้สร้าง ไม่นับทั้งตาราง
    expect(await countResetsForTestUsers()).toBe(0);
  });

  it("⚠ บัญชีที่ไม่มีรหัสผ่าน (สมัครผ่าน Google) → คืน null", async () => {
    /**
     * ถ้าปล่อยให้ตั้งรหัสผ่านได้ จะเป็นการเพิ่มวิธีเข้าบัญชีให้คนที่ควบคุมกล่องอีเมล
     * ทั้งที่เจ้าของบัญชีตั้งใจใช้ Google เท่านั้น
     */
    expect(await createPasswordResetToken(EMAIL_OAUTH_ONLY)).toBeNull();
    expect(await countResetsForTestUsers()).toBe(0);
  });

  it("ไม่สนตัวพิมพ์เล็กใหญ่ของอีเมล", async () => {
    expect(await createPasswordResetToken(EMAIL_WITH_PASSWORD.toUpperCase())).not.toBeNull();
  });

  it("⚠ ขอใหม่แล้ว token เก่าใช้ไม่ได้ทันที", async () => {
    const first = await createPasswordResetToken(EMAIL_WITH_PASSWORD);
    const second = await createPasswordResetToken(EMAIL_WITH_PASSWORD);

    /**
     * ถ้าไม่ยกเลิกอันเก่า ลิงก์ทุกอันที่เคยส่งไปยังใช้ได้อยู่
     * คนที่เคยเห็นลิงก์เก่า (อีเมลถูกส่งต่อ, เครื่องถูกยืมใช้) จะยังเข้าบัญชีได้
     */
    expect((await checkResetToken(first!.token)).valid).toBe(false);
    expect((await checkResetToken(second!.token)).valid).toBe(true);
  });
});

describe("ตรวจ token", () => {
  it("token ที่เพิ่งสร้างใช้ได้", async () => {
    const { token } = (await createPasswordResetToken(EMAIL_WITH_PASSWORD))!;
    expect((await checkResetToken(token)).valid).toBe(true);
  });

  it("token มั่วใช้ไม่ได้", async () => {
    const result = await checkResetToken("token-ที่แต่งขึ้นเอง");
    expect(result).toEqual({ valid: false, reason: "invalid" });
  });

  it("token ที่หมดอายุใช้ไม่ได้", async () => {
    const { token } = (await createPasswordResetToken(EMAIL_WITH_PASSWORD))!;

    // ดันวันหมดอายุให้เป็นอดีต แทนการรอจริงหนึ่งชั่วโมง
    await prisma.passwordReset.updateMany({
      where: { tokenHash: hashToken(token) },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    expect(await checkResetToken(token)).toEqual({ valid: false, reason: "expired" });
  });

  it("อายุของ token ตั้งไว้ 1 ชั่วโมง", async () => {
    const { token } = (await createPasswordResetToken(EMAIL_WITH_PASSWORD))!;
    const row = await prisma.passwordReset.findUniqueOrThrow({
      where: { tokenHash: hashToken(token) },
      select: { expiresAt: true, createdAt: true },
    });

    const ttl = row.expiresAt.getTime() - row.createdAt.getTime();
    // เผื่อความคลาดเคลื่อนของนาฬิกาเล็กน้อย
    expect(Math.abs(ttl - RESET_TOKEN_TTL_MS)).toBeLessThan(2000);
  });
});

describe("ใช้ token", () => {
  it("เปลี่ยนรหัสผ่านได้และ token ถูกทำเครื่องหมายว่าใช้แล้ว", async () => {
    const { token } = (await createPasswordResetToken(EMAIL_WITH_PASSWORD))!;
    const check = await checkResetToken(token);
    expect(check.valid).toBe(true);
    if (!check.valid) return;

    expect(await consumeResetToken(check.resetId, check.userId, "hash-ใหม่")).toBe(true);

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: EMAIL_WITH_PASSWORD },
      select: { passwordHash: true },
    });
    expect(user.passwordHash).toBe("hash-ใหม่");
  });

  it("⚠ ใช้ token เดิมซ้ำครั้งที่สองไม่ได้", async () => {
    const { token } = (await createPasswordResetToken(EMAIL_WITH_PASSWORD))!;
    const check = await checkResetToken(token);
    if (!check.valid) throw new Error("token ควรใช้ได้");

    expect(await consumeResetToken(check.resetId, check.userId, "hash-ครั้งแรก")).toBe(true);
    // ครั้งที่สองต้องไม่สำเร็จ ไม่งั้นคนที่มีลิงก์จะเปลี่ยนรหัสผ่านได้เรื่อย ๆ
    expect(await consumeResetToken(check.resetId, check.userId, "hash-ครั้งที่สอง")).toBe(false);

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: EMAIL_WITH_PASSWORD },
      select: { passwordHash: true },
    });
    expect(user.passwordHash).toBe("hash-ครั้งแรก");
  });

  it("token ที่ใช้แล้วเมื่อเอามาตรวจอีก บอกว่า used", async () => {
    const { token } = (await createPasswordResetToken(EMAIL_WITH_PASSWORD))!;
    const check = await checkResetToken(token);
    if (!check.valid) throw new Error("token ควรใช้ได้");

    await consumeResetToken(check.resetId, check.userId, "hash-ใหม่");
    expect(await checkResetToken(token)).toEqual({ valid: false, reason: "used" });
  });

  it("⚠ ยิงพร้อมกันสองครั้ง มีแค่ครั้งเดียวที่สำเร็จ", async () => {
    const { token } = (await createPasswordResetToken(EMAIL_WITH_PASSWORD))!;
    const check = await checkResetToken(token);
    if (!check.valid) throw new Error("token ควรใช้ได้");

    /**
     * จำลอง race condition: สอง request ใช้ token เดียวกันในเวลาเดียวกัน
     * `updateMany` ที่มีเงื่อนไข `usedAt: null` ทำหน้าที่เป็นตัวล็อก
     * จึงต้องมีแค่อันเดียวที่ได้ true
     */
    const results = await Promise.all([
      consumeResetToken(check.resetId, check.userId, "hash-a"),
      consumeResetToken(check.resetId, check.userId, "hash-b"),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
  });
});
