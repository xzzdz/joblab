import { z } from "zod";

import { ApplicationStatus } from "@/generated/prisma/enums";

export const applySchema = z.object({
  jobId: z.string().min(1, "ไม่พบประกาศงาน"),
  coverLetter: z
    .string()
    .trim()
    .max(2000, "จดหมายแนะนำตัวยาวเกิน 2,000 ตัวอักษร")
    .optional()
    // ช่องว่างล้วนให้ถือว่าไม่ได้กรอก จะได้ไม่เก็บ string ว่างลง DB
    .transform((value) => (value ? value : undefined)),
});

/**
 * สถานะที่ "บริษัท" เปลี่ยนได้
 *
 * WITHDRAWN ไม่อยู่ในรายการนี้โดยตั้งใจ — เป็นสถานะที่มีความหมายว่า "ผู้สมัครถอนเอง"
 * ถ้าปล่อยให้บริษัทตั้งค่านี้ได้ ประวัติจะโกหก และผู้สมัครจะดูเหมือนถอนทั้งที่ถูกปฏิเสธ
 */
export const employerSettableStatuses = [
  ApplicationStatus.APPLIED,
  ApplicationStatus.SCREENING,
  ApplicationStatus.INTERVIEW,
  ApplicationStatus.OFFER,
  ApplicationStatus.REJECTED,
] as const;

export const updateApplicationStatusSchema = z.object({
  applicationId: z.string().min(1),
  status: z.enum(employerSettableStatuses),
});

export type ApplyInput = z.infer<typeof applySchema>;
