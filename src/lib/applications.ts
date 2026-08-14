import "server-only";

import { ApplicationStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

/**
 * Query ทั้งหมดที่เกี่ยวกับใบสมัคร
 *
 * หลักการเดียวกับ src/lib/employer.ts: **ฝังเงื่อนไขความเป็นเจ้าของไว้ใน where เสมอ**
 * ทุกฟังก์ชันที่นี่รับ userId เป็นพารามิเตอร์แรก และเงื่อนไขนั้นอยู่ในตัว query
 * ไม่ใช่ดึงมาก่อนแล้วค่อย if เช็คทีหลัง
 *
 * ผลที่ได้: ไม่มีเส้นทางไหนในโค้ดที่ดึงใบสมัครของคนอื่นมาได้เลย
 * ต่อให้เขียนหน้าใหม่แล้วลืมเช็คสิทธิ์ ก็จะได้ผลลัพธ์ว่าง ไม่ใช่ข้อมูลคนอื่น
 *
 * ใบสมัครมีคนดูได้แค่ 2 ฝั่ง:
 *   - ผู้สมัครที่เป็นเจ้าของใบสมัคร
 *   - บริษัทที่เป็นเจ้าของประกาศงานนั้น
 */

/** ลำดับคอลัมน์บนบอร์ด — ให้ตรงกับลำดับที่เกิดจริงในกระบวนการคัดเลือก */
export const APPLICATION_BOARD_COLUMNS = [
  ApplicationStatus.APPLIED,
  ApplicationStatus.SCREENING,
  ApplicationStatus.INTERVIEW,
  ApplicationStatus.OFFER,
  ApplicationStatus.REJECTED,
] as const;

/** ใบสมัครทั้งหมดของผู้สมัครคนหนึ่ง */
export async function getMyApplications(seekerId: string) {
  return prisma.application.findMany({
    where: { seekerId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      resumeName: true,
      job: {
        select: {
          slug: true,
          title: true,
          location: true,
          status: true,
          company: { select: { name: true } },
        },
      },
    },
  });
}

export type MyApplicationItem = Awaited<ReturnType<typeof getMyApplications>>[number];

/** ผู้สมัครคนนี้เคยสมัครงานนี้ไปแล้วหรือยัง */
export async function getMyApplicationForJob(seekerId: string, jobId: string) {
  return prisma.application.findUnique({
    // ใช้ unique index ที่ตั้งไว้ [jobId, seekerId] — Prisma ตั้งชื่อ key ให้แบบนี้
    where: { jobId_seekerId: { jobId, seekerId } },
    select: { id: true, status: true, createdAt: true },
  });
}

/**
 * ใบสมัครทั้งหมดของประกาศงานหนึ่ง สำหรับฝั่งบริษัท
 *
 * `job: { company: { ownerId } }` คือหัวใจ — เดินข้ามความสัมพันธ์ 2 ชั้นไปเช็คว่า
 * ประกาศนี้อยู่ใต้บริษัทที่ผู้ใช้คนนี้เป็นเจ้าของจริง
 * ถ้าบริษัทอื่นเดา jobId ถูกก็ยังได้ผลลัพธ์ว่างอยู่ดี
 */
export async function getApplicationsForJob(ownerId: string, jobId: string) {
  return prisma.application.findMany({
    where: { jobId, job: { company: { ownerId } } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      status: true,
      coverLetter: true,
      resumeName: true,
      createdAt: true,
      seeker: { select: { name: true, email: true } },
    },
  });
}

export type JobApplicationItem = Awaited<ReturnType<typeof getApplicationsForJob>>[number];

/**
 * ใบสมัครหนึ่งใบ พร้อมข้อมูลที่ต้องใช้ตัดสินสิทธิ์การเข้าถึงไฟล์ resume
 * ใช้ในหน้าดาวน์โหลด — คืน null ถ้าผู้ใช้คนนี้ไม่ใช่ทั้งเจ้าของใบสมัครและไม่ใช่บริษัทผู้รับสมัคร
 */
export async function getApplicationForViewer(userId: string, applicationId: string) {
  return prisma.application.findFirst({
    where: {
      id: applicationId,
      OR: [
        { seekerId: userId }, // เจ้าของใบสมัคร
        { job: { company: { ownerId: userId } } }, // บริษัทที่รับสมัคร
      ],
    },
    select: { id: true, resumeKey: true, resumeName: true },
  });
}

/** นับใบสมัครแยกตามสถานะ สำหรับสรุปหัวบอร์ด */
export async function getApplicationCountsForJob(ownerId: string, jobId: string) {
  const grouped = await prisma.application.groupBy({
    by: ["status"],
    where: { jobId, job: { company: { ownerId } } },
    _count: { _all: true },
  });

  // groupBy คืนเฉพาะสถานะที่มีข้อมูลจริง เติมสถานะที่เหลือให้เป็น 0
  // เพื่อให้หน้าเว็บไม่ต้องคอยเช็ค undefined ทุกจุด
  const counts = Object.fromEntries(
    Object.values(ApplicationStatus).map((status) => [status, 0])
  ) as Record<ApplicationStatus, number>;

  for (const row of grouped) counts[row.status] = row._count._all;
  return counts;
}

/** สรุปจำนวนใบสมัครทั้งบริษัท ใช้บนหน้ารายการประกาศ */
export async function getApplicationCountsByJob(ownerId: string) {
  const grouped = await prisma.application.groupBy({
    by: ["jobId"],
    where: { job: { company: { ownerId } } },
    _count: { _all: true },
  });

  return new Map(grouped.map((row) => [row.jobId, row._count._all]));
}
