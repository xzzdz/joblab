import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import type { UserRole } from "@/generated/prisma/enums";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Data Access Layer — ด่านตรวจสิทธิ์ที่อยู่ "ใกล้ข้อมูลที่สุด"
 *
 * ทำไมไม่เช็คแค่ที่ proxy.ts (middleware) อย่างเดียว:
 * proxy ทำงานก่อนเข้าหน้า จริง แต่ถ้ามีใครเพิ่มหน้าใหม่แล้วลืมใส่ path ใน matcher
 * หน้านั้นก็เปิดโล่งทันทีโดยไม่มีอะไรเตือน — ช่องโหว่แบบ "ลืม" คือแบบที่เจอบ่อยที่สุด
 * แต่ถ้าทุกหน้าเรียก requireUser() ก่อนแตะข้อมูล การลืมจะกลายเป็น "ไม่มีข้อมูลให้แสดง"
 * แทนที่จะเป็น "ข้อมูลหลุด"
 *
 * บรรทัด `import "server-only"` ด้านบนทำให้ build พังทันทีถ้ามีใครเผลอ import
 * ไฟล์นี้เข้าไปใน Client Component ซึ่งจะทำให้ logic ตรวจสิทธิ์หลุดไปฝั่ง browser
 */

/**
 * อ่านข้อมูลผู้ใช้ปัจจุบัน — คืน null ถ้ายังไม่ล็อกอิน
 *
 * ห่อด้วย React `cache` เพื่อให้เรียกกี่ครั้งใน render รอบเดียวก็ query DB แค่ครั้งเดียว
 * (header เรียก, page เรียก, component ลูกเรียก → ยิง SQL แค่ query เดียว)
 *
 * ทำไมต้อง query DB ทั้งที่ session มีข้อมูลอยู่แล้ว:
 * session เป็น JWT ที่ถูกเซ็นไว้ตอนล็อกอิน ข้อมูลข้างในคือ "ภาพ ณ ตอนนั้น"
 * ถ้าผู้ใช้ถูกลบหรือถูกเปลี่ยน role หลังจากนั้น token เดิมยังใช้ได้อยู่จนกว่าจะหมดอายุ
 * การอ่านจาก DB ทำให้เราเห็นสถานะปัจจุบันจริง ๆ
 */
export const getCurrentUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;

  return prisma.user.findUnique({
    where: { id: session.user.id },
    // เลือกเฉพาะฟิลด์ที่ต้องใช้ — ไม่ดึง passwordHash ออกมาแม้แต่ในหน่วยความจำ
    select: { id: true, email: true, name: true, role: true },
  });
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** ต้องล็อกอินแล้วเท่านั้น ไม่งั้นเด้งไปหน้า login */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * ต้องล็อกอินและมี role ตรงตามที่กำหนด
 *
 * เช็ค role จากข้อมูลใน DB (ผ่าน getCurrentUser) ไม่ใช่จาก JWT
 * เพราะถ้าแอดมินลด role ของใครสักคน เราอยากให้มีผลทันที ไม่ใช่รอ token หมดอายุ
 */
export async function requireRole(role: UserRole): Promise<CurrentUser> {
  const user = await requireUser();

  if (user.role !== role) {
    // ล็อกอินแล้วแต่ผิดฝั่ง → ส่งกลับไปหน้าที่เขาใช้ได้ ไม่ใช่เด้งไป login ซ้ำ ๆ
    redirect("/jobs");
  }

  return user;
}
