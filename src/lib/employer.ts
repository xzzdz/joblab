import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Query ทั้งหมดของฝั่งบริษัท
 *
 * ────────────────────────────────────────────────────────────────────────
 * กฎเดียวที่สำคัญที่สุดของไฟล์นี้:
 * **ทุกฟังก์ชันรับ `ownerId` เป็นพารามิเตอร์ตัวแรก และใส่ไว้ใน `where` เสมอ**
 * ────────────────────────────────────────────────────────────────────────
 *
 * ทำไมไม่ทำแบบ "ดึงข้อมูลมาก่อน แล้วค่อย if เช็คว่าเป็นเจ้าของ":
 *
 *   // ❌ แบบที่มักเขียนกันและมักลืม
 *   const job = await prisma.job.findUnique({ where: { id } });
 *   if (job.company.ownerId !== user.id) throw new Error("ไม่มีสิทธิ์");
 *
 * แบบข้างบนใช้ได้ แต่ "ความปลอดภัยขึ้นอยู่กับว่าเราจำได้ไหมว่าต้องเขียน if"
 * วันที่รีบ ๆ แล้วลืมบรรทัด if คือวันที่บริษัทหนึ่งแก้ประกาศของบริษัทอื่นได้
 *
 * ถ้าเงื่อนไขความเป็นเจ้าของอยู่ใน `where` ตั้งแต่แรก การลืมจะกลายเป็น
 * "หาไม่เจอ" (แล้วเราตอบ 404) ไม่ใช่ "เจอแล้วแก้ได้"
 */

/** ข้อมูลบริษัทของผู้ใช้คนนี้ — คืน null ถ้ายังไม่ได้สร้าง */
export async function getMyCompany(ownerId: string) {
  return prisma.company.findUnique({
    where: { ownerId },
    select: {
      id: true,
      slug: true,
      name: true,
      website: true,
      logoUrl: true,
      description: true,
      _count: { select: { jobs: true } },
    },
  });
}

export type MyCompany = NonNullable<Awaited<ReturnType<typeof getMyCompany>>>;

/** ประกาศงานทั้งหมดของบริษัทตัวเอง (ทุกสถานะ รวม DRAFT ที่คนนอกไม่เห็น) */
export async function getMyJobs(ownerId: string) {
  return prisma.job.findMany({
    where: { company: { ownerId } },
    // เรียงให้ประกาศที่แก้ล่าสุดอยู่บนสุด — ตรงกับสิ่งที่คนกำลังทำงานอยู่ต้องการเห็น
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      location: true,
      workMode: true,
      type: true,
      salaryMin: true,
      salaryMax: true,
      status: true,
      publishedAt: true,
      updatedAt: true,
    },
  });
}

export type MyJobListItem = Awaited<ReturnType<typeof getMyJobs>>[number];

/**
 * ประกาศงาน 1 รายการของบริษัทตัวเอง — ใช้ตอนเปิดหน้าแก้ไข
 *
 * ใช้ `findFirst` ไม่ใช่ `findUnique` เพราะ `findUnique` รับ where ได้เฉพาะฟิลด์ unique
 * ใส่เงื่อนไข `company.ownerId` เข้าไปด้วยไม่ได้ ซึ่งเงื่อนไขนั้นคือหัวใจของความปลอดภัยที่นี่
 */
export async function getMyJob(ownerId: string, jobId: string) {
  return prisma.job.findFirst({
    where: { id: jobId, company: { ownerId } },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      location: true,
      workMode: true,
      type: true,
      salaryMin: true,
      salaryMax: true,
      status: true,
      publishedAt: true,
    },
  });
}

export type MyJob = NonNullable<Awaited<ReturnType<typeof getMyJob>>>;

/** ตัวเลขสรุปสำหรับหน้าแรกของฝั่งบริษัท */
export async function getMyJobStats(ownerId: string) {
  // groupBy ให้ Postgres นับให้ในคำสั่งเดียว ดีกว่าดึงทุกแถวมานับใน JavaScript
  const grouped = await prisma.job.groupBy({
    by: ["status"],
    where: { company: { ownerId } },
    _count: { _all: true },
  });

  const stats = { DRAFT: 0, PUBLISHED: 0, CLOSED: 0 };
  for (const row of grouped) {
    stats[row.status] = row._count._all;
  }
  return stats;
}
