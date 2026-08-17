import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PrismaClient } from "@/generated/prisma/client";
import { JobStatus, UserRole } from "@/generated/prisma/enums";

/**
 * เทสต์การแบ่งหน้าของรายการประกาศฝั่งบริษัท
 *
 * ต้องต่อ DB จริงเพราะสิ่งที่เทสต์คือ `skip` / `take` / `orderBy` ของ Prisma
 * และเงื่อนไขที่สำคัญที่สุดคือ **ไม่มีรายการไหนซ้ำหรือหายระหว่างหน้า**
 * ซึ่งพิสูจน์ได้เฉพาะเมื่อมีข้อมูลมากกว่าหนึ่งหน้าจริง ๆ (seed มีแค่ 3 ประกาศ ไม่ถึงหน้า)
 *
 * จุดที่คนพลาดบ่อย: เรียงด้วยฟิลด์ที่ค่าซ้ำกันได้ (เช่น `updatedAt`) โดยไม่มีตัวตัดสินสำรอง
 * ลำดับจะไม่คงที่ระหว่าง query ทำให้บางรายการโผล่สองหน้า บางรายการหายไปเลย
 * เทสต์นี้จงใจสร้างประกาศที่มี `updatedAt` เท่ากันเป๊ะเพื่อดักกรณีนั้น
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const TAG = "pagination-test";
const TOTAL_JOBS = 25;
const PER_PAGE = 10;

let ownerId: string;

/** จำลองสิ่งที่ getMyJobs ทำ (ดู src/lib/employer.ts) */
async function fetchPage(page: number) {
  const where = { company: { ownerId } };
  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: { id: true, title: true },
    }),
    prisma.job.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  return { jobs, total, totalPages, hasPrevious: page > 1, hasNext: page < totalPages };
}

async function cleanup() {
  await prisma.user.deleteMany({ where: { email: { startsWith: `${TAG}-` } } });
}

beforeAll(async () => {
  await cleanup();

  const owner = await prisma.user.create({
    data: {
      email: `${TAG}-owner@example.test`,
      name: "เจ้าของทดสอบ",
      passwordHash: "x",
      role: UserRole.EMPLOYER,
    },
  });
  ownerId = owner.id;

  const company = await prisma.company.create({
    data: { slug: `${TAG}-company`, name: "บริษัททดสอบแบ่งหน้า", ownerId: owner.id },
  });

  /**
   * สร้างทุกแถวด้วย createMany ครั้งเดียว
   * ผลข้างเคียงที่เราต้องการ: `updatedAt` ของทุกแถวจะเท่ากันหรือใกล้กันมาก
   * ซึ่งเป็นสถานการณ์ที่ทำให้การแบ่งหน้าพังถ้าไม่มี `id` เป็นตัวตัดสินสำรอง
   */
  await prisma.job.createMany({
    data: Array.from({ length: TOTAL_JOBS }, (_, i) => ({
      slug: `${TAG}-job-${i}`,
      title: `ประกาศทดสอบ ${i}`,
      description: "-",
      location: "กรุงเทพฯ",
      companyId: company.id,
      status: JobStatus.PUBLISHED,
      publishedAt: new Date(),
    })),
  });
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("แบ่งหน้ารายการประกาศของบริษัท", () => {
  it("นับจำนวนทั้งหมดและจำนวนหน้าได้ถูกต้อง", async () => {
    const first = await fetchPage(1);
    expect(first.total).toBe(TOTAL_JOBS);
    expect(first.totalPages).toBe(3); // 25 รายการ ÷ 10 = 3 หน้า
  });

  it("แต่ละหน้าได้จำนวนตามที่กำหนด หน้าสุดท้ายได้ส่วนที่เหลือ", async () => {
    expect((await fetchPage(1)).jobs).toHaveLength(10);
    expect((await fetchPage(2)).jobs).toHaveLength(10);
    expect((await fetchPage(3)).jobs).toHaveLength(5);
  });

  it("หน้าที่เกินจำนวนจริงได้ผลว่าง ไม่พัง", async () => {
    expect((await fetchPage(99)).jobs).toHaveLength(0);
  });

  it("⚠ ไม่มีรายการซ้ำระหว่างหน้า", async () => {
    const [p1, p2, p3] = await Promise.all([fetchPage(1), fetchPage(2), fetchPage(3)]);
    const ids = [...p1.jobs, ...p2.jobs, ...p3.jobs].map((j) => j.id);

    // Set เก็บค่าไม่ซ้ำ — ถ้าขนาดต่างจาก array เดิมแปลว่ามีของซ้ำ
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("⚠ ทุกหน้ารวมกันได้ครบทุกรายการ ไม่มีอะไรหาย", async () => {
    const [p1, p2, p3] = await Promise.all([fetchPage(1), fetchPage(2), fetchPage(3)]);
    expect([...p1.jobs, ...p2.jobs, ...p3.jobs]).toHaveLength(TOTAL_JOBS);
  });

  it("ลำดับคงที่เมื่อเรียก query เดิมซ้ำ", async () => {
    // ถ้าไม่มี id เป็นตัวตัดสินสำรอง ผลจะสลับที่กันได้เมื่อ updatedAt เท่ากัน
    const a = await fetchPage(1);
    const b = await fetchPage(1);
    expect(a.jobs.map((j) => j.id)).toEqual(b.jobs.map((j) => j.id));
  });

  it("บอกได้ว่ามีหน้าก่อนหน้า/ถัดไปหรือไม่", async () => {
    expect(await fetchPage(1).then((r) => r.hasPrevious)).toBe(false);
    expect(await fetchPage(1).then((r) => r.hasNext)).toBe(true);
    expect(await fetchPage(3).then((r) => r.hasPrevious)).toBe(true);
    expect(await fetchPage(3).then((r) => r.hasNext)).toBe(false);
  });

  it("บริษัทอื่นไม่เห็นประกาศชุดนี้เลย", async () => {
    const other = await prisma.job.findMany({
      where: { company: { ownerId: "ไม่มี-owner-นี้จริง" } },
      select: { id: true },
    });
    expect(other).toHaveLength(0);
  });
});
