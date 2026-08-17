import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PrismaClient } from "@/generated/prisma/client";
import { ApplicationStatus, JobStatus, UserRole } from "@/generated/prisma/enums";

/**
 * เทสต์ "ด่านกันสิทธิ์" กับฐานข้อมูลจริง
 *
 * ทำไมต้องต่อ DB จริงแทนที่จะ mock:
 * สิ่งที่เรากำลังเทสต์คือ **เงื่อนไข `where` ของ Prisma** ว่ากันข้อมูลได้จริงไหม
 * ถ้า mock Prisma ทิ้ง เท่ากับเทสต์ mock ของตัวเอง ไม่ได้เทสต์ของจริงเลย
 * — เทสต์ที่ผ่านแต่ไม่ได้พิสูจน์อะไรนั้นแย่กว่าไม่มีเทสต์ เพราะให้ความมั่นใจผิด ๆ
 *
 * เทสต์ชุดนี้สร้างข้อมูลของตัวเองด้วย prefix เฉพาะ แล้วลบทิ้งเมื่อจบ
 * จึงไม่แตะข้อมูล seed และรันซ้ำได้เรื่อย ๆ
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

/** prefix เฉพาะของเทสต์ชุดนี้ ใช้ทั้งตอนสร้างและตอนลบ จะได้ไม่โดนข้อมูลอื่น */
const TAG = "authz-test";

let companyAOwnerId: string;
let companyBOwnerId: string;
let seekerOneId: string;
let seekerTwoId: string;
let jobAId: string;
let applicationId: string;

async function cleanup() {
  // ลบ User ก่อน แล้ว Cascade จะพา Company → Job → Application → ResumeFile ไปเอง
  await prisma.user.deleteMany({ where: { email: { startsWith: `${TAG}-` } } });
}

beforeAll(async () => {
  await cleanup();

  const [ownerA, ownerB, seeker1, seeker2] = await Promise.all([
    prisma.user.create({
      data: {
        email: `${TAG}-owner-a@example.test`,
        name: "เจ้าของ A",
        passwordHash: "x",
        role: UserRole.EMPLOYER,
      },
    }),
    prisma.user.create({
      data: {
        email: `${TAG}-owner-b@example.test`,
        name: "เจ้าของ B",
        passwordHash: "x",
        role: UserRole.EMPLOYER,
      },
    }),
    prisma.user.create({
      data: { email: `${TAG}-seeker-1@example.test`, name: "ผู้สมัคร 1", passwordHash: "x" },
    }),
    prisma.user.create({
      data: { email: `${TAG}-seeker-2@example.test`, name: "ผู้สมัคร 2", passwordHash: "x" },
    }),
  ]);

  companyAOwnerId = ownerA.id;
  companyBOwnerId = ownerB.id;
  seekerOneId = seeker1.id;
  seekerTwoId = seeker2.id;

  const companyA = await prisma.company.create({
    data: { slug: `${TAG}-company-a`, name: "บริษัท A", ownerId: ownerA.id },
  });
  await prisma.company.create({
    data: { slug: `${TAG}-company-b`, name: "บริษัท B", ownerId: ownerB.id },
  });

  const job = await prisma.job.create({
    data: {
      slug: `${TAG}-job-a`,
      title: "ตำแหน่งของบริษัท A",
      description: "รายละเอียด",
      location: "กรุงเทพฯ",
      companyId: companyA.id,
      status: JobStatus.PUBLISHED,
      publishedAt: new Date(),
    },
  });
  jobAId = job.id;

  const application = await prisma.application.create({
    data: {
      jobId: job.id,
      seekerId: seeker1.id,
      resumeName: "resume.pdf",
      resume: { create: { data: new TextEncoder().encode("%PDF-fake"), size: 9 } },
    },
  });
  applicationId = application.id;
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("ประกาศงาน — เงื่อนไขความเป็นเจ้าของ", () => {
  it("เจ้าของอ่านประกาศตัวเองได้", async () => {
    const job = await prisma.job.findFirst({
      where: { id: jobAId, company: { ownerId: companyAOwnerId } },
    });
    expect(job).not.toBeNull();
  });

  it("บริษัทอื่นอ่านประกาศไม่ได้ แม้จะรู้ id", async () => {
    const job = await prisma.job.findFirst({
      where: { id: jobAId, company: { ownerId: companyBOwnerId } },
    });
    expect(job).toBeNull();
  });

  it("บริษัทอื่นแก้ประกาศไม่ได้ (updateMany ได้ 0 แถว)", async () => {
    const result = await prisma.job.updateMany({
      where: { id: jobAId, company: { ownerId: companyBOwnerId } },
      data: { title: "ถูกแฮ็กแล้ว" },
    });
    expect(result.count).toBe(0);

    const job = await prisma.job.findUniqueOrThrow({ where: { id: jobAId } });
    expect(job.title).toBe("ตำแหน่งของบริษัท A");
  });

  it("บริษัทอื่นลบประกาศไม่ได้", async () => {
    const result = await prisma.job.deleteMany({
      where: { id: jobAId, company: { ownerId: companyBOwnerId } },
    });
    expect(result.count).toBe(0);
    expect(await prisma.job.findUnique({ where: { id: jobAId } })).not.toBeNull();
  });
});

describe("ประกาศสาธารณะ — ต้องเห็นเฉพาะที่เผยแพร่", () => {
  it("ประกาศ DRAFT ไม่โผล่ในการค้นแบบสาธารณะ", async () => {
    const draft = await prisma.job.create({
      data: {
        slug: `${TAG}-draft`,
        title: "ยังไม่เผยแพร่",
        description: "-",
        location: "กรุงเทพฯ",
        companyId: (await prisma.company.findUniqueOrThrow({
          where: { slug: `${TAG}-company-a` },
        })).id,
        status: JobStatus.DRAFT,
      },
    });

    const found = await prisma.job.findFirst({
      where: { slug: `${TAG}-draft`, status: JobStatus.PUBLISHED },
    });
    expect(found).toBeNull();

    await prisma.job.delete({ where: { id: draft.id } });
  });
});

describe("ใบสมัคร — ใครเห็นไฟล์ resume ได้บ้าง", () => {
  const viewerWhere = (userId: string) => ({
    id: applicationId,
    OR: [{ seekerId: userId }, { job: { company: { ownerId: userId } } }],
  });

  it("เจ้าของใบสมัครเห็นได้", async () => {
    const found = await prisma.application.findFirst({ where: viewerWhere(seekerOneId) });
    expect(found).not.toBeNull();
  });

  it("บริษัทที่รับสมัครเห็นได้", async () => {
    const found = await prisma.application.findFirst({ where: viewerWhere(companyAOwnerId) });
    expect(found).not.toBeNull();
  });

  it("ผู้สมัครคนอื่นเห็นไม่ได้", async () => {
    const found = await prisma.application.findFirst({ where: viewerWhere(seekerTwoId) });
    expect(found).toBeNull();
  });

  it("บริษัทอื่นเห็นไม่ได้", async () => {
    const found = await prisma.application.findFirst({ where: viewerWhere(companyBOwnerId) });
    expect(found).toBeNull();
  });

  it("บริษัทอื่นเปลี่ยนสถานะใบสมัครไม่ได้", async () => {
    const result = await prisma.application.updateMany({
      where: { id: applicationId, job: { company: { ownerId: companyBOwnerId } } },
      data: { status: ApplicationStatus.OFFER },
    });
    expect(result.count).toBe(0);
  });

  it("ผู้สมัครคนอื่นถอนใบสมัครนี้ไม่ได้", async () => {
    const result = await prisma.application.updateMany({
      where: { id: applicationId, seekerId: seekerTwoId },
      data: { status: ApplicationStatus.WITHDRAWN },
    });
    expect(result.count).toBe(0);
  });
});

describe("กฎระดับฐานข้อมูล", () => {
  it("สมัครงานเดิมซ้ำไม่ได้ (unique constraint)", async () => {
    await expect(
      prisma.application.create({
        data: { jobId: jobAId, seekerId: seekerOneId, resumeName: "อีกใบ.pdf" },
      })
    ).rejects.toThrow();
  });

  it("อีเมลซ้ำสมัครไม่ได้ (unique constraint)", async () => {
    await expect(
      prisma.user.create({
        data: { email: `${TAG}-seeker-1@example.test`, name: "ซ้ำ", passwordHash: "x" },
      })
    ).rejects.toThrow();
  });

  it("ลบใบสมัครแล้วไฟล์ resume ถูกลบตามด้วย (cascade)", async () => {
    const temp = await prisma.application.create({
      data: {
        jobId: jobAId,
        seekerId: seekerTwoId,
        resumeName: "temp.pdf",
        resume: { create: { data: new TextEncoder().encode("%PDF-x"), size: 6 } },
      },
      include: { resume: true },
    });

    expect(temp.resume).not.toBeNull();
    const fileId = temp.resume!.id;

    await prisma.application.delete({ where: { id: temp.id } });

    // ไม่ต้องเขียนโค้ดลบไฟล์เอง — ฐานข้อมูลจัดการให้จาก onDelete: Cascade
    expect(await prisma.resumeFile.findUnique({ where: { id: fileId } })).toBeNull();
  });
});
