import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * แปลงข้อความเป็น slug สำหรับใส่ใน URL
 *
 * เก็บตัวอักษรไทย (ก-๙) ไว้ด้วย เพราะเบราว์เซอร์เข้ารหัสให้อัตโนมัติ
 * และ URL ที่อ่านรู้เรื่องดีต่อทั้งผู้ใช้และ SEO มากกว่า `/jobs/job-a1b2c3`
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // ตัดทุกอย่างที่ไม่ใช่ตัวอักษรอังกฤษ ตัวเลข ตัวอักษรไทย หรือช่องว่าง
    .replace(/[^a-z0-9฀-๿\s-]/g, "")
    .replace(/\s+/g, "-") // ช่องว่าง (รวมหลายช่องติดกัน) → ขีดเดียว
    .replace(/-+/g, "-") // ขีดซ้ำ → ขีดเดียว
    .replace(/^-|-$/g, "") // ตัดขีดหัวท้าย
    .slice(0, 80);
}

/**
 * หา slug ที่ยังไม่มีใครใช้ โดยเติมเลขต่อท้ายถ้าซ้ำ: `frontend-dev`, `frontend-dev-2`, ...
 *
 * `excludeJobId` ใช้ตอนแก้ไขประกาศเดิม — ไม่งั้นประกาศจะชนกับ slug ของตัวเอง
 * แล้วกลายเป็น `frontend-dev-2` ทุกครั้งที่กดบันทึกทั้งที่ไม่ได้เปลี่ยนชื่อ
 *
 * หมายเหตุ: การเช็คแบบนี้ยังมีช่องว่างเรื่อง race condition อยู่ (เหมือนกรณีอีเมลซ้ำ
 * ตอนสมัครสมาชิก) ถ้าสองคนกดบันทึกพร้อมกันด้วยชื่อเดียวกัน อาจได้ slug ซ้ำ
 * ด่านสุดท้ายที่กันจริงคือ unique constraint ใน DB ซึ่งฝั่ง action ดัก P2002 ไว้แล้ว
 */
async function findFreeSlug(
  text: string,
  fallback: string,
  findOwnerIdBySlug: (slug: string) => Promise<{ id: string } | null>,
  excludeId?: string
): Promise<string> {
  const base = slugify(text) || fallback; // เผื่อกรณีชื่อเป็นสัญลักษณ์ทั้งหมดแล้ว slug ว่าง

  for (let attempt = 1; attempt <= 50; attempt += 1) {
    const candidate = attempt === 1 ? base : `${base}-${attempt}`;
    const existing = await findOwnerIdBySlug(candidate);

    if (!existing || existing.id === excludeId) return candidate;
  }

  // ถ้าชนกัน 50 ครั้ง (แทบไม่มีทางเกิด) ค่อยใช้ค่าสุ่มปิดท้าย
  return `${base}-${Date.now().toString(36)}`;
}

export function generateUniqueJobSlug(title: string, excludeJobId?: string): Promise<string> {
  return findFreeSlug(
    title,
    "job",
    (slug) => prisma.job.findUnique({ where: { slug }, select: { id: true } }),
    excludeJobId
  );
}

export function generateUniqueCompanySlug(
  name: string,
  excludeCompanyId?: string
): Promise<string> {
  return findFreeSlug(
    name,
    "company",
    (slug) => prisma.company.findUnique({ where: { slug }, select: { id: true } }),
    excludeCompanyId
  );
}
