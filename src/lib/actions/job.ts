"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { JobStatus, UserRole } from "@/generated/prisma/enums";
import { requireRole } from "@/lib/dal";
import type { FormState } from "@/lib/form-state";
import { prisma } from "@/lib/prisma";
import { generateUniqueJobSlug } from "@/lib/slug";
import { jobContentSchema, jobCreateSchema } from "@/lib/validation/job";

/**
 * Server Actions ของประกาศงาน
 *
 * ทุก action ในไฟล์นี้ทำ 3 อย่างตามลำดับเสมอ:
 *   1. `requireRole(EMPLOYER)` — คนที่เรียกต้องล็อกอินและเป็นบริษัท
 *   2. validate ข้อมูลด้วย Zod — ไม่เชื่อ input จากฟอร์ม
 *   3. ใส่ `company: { ownerId: user.id }` ใน where — แก้ได้แค่ประกาศของตัวเอง
 *
 * ข้อ 3 คือข้อที่คนลืมบ่อยที่สุดและเสียหายหนักที่สุด
 * ผู้ใช้ที่ล็อกอินแล้ว "ไม่ได้แปลว่ามีสิทธิ์แก้ทุกอย่าง"
 */

/** ประกาศที่เป็น DRAFT ต้องไม่มีวันเผยแพร่ — รักษาเงื่อนไขนี้ไว้ที่เดียว */
function resolvePublishedAt(nextStatus: JobStatus, currentPublishedAt: Date | null): Date | null {
  if (nextStatus === JobStatus.DRAFT) return null;
  // เผยแพร่ครั้งแรกจึงตั้งเวลา ถ้าเคยเผยแพร่แล้วให้คงวันเดิมไว้
  // (ไม่งั้นแก้คำผิดทีเดียว ประกาศจะเด้งขึ้นไปอยู่บนสุดของหน้ารายการเหมือนเป็นประกาศใหม่)
  return currentPublishedAt ?? new Date();
}

/** ล้าง cache ของทุกหน้าที่แสดงประกาศนี้ */
function revalidateJobPages(slug: string) {
  revalidatePath("/jobs"); // หน้ารายการงานสาธารณะ
  revalidatePath(`/jobs/${slug}`); // หน้ารายละเอียดของประกาศนี้
  revalidatePath("/employer/jobs"); // หน้ารายการของฝั่งบริษัท
  revalidatePath("/employer");
}

function readJobFields(formData: FormData) {
  return {
    title: formData.get("title"),
    description: formData.get("description"),
    location: formData.get("location"),
    workMode: formData.get("workMode"),
    type: formData.get("type"),
    salaryMin: formData.get("salaryMin"),
    salaryMax: formData.get("salaryMax"),
  };
}

export async function createJob(_prevState: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole(UserRole.EMPLOYER);

  const company = await prisma.company.findUnique({
    where: { ownerId: user.id },
    select: { id: true },
  });

  if (!company) {
    return { message: "กรุณากรอกข้อมูลบริษัทให้เสร็จก่อน จึงจะลงประกาศได้" };
  }

  const parsed = jobCreateSchema.safeParse({
    ...readJobFields(formData),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const slug = await generateUniqueJobSlug(parsed.data.title);

  try {
    await prisma.job.create({
      data: {
        ...parsed.data,
        slug,
        publishedAt: resolvePublishedAt(parsed.data.status, null),
        // companyId มาจาก session ไม่ใช่จากฟอร์ม → ลงประกาศให้บริษัทอื่นไม่ได้
        companyId: company.id,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { message: "เกิด slug ซ้ำพอดี กรุณากดบันทึกอีกครั้ง" };
    }
    throw error;
  }

  revalidateJobPages(slug);

  // redirect ต้องอยู่นอก try/catch เพราะ Next ใช้การ throw เพื่อสั่งเปลี่ยนหน้า
  // ถ้าอยู่ใน try แล้ว catch จับไว้ การเปลี่ยนหน้าจะไม่เกิด
  redirect("/employer/jobs");
}

export async function updateJob(_prevState: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole(UserRole.EMPLOYER);

  const jobId = formData.get("jobId");
  if (typeof jobId !== "string" || jobId === "") {
    return { message: "ไม่พบรหัสประกาศที่ต้องการแก้" };
  }

  const parsed = jobContentSchema.safeParse(readJobFields(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  // อ่านสถานะเดิมมาก่อน เพราะต้องใช้คำนวณ publishedAt
  // เงื่อนไข company.ownerId ตรงนี้ทำให้ประกาศของบริษัทอื่น "หาไม่เจอ" ตั้งแต่ต้น
  const existing = await prisma.job.findFirst({
    where: { id: jobId, company: { ownerId: user.id } },
    select: { id: true, slug: true, title: true, status: true, publishedAt: true },
  });

  if (!existing) {
    // ตอบข้อความเดียวกันทั้งกรณี "ไม่มีประกาศนี้" และ "มีแต่เป็นของบริษัทอื่น"
    // ถ้าแยกข้อความ เท่ากับบอกคนนอกว่ารหัสนี้มีอยู่จริงในระบบ
    return { message: "ไม่พบประกาศนี้ หรือไม่ใช่ประกาศของบริษัทคุณ" };
  }

  // เปลี่ยนชื่อตำแหน่ง → สร้าง slug ใหม่ให้ URL ตรงกับเนื้อหา
  const slug =
    parsed.data.title === existing.title
      ? existing.slug
      : await generateUniqueJobSlug(parsed.data.title, existing.id);

  /**
   * ใช้ `updateMany` ไม่ใช่ `update`
   *
   * `update` รับ where ได้เฉพาะฟิลด์ unique (id) → ใส่เงื่อนไขเจ้าของไม่ได้
   * `updateMany` รับ where เต็มรูปแบบ → แนบเงื่อนไขเจ้าของไปกับคำสั่งเขียนได้เลย
   * ผลคือถ้าระหว่างนี้สิทธิ์เปลี่ยนไป คำสั่งจะอัปเดต 0 แถว แทนที่จะเขียนทับข้อมูลคนอื่น
   */
  const result = await prisma.job.updateMany({
    where: { id: jobId, company: { ownerId: user.id } },
    data: {
      ...parsed.data,
      slug,
      // ไม่แตะ status — คงสถานะเดิมไว้ การเปลี่ยนสถานะเป็นหน้าที่ของ setJobStatus
      publishedAt: resolvePublishedAt(existing.status, existing.publishedAt),
    },
  });

  if (result.count === 0) {
    return { message: "แก้ไขไม่สำเร็จ ประกาศนี้อาจถูกลบหรือเปลี่ยนเจ้าของไปแล้ว" };
  }

  revalidateJobPages(slug);
  if (slug !== existing.slug) revalidatePath(`/jobs/${existing.slug}`); // ล้างหน้า URL เดิมด้วย

  return { success: "บันทึกการแก้ไขแล้ว" };
}

/**
 * เปลี่ยนสถานะประกาศ
 *
 * ไม่ปล่อยให้เปลี่ยนจากสถานะไหนไปสถานะไหนก็ได้ — กำหนดเป็น state machine ไว้ชัด ๆ
 * เหตุผล: ถ้าอนุญาต PUBLISHED → DRAFT ประกาศที่คนกำลังดูอยู่จะหายไปเงียบ ๆ
 * และวันเผยแพร่เดิมจะหาย การปิดรับควรใช้ CLOSED ซึ่งเก็บประวัติไว้
 */
const ALLOWED_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  DRAFT: [JobStatus.PUBLISHED],
  PUBLISHED: [JobStatus.CLOSED],
  CLOSED: [JobStatus.PUBLISHED],
};

export async function setJobStatus(formData: FormData): Promise<void> {
  const user = await requireRole(UserRole.EMPLOYER);

  const jobId = formData.get("jobId");
  const parsedStatus = z.enum(JobStatus).safeParse(formData.get("status"));

  if (typeof jobId !== "string" || !parsedStatus.success) {
    redirect("/employer/jobs");
  }

  const nextStatus = parsedStatus.data;

  const existing = await prisma.job.findFirst({
    where: { id: jobId, company: { ownerId: user.id } },
    select: { id: true, slug: true, status: true, publishedAt: true },
  });

  // ไม่ใช่ของเรา หรือเปลี่ยนสถานะแบบนี้ไม่ได้ → กลับหน้าเดิมเฉย ๆ ไม่ทำอะไร
  if (!existing || !ALLOWED_TRANSITIONS[existing.status].includes(nextStatus)) {
    redirect("/employer/jobs");
  }

  await prisma.job.updateMany({
    where: { id: jobId, company: { ownerId: user.id } },
    data: {
      status: nextStatus,
      publishedAt: resolvePublishedAt(nextStatus, existing.publishedAt),
    },
  });

  revalidateJobPages(existing.slug);
  redirect("/employer/jobs");
}

/**
 * ลบประกาศ
 *
 * ห้ามลบประกาศที่กำลังเผยแพร่อยู่ — ต้องกดปิดรับ (CLOSED) ก่อน
 * เพื่อไม่ให้ประกาศที่คนกำลังเปิดดูหายไปกลางทาง และเผื่อ Phase 5
 * ที่จะมีใบสมัครผูกกับประกาศ (ลบประกาศทิ้งเลยจะทำให้ประวัติการสมัครหายตามไปด้วย)
 */
export async function deleteJob(formData: FormData): Promise<void> {
  const user = await requireRole(UserRole.EMPLOYER);

  const jobId = formData.get("jobId");
  if (typeof jobId !== "string") redirect("/employer/jobs");

  const existing = await prisma.job.findFirst({
    where: { id: jobId, company: { ownerId: user.id } },
    select: { id: true, slug: true, status: true },
  });

  if (!existing || existing.status === JobStatus.PUBLISHED) {
    redirect("/employer/jobs");
  }

  await prisma.job.deleteMany({
    where: { id: jobId, company: { ownerId: user.id } },
  });

  revalidateJobPages(existing.slug);
  redirect("/employer/jobs");
}
