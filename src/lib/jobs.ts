import { JobStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

/**
 * รวม query เกี่ยวกับ "งาน" ไว้ที่ไฟล์เดียว ไม่กระจายอยู่ในไฟล์ page
 *
 * ทำไม: กฎสำคัญของโปรเจคนี้คือ "ผู้ใช้ทั่วไปต้องเห็นเฉพาะประกาศที่ status = PUBLISHED"
 * ถ้าปล่อยให้แต่ละ page เขียน query เอง วันหนึ่งจะมีสักหน้าที่ลืมใส่เงื่อนไข
 * แล้วประกาศ DRAFT ของบริษัทจะหลุดออกสู่สาธารณะ
 */

/** รายการงานสำหรับหน้า list — เลือกเฉพาะฟิลด์ที่การ์ดใช้จริง ไม่ดึง description ยาว ๆ มาเปล่า ๆ */
export async function getPublishedJobs() {
  return prisma.job.findMany({
    where: { status: JobStatus.PUBLISHED },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      location: true,
      workMode: true,
      type: true,
      salaryMin: true,
      salaryMax: true,
      publishedAt: true,
      company: {
        select: { name: true, slug: true },
      },
    },
  });
}

/**
 * ให้ TypeScript สรุปชนิดข้อมูลจากตัว query เอง
 * ข้อดี: วันหลังแก้ `select` ข้างบน ชนิดนี้เปลี่ยนตามทันที ไม่ต้องมาไล่แก้ interface ที่เขียนซ้ำ
 */
export type JobListItem = Awaited<ReturnType<typeof getPublishedJobs>>[number];

/**
 * ดึงงานหนึ่งรายการจาก slug
 *
 * ใช้ findFirst ไม่ใช่ findUnique เพราะต้องกรอง status ด้วย (findUnique รับได้เฉพาะฟิลด์ unique)
 * การใส่ status ตรงนี้คือสิ่งที่กันไม่ให้คนเดา URL แล้วเปิดประกาศ DRAFT ของคนอื่นดูได้
 */
export async function getPublishedJobBySlug(slug: string) {
  return prisma.job.findFirst({
    where: { slug, status: JobStatus.PUBLISHED },
    include: {
      company: {
        select: { name: true, slug: true, website: true, description: true },
      },
    },
  });
}

export type JobDetail = NonNullable<Awaited<ReturnType<typeof getPublishedJobBySlug>>>;
