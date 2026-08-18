"use server";

import { revalidatePath } from "next/cache";

import { Prisma } from "@/generated/prisma/client";
import { JobStatus, UserRole } from "@/generated/prisma/enums";
import { requireRole } from "@/lib/dal";
import type { FormState } from "@/lib/form-state";
import { prisma } from "@/lib/prisma";

/**
 * บันทึก / เลิกบันทึกงาน
 *
 * ใช้ action เดียวสลับสองสถานะ (toggle) ไม่ได้แยกเป็น save/unsave
 * เพราะปุ่มบนหน้าเว็บมีปุ่มเดียว และการมี endpoint เดียวลดโอกาสที่สองปุ่ม
 * จะมีเงื่อนไขสิทธิ์ไม่ตรงกัน
 */
export async function toggleSavedJobAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  // เฉพาะผู้สมัครงาน — บัญชีบริษัทไม่มีเหตุต้องบันทึกงานไว้ดูภายหลัง
  const user = await requireRole(UserRole.SEEKER);

  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return { message: "ไม่พบประกาศงาน" };

  /**
   * เช็คว่าประกาศมีอยู่จริงและเผยแพร่อยู่
   *
   * ถ้าไม่เช็ค คนยิง request ตรงเข้ามาด้วย jobId ของประกาศ DRAFT
   * จะสร้างแถวใน SavedJob ที่ชี้ไปประกาศลับได้ ซึ่งเท่ากับยืนยันว่าประกาศนั้นมีอยู่
   */
  const job = await prisma.job.findFirst({
    where: { id: jobId, status: JobStatus.PUBLISHED },
    select: { id: true, slug: true },
  });

  if (!job) return { message: "ประกาศนี้ปิดรับแล้ว หรือไม่มีอยู่จริง" };

  /**
   * ลบก่อน ถ้าไม่มีอะไรถูกลบก็แปลว่ายังไม่ได้บันทึก → ค่อยสร้าง
   *
   * ใช้ `deleteMany` ไม่ใช่ `delete` เพราะ `delete` โยน error ถ้าไม่เจอแถว
   * ส่วน `deleteMany` คืนจำนวนแถวที่ลบ ซึ่งใช้เป็นคำตอบว่า "เดิมบันทึกไว้ไหม" ได้พอดี
   * — และมี `userId` อยู่ใน where ด้วย จึงลบของคนอื่นไม่ได้
   */
  const removed = await prisma.savedJob.deleteMany({ where: { userId: user.id, jobId: job.id } });

  let saved: boolean;

  if (removed.count > 0) {
    saved = false;
  } else {
    try {
      await prisma.savedJob.create({ data: { userId: user.id, jobId: job.id } });
      saved = true;
    } catch (error) {
      /**
       * P2002 = ชน unique constraint [userId, jobId]
       *
       * เกิดได้จริงถ้าผู้ใช้กดปุ่มรัว ๆ สองครั้งพร้อมกัน: request แรกลบไม่เจอแล้วกำลังจะสร้าง
       * request ที่สองก็ลบไม่เจอแล้วกำลังจะสร้างเหมือนกัน หนึ่งในสองจะชน constraint
       * ผลลัพธ์สุดท้ายคือ "บันทึกแล้ว" ซึ่งถูกต้องอยู่แล้ว จึงไม่ต้องแจ้ง error ให้ผู้ใช้
       */
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        saved = true;
      } else {
        throw error;
      }
    }
  }

  // หน้าที่แสดงสถานะปุ่มนี้ต้องดึงข้อมูลใหม่ทั้งหมด
  revalidatePath("/saved");
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${job.slug}`);

  return { success: saved ? "บันทึกงานนี้แล้ว" : "เอาออกจากรายการที่บันทึกแล้ว" };
}
