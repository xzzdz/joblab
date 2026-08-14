import type { Prisma } from "@/generated/prisma/client";
import { JobStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { JOBS_PER_PAGE, type JobFilters } from "@/lib/validation/job-filters";

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
 * แปลงตัวกรองเป็นเงื่อนไข where
 *
 * เก็บเงื่อนไขใส่ array `AND` แทนที่จะยัดทุกอย่างลง object เดียว
 * เพราะทั้งคำค้นหาและตัวกรองเงินเดือนต่างก็ต้องใช้ `OR` — ถ้าเขียนเป็น key ชื่อ `OR`
 * ทั้งคู่ในระดับเดียวกัน อันหลังจะทับอันแรกเงียบ ๆ (JavaScript object มี key ซ้ำไม่ได้)
 */
function buildJobWhere(filters: JobFilters): Prisma.JobWhereInput {
  const conditions: Prisma.JobWhereInput[] = [{ status: JobStatus.PUBLISHED }];

  if (filters.q) {
    conditions.push({
      OR: [
        // mode: "insensitive" → ใช้ ILIKE ของ Postgres ไม่สนตัวพิมพ์เล็กใหญ่
        { title: { contains: filters.q, mode: "insensitive" } },
        { company: { name: { contains: filters.q, mode: "insensitive" } } },
      ],
    });
  }

  if (filters.location) {
    conditions.push({ location: { contains: filters.location, mode: "insensitive" } });
  }

  if (filters.type) conditions.push({ type: filters.type });
  if (filters.workMode) conditions.push({ workMode: filters.workMode });

  if (filters.salary) {
    /**
     * "เงินเดือนที่รับได้อย่างน้อย X"
     *
     * ประกาศจะเข้าเกณฑ์เมื่อเพดานเงินเดือนถึง X
     * ถ้าไม่ระบุเพดาน (salaryMax เป็น null) ให้ดูที่ salaryMin แทน
     * ส่วนประกาศที่ไม่ระบุเงินเดือนเลยจะไม่ถูกแสดงเมื่อผู้ใช้กรองข้อนี้
     * — เพราะเรารับประกันไม่ได้ว่าถึงเกณฑ์ ดีกว่าแสดงแล้วผู้ใช้เสียเวลาเปิดดู
     */
    conditions.push({
      OR: [
        { salaryMax: { gte: filters.salary } },
        { salaryMax: null, salaryMin: { gte: filters.salary } },
      ],
    });
  }

  return { AND: conditions };
}

/**
 * ค้นหาประกาศงานตามตัวกรอง พร้อมข้อมูลแบ่งหน้า
 *
 * ยิง 2 query พร้อมกันด้วย Promise.all: รายการของหน้านี้ กับจำนวนทั้งหมด
 * ต้องนับทั้งหมดเพราะต้องรู้ว่ามีกี่หน้า — ถ้าไม่โชว์เลขหน้าก็ตัด query นี้ทิ้งได้
 *
 * ใช้ skip/take (offset pagination) ไม่ใช่ cursor
 * เหตุผล: หน้านี้ต้องกระโดดไปหน้าที่ 5 ได้ ซึ่ง cursor ทำไม่ได้ (มันรู้แค่ "ถัดจากตัวนี้")
 * ข้อเสียที่ต้องรู้: Postgres ต้องไล่อ่านแล้วทิ้ง 4 หน้าแรกก่อนเสมอ ยิ่งหน้าลึกยิ่งช้า
 * ถ้าวันหนึ่งข้อมูลโตจนหน้าท้าย ๆ ช้า ค่อยเปลี่ยนเป็น cursor สำหรับ feed/API (อยู่ใน Backlog)
 */
export async function searchPublishedJobs(filters: JobFilters) {
  const where = buildJobWhere(filters);
  const skip = (filters.page - 1) * JOBS_PER_PAGE;

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      // ใส่ id เป็นตัวตัดสินอันดับสำรอง กันประกาศที่ publishedAt เท่ากันเป๊ะ
      // สลับที่กันไปมาระหว่างหน้า จนบางรายการโผล่ซ้ำหรือหายไปเลย
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      skip,
      take: JOBS_PER_PAGE,
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
        company: { select: { name: true, slug: true } },
      },
    }),
    prisma.job.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / JOBS_PER_PAGE));

  return {
    jobs,
    total,
    totalPages,
    currentPage: filters.page,
    hasPrevious: filters.page > 1,
    hasNext: filters.page < totalPages,
  };
}

/**
 * รายชื่อสถานที่ทำงานทั้งหมดที่มีประกาศเปิดรับอยู่ พร้อมจำนวน
 *
 * ใช้ groupBy ให้ Postgres นับให้ แทนที่จะดึงทุกแถวมานับใน JavaScript
 * ผลลัพธ์เอาไปทำ dropdown ที่มีแต่ตัวเลือกที่เลือกแล้วมีผลจริง — ไม่มีตัวเลือกที่กดแล้วว่าง
 */
export async function getPublishedJobLocations() {
  const grouped = await prisma.job.groupBy({
    by: ["location"],
    where: { status: JobStatus.PUBLISHED },
    _count: { _all: true },
    orderBy: { _count: { location: "desc" } },
  });

  return grouped.map((row) => ({ location: row.location, count: row._count._all }));
}

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
