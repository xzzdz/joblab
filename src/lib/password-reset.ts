import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { prisma } from "@/lib/prisma";

/**
 * ตรรกะของการตั้งรหัสผ่านใหม่
 *
 * แยกมาไว้ไฟล์นี้เพราะเป็นส่วนที่มีรายละเอียดด้านความปลอดภัยเยอะที่สุดในโปรเจค
 * และควรอ่านรวดเดียวได้ทั้งหมด ไม่ต้องกระโดดไปมาระหว่างไฟล์
 */

/** อายุของลิงก์ตั้งรหัสผ่านใหม่ */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 ชั่วโมง

/**
 * ทำไม 1 ชั่วโมง ไม่ใช่ 24 ชั่วโมง:
 * ลิงก์นี้เท่ากับกุญแจบัญชี ยิ่งอยู่นานยิ่งมีโอกาสหลุด (อีเมลถูกส่งต่อ, เครื่องถูกยืมใช้,
 * กล่องจดหมายถูกเจาะภายหลัง) หนึ่งชั่วโมงพอสำหรับคนที่กำลังตั้งใจรีเซ็ตอยู่จริง
 */

/**
 * แฮช token ด้วย SHA-256
 *
 * **ทำไมไม่ใช้ bcrypt เหมือนรหัสผ่าน:**
 * bcrypt ออกแบบให้ช้าเพื่อกันการไล่เดารหัสผ่านที่คนตั้งเอง ซึ่งมักสั้นและเดาได้
 * ส่วน token นี้เราสุ่มมา 32 ไบต์ (256 บิต) — ไล่เดาไม่มีทางสำเร็จอยู่แล้ว
 * ความช้าจึงไม่ช่วยอะไร แต่ทำให้ทุกครั้งที่ตรวจลิงก์เสียเวลาเปล่า
 *
 * SHA-256 ทำหน้าที่ที่เราต้องการจริง ๆ ครบแล้ว: ถ้าฐานข้อมูลหลุด
 * คนที่ได้ตาราง `PasswordReset` ไปจะย้อนกลับเป็น token ที่ใช้ได้ไม่ได้
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * เทียบค่าแฮชแบบคงเวลา
 *
 * การเทียบด้วย `===` ธรรมดาจะหยุดทันทีที่พบตัวอักษรตัวแรกที่ไม่ตรง
 * เวลาที่ใช้จึงบอกได้ว่าเดาถูกกี่ตัวแรก คนโจมตีไล่ทีละตัวได้
 * `timingSafeEqual` ใช้เวลาเท่ากันเสมอไม่ว่าจะต่างกันตรงไหน
 */
function equalsConstantTime(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  // ต้องยาวเท่ากันก่อน ไม่งั้น timingSafeEqual จะโยน error
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * สร้างคำขอตั้งรหัสผ่านใหม่ คืน token ที่จะเอาไปใส่ในลิงก์
 *
 * คืน null ถ้าไม่ควรส่งอีเมล (ไม่มีผู้ใช้ หรือผู้ใช้นั้นไม่มีรหัสผ่านให้รีเซ็ต)
 * — **คนเรียกต้องแสดงข้อความเดียวกันทั้งกรณีสำเร็จและกรณี null**
 * ไม่งั้นหน้านี้จะกลายเป็นเครื่องมือตรวจว่าอีเมลไหนมีบัญชีในระบบ
 */
export async function createPasswordResetToken(email: string): Promise<
  { token: string; userName: string } | null
> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, name: true, passwordHash: true },
  });

  if (!user) return null;

  /**
   * ผู้ใช้ที่สมัครผ่าน Google ไม่มีรหัสผ่าน
   *
   * ถ้าปล่อยให้ตั้งรหัสผ่านได้ จะกลายเป็นการเพิ่มวิธีเข้าบัญชีให้คนที่ควบคุมกล่องอีเมล
   * ทั้งที่เจ้าของบัญชีตั้งใจใช้ Google เท่านั้น — เขาควรเป็นคนเลือกเองว่าจะตั้งรหัสผ่านไหม
   * (ทำได้จากหน้าบัญชีตอนล็อกอินอยู่ ซึ่งอยู่ใน Backlog)
   */
  if (user.passwordHash === null) return null;

  /**
   * ยกเลิกคำขอเก่าที่ยังไม่ถูกใช้ทั้งหมด
   *
   * ทำไม: ถ้าไม่ยกเลิก ลิงก์เก่าทุกอันที่เคยส่งไปยังใช้ได้อยู่
   * คนที่เคยเห็นลิงก์เก่า (เช่นอีเมลที่ถูกส่งต่อไปแล้ว) จะยังเข้าบัญชีได้
   * ขอใหม่แล้วของเก่าต้องใช้ไม่ได้ทันที
   */
  await prisma.passwordReset.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  // 32 ไบต์จากตัวสุ่มเชิงรหัสลับ — เดาไม่ได้ในทางปฏิบัติ
  const token = randomBytes(32).toString("base64url");

  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      // เก็บแฮช ไม่เก็บ token จริง
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  return { token, userName: user.name };
}

export type ResetTokenCheck =
  | { valid: true; userId: string; resetId: string }
  | { valid: false; reason: "invalid" | "expired" | "used" };

/** ตรวจว่า token ใช้ได้ไหม โดยยังไม่เปลี่ยนรหัสผ่าน (ใช้ตอนแสดงหน้าฟอร์ม) */
export async function checkResetToken(token: string): Promise<ResetTokenCheck> {
  const tokenHash = hashToken(token);

  const record = await prisma.passwordReset.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true, tokenHash: true },
  });

  if (!record) return { valid: false, reason: "invalid" };

  // เทียบซ้ำแบบคงเวลา — findUnique ใช้ index ซึ่งเวลาที่ใช้อาจต่างกันตามข้อมูล
  if (!equalsConstantTime(record.tokenHash, tokenHash)) {
    return { valid: false, reason: "invalid" };
  }

  if (record.usedAt !== null) return { valid: false, reason: "used" };
  if (record.expiresAt <= new Date()) return { valid: false, reason: "expired" };

  return { valid: true, userId: record.userId, resetId: record.id };
}

/**
 * ใช้ token ตั้งรหัสผ่านใหม่
 *
 * ทำใน transaction เดียวกับการทำเครื่องหมายว่า token ถูกใช้แล้ว
 * เพราะถ้าเปลี่ยนรหัสผ่านสำเร็จแต่ทำเครื่องหมายไม่สำเร็จ token จะใช้ซ้ำได้
 * — คนที่มีลิงก์อยู่จะเปลี่ยนรหัสผ่านได้อีกเรื่อย ๆ แม้เจ้าของจะเปลี่ยนไปแล้ว
 */
export async function consumeResetToken(
  resetId: string,
  userId: string,
  newPasswordHash: string
): Promise<boolean> {
  const result = await prisma.$transaction(async (tx) => {
    /**
     * `updateMany` ที่มีเงื่อนไข `usedAt: null` ทำหน้าที่เป็นตัวล็อกด้วย
     *
     * ถ้ามีสอง request ยิงพร้อมกัน จะมีแค่อันเดียวที่อัปเดตได้ 1 แถว
     * อีกอันได้ 0 แถวเพราะ `usedAt` ไม่ใช่ null แล้ว — จึงไม่ต้องใช้ lock แยก
     */
    const marked = await tx.passwordReset.updateMany({
      where: { id: resetId, usedAt: null },
      data: { usedAt: new Date() },
    });

    if (marked.count === 0) return false;

    await tx.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return true;
  });

  return result;
}
