"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { ApplicationStatus, JobStatus, UserRole } from "@/generated/prisma/enums";
import { requireRole } from "@/lib/dal";
import type { FormState } from "@/lib/form-state";
import { prisma } from "@/lib/prisma";
import { InvalidFileError, validateResume } from "@/lib/storage";
import { applySchema, updateApplicationStatusSchema } from "@/lib/validation/application";

/**
 * Server Actions ของระบบใบสมัคร
 *
 * ทุก action เริ่มด้วย requireUser / requireRole เสมอ
 * ไม่ใช่เพราะหน้าเว็บซ่อนปุ่มไว้แล้ว — action ที่ export จากไฟล์ "use server"
 * คือ endpoint สาธารณะ ใครยิงตรงเข้ามาก็ได้โดยไม่ต้องผ่านหน้าเว็บของเรา
 */

/** ส่งใบสมัคร */
export async function applyToJobAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  // ต้องเป็นผู้สมัครงานเท่านั้น บัญชีบริษัทสมัครงานตัวเองไม่ได้
  const seeker = await requireRole(UserRole.SEEKER);

  const parsed = applySchema.safeParse({
    jobId: formData.get("jobId"),
    coverLetter: formData.get("coverLetter"),
  });

  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const { jobId, coverLetter } = parsed.data;

  /**
   * เช็คว่าประกาศนี้ยังเปิดรับอยู่จริง
   *
   * สำคัญ: ผู้ใช้อาจเปิดหน้านี้ค้างไว้ตั้งแต่เมื่อวาน แล้วบริษัทเพิ่งปิดรับไป
   * หรืออาจยิง request ตรงเข้ามาด้วย jobId ของประกาศที่ยังเป็น DRAFT
   * การเช็คตอนแสดงหน้าอย่างเดียวไม่พอ ต้องเช็คอีกครั้งตอนบันทึกจริง
   */
  const job = await prisma.job.findFirst({
    where: { id: jobId, status: JobStatus.PUBLISHED },
    select: { id: true, slug: true },
  });

  if (!job) {
    return { message: "ประกาศนี้ปิดรับสมัครแล้ว หรือไม่มีอยู่จริง" };
  }

  const file = formData.get("resume");
  if (!(file instanceof File)) {
    return { fieldErrors: { resume: ["กรุณาแนบไฟล์ resume"] } };
  }

  let resume;
  try {
    resume = await validateResume(file);
  } catch (error) {
    if (error instanceof InvalidFileError) {
      return { fieldErrors: { resume: [error.message] } };
    }
    throw error;
  }

  try {
    /**
     * สร้างใบสมัครและไฟล์ให้เป็นก้อนเดียวกัน
     *
     * Prisma เขียนแบบ nested create ให้อยู่ใน transaction เดียวกันอัตโนมัติ
     * แปลว่าเป็นไปไม่ได้ที่จะเกิดใบสมัครที่ไม่มีไฟล์ หรือไฟล์ที่ไม่มีใบสมัคร
     * ต่างจากตอนเก็บลงดิสก์ที่ต้องเขียนโค้ดลบไฟล์ทิ้งเองใน catch เพราะดิสก์
     * ไม่ได้อยู่ใน transaction เดียวกับ DB
     */
    await prisma.application.create({
      data: {
        jobId: job.id,
        seekerId: seeker.id,
        coverLetter,
        resumeName: resume.displayName,
        resume: {
          create: { data: resume.bytes, size: resume.size },
        },
      },
    });
  } catch (error) {
    // P2002 = ชน unique constraint [jobId, seekerId] → เคยสมัครงานนี้ไปแล้ว
    // ไม่ต้องเก็บกวาดอะไรแล้ว เพราะ transaction ย้อนกลับให้เองทั้งก้อน
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { message: "คุณสมัครงานนี้ไปแล้ว" };
    }
    throw error;
  }

  revalidatePath(`/jobs/${job.slug}`);
  revalidatePath("/applications");

  return { success: "ส่งใบสมัครเรียบร้อยแล้ว" };
}

/** ผู้สมัครถอนใบสมัครของตัวเอง */
export async function withdrawApplicationAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const seeker = await requireRole(UserRole.SEEKER);
  const applicationId = String(formData.get("applicationId") ?? "");

  /**
   * ใช้ updateMany ไม่ใช่ update
   *
   * update ต้องระบุ where ด้วยฟิลด์ unique เท่านั้น (คือ id) ซึ่งแปลว่า
   * ต้องดึงมาเช็คเจ้าของก่อนแล้วค่อยสั่งอัปเดต — เป็นสองจังหวะที่มีช่องว่างตรงกลาง
   * updateMany รับเงื่อนไขอะไรก็ได้ จึงยัด seekerId ลงไปใน where ได้เลย
   * ถ้าไม่ใช่ของเขา count จะเป็น 0 โดยที่ไม่มีอะไรถูกแก้
   */
  const result = await prisma.application.updateMany({
    where: {
      id: applicationId,
      seekerId: seeker.id,
      // ถอนได้เฉพาะใบที่ยังอยู่ในกระบวนการ ใบที่จบไปแล้วไม่ต้องไปยุ่ง
      status: {
        in: [
          ApplicationStatus.APPLIED,
          ApplicationStatus.SCREENING,
          ApplicationStatus.INTERVIEW,
          ApplicationStatus.OFFER,
        ],
      },
    },
    data: { status: ApplicationStatus.WITHDRAWN },
  });

  if (result.count === 0) {
    return { message: "ถอนใบสมัครนี้ไม่ได้" };
  }

  revalidatePath("/applications");
  return { success: "ถอนใบสมัครแล้ว" };
}

/** บริษัทเปลี่ยนสถานะใบสมัคร (ย้ายการ์ดบนบอร์ด) */
export async function updateApplicationStatusAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const owner = await requireRole(UserRole.EMPLOYER);

  const parsed = updateApplicationStatusSchema.safeParse({
    applicationId: formData.get("applicationId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return { message: "ข้อมูลไม่ถูกต้อง" };
  }

  const { applicationId, status } = parsed.data;

  // เงื่อนไข job.company.ownerId คือด่านที่กันไม่ให้บริษัทอื่นมาแก้ใบสมัครของเรา
  const result = await prisma.application.updateMany({
    where: {
      id: applicationId,
      job: { company: { ownerId: owner.id } },
      // ใบที่ผู้สมัครถอนไปแล้ว บริษัทดึงกลับมาไม่ได้ — การตัดสินใจนั้นเป็นของผู้สมัคร
      status: { not: ApplicationStatus.WITHDRAWN },
    },
    data: { status },
  });

  if (result.count === 0) {
    return { message: "เปลี่ยนสถานะไม่สำเร็จ" };
  }

  revalidatePath("/employer/jobs");
  return { success: "อัปเดตสถานะแล้ว" };
}
