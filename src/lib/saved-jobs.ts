import "server-only";

import { JobStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

/**
 * Query ของงานที่บันทึกไว้
 *
 * หลักการเดียวกับที่อื่นทั้งโปรเจค: `userId` อยู่ใน `where` เสมอ
 * ไม่มีเส้นทางไหนที่ดึงรายการที่บันทึกไว้ของคนอื่นมาได้
 */

/** งานที่ผู้ใช้บันทึกไว้ทั้งหมด */
export async function getSavedJobs(userId: string) {
  const saved = await prisma.savedJob.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      job: {
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
          company: { select: { name: true, slug: true } },
        },
      },
    },
  });

  /**
   * ไม่กรองประกาศที่ปิดรับไปแล้วออก — ตั้งใจ
   *
   * ผู้ใช้กดบันทึกไว้เอง ถ้าเราลบออกจากรายการเงียบ ๆ เขาจะสงสัยว่าของที่บันทึกหายไปไหน
   * แสดงต่อแล้วบอกว่า "ปิดรับแล้ว" ตรงไปตรงมากว่า และเขาลบเองได้
   */
  return saved.map((item) => ({
    savedId: item.id,
    savedAt: item.createdAt,
    isOpen: item.job.status === JobStatus.PUBLISHED,
    job: item.job,
  }));
}

export type SavedJobItem = Awaited<ReturnType<typeof getSavedJobs>>[number];

/**
 * งานไหนที่ผู้ใช้บันทึกไว้แล้ว จากรายการ id ที่ส่งมา
 *
 * รับเป็น array แล้วคืน Set เพื่อให้หน้ารายการงานถามได้ครั้งเดียวสำหรับทั้งหน้า
 * ถ้าให้การ์ดแต่ละใบไปถามเอง จะยิง query เท่ากับจำนวนการ์ด (ปัญหา N+1)
 */
export async function getSavedJobIds(userId: string, jobIds: string[]): Promise<Set<string>> {
  if (jobIds.length === 0) return new Set();

  const rows = await prisma.savedJob.findMany({
    where: { userId, jobId: { in: jobIds } },
    select: { jobId: true },
  });

  return new Set(rows.map((row) => row.jobId));
}

/** นับจำนวนงานที่บันทึกไว้ ใช้แสดงบนเมนู */
export function countSavedJobs(userId: string) {
  return prisma.savedJob.count({ where: { userId } });
}
