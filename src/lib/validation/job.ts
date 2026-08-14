import { z } from "zod";

import { JobStatus, JobType, WorkMode } from "@/generated/prisma/enums";

/**
 * Schema สำหรับฟอร์มของฝั่งบริษัท
 *
 * ข้อมูลจาก <form> มาเป็น string ทั้งหมดเสมอ ช่องที่ไม่กรอกจะได้ "" (ไม่ใช่ null)
 * เลยต้องแปลงก่อนตรวจ ไม่ใช่ตรวจตรง ๆ
 */

/** "" → null, "45000" → 45000 */
const optionalMoney = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  z.coerce
    .number({ error: "กรุณากรอกเป็นตัวเลข" })
    .int("ต้องเป็นจำนวนเต็ม")
    .min(0, "ต้องไม่ติดลบ")
    .max(10_000_000, "ตัวเลขสูงเกินไป")
    .nullable()
);

/** "" → null, ถ้ากรอกต้องเป็น URL ที่ใช้ได้จริง */
const optionalUrl = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  z.url("รูปแบบลิงก์ไม่ถูกต้อง (ต้องขึ้นต้นด้วย https://)").max(300).nullable()
);

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : value),
    z.string().max(max, `ยาวเกิน ${max} ตัวอักษร`).nullable()
  );

export const companyProfileSchema = z.object({
  name: z.string().trim().min(2, "ชื่อบริษัทสั้นเกินไป").max(120, "ชื่อบริษัทยาวเกินไป"),
  website: optionalUrl,
  logoUrl: optionalUrl,
  description: optionalText(2000),
});

/** เนื้อหาของประกาศ — ไม่มีสถานะอยู่ในนี้ */
const jobContentFields = z.object({
  title: z.string().trim().min(3, "ชื่อตำแหน่งสั้นเกินไป").max(120, "ชื่อตำแหน่งยาวเกินไป"),
  description: z
    .string()
    .trim()
    .min(30, "รายละเอียดงานควรยาวอย่างน้อย 30 ตัวอักษร เพื่อให้ผู้สมัครตัดสินใจได้")
    .max(10_000, "รายละเอียดยาวเกินไป"),
  location: z.string().trim().min(2, "กรุณาระบุสถานที่").max(120, "ยาวเกินไป"),
  workMode: z.enum(WorkMode),
  type: z.enum(JobType),
  salaryMin: optionalMoney,
  salaryMax: optionalMoney,
});

/** ใช้ซ้ำได้ทั้งสอง schema — เขียนกฎเดียวกันสองที่แล้วจะลืมแก้ที่หนึ่ง */
const salaryRangeCheck = {
  check: (data: { salaryMin: number | null; salaryMax: number | null }) =>
    data.salaryMin === null || data.salaryMax === null || data.salaryMax >= data.salaryMin,
  options: {
    message: "เงินเดือนสูงสุดต้องไม่น้อยกว่าเงินเดือนต่ำสุด",
    path: ["salaryMax"],
  },
};

/**
 * ฟอร์มแก้ไขประกาศ — **แก้ได้แค่เนื้อหา ไม่มีช่องเปลี่ยนสถานะ**
 *
 * ทำไมแยก: ถ้าให้ฟอร์มแก้ไขเปลี่ยนสถานะได้ด้วย พอเปิดประกาศที่ปิดรับแล้ว (CLOSED)
 * มาแก้คำผิดแล้วกดบันทึก ประกาศจะถูกเปิดรับใหม่โดยที่ไม่มีใครสั่ง
 * การเปลี่ยนสถานะเป็นการกระทำที่ตั้งใจ ควรมีปุ่มของตัวเอง
 */
export const jobContentSchema = jobContentFields.refine(
  salaryRangeCheck.check,
  salaryRangeCheck.options
);

/** ฟอร์มสร้างประกาศ — เลือกได้ว่าจะเก็บเป็นฉบับร่างหรือเผยแพร่เลย */
export const jobCreateSchema = jobContentFields
  .extend({ status: z.enum([JobStatus.DRAFT, JobStatus.PUBLISHED]) })
  .refine(salaryRangeCheck.check, salaryRangeCheck.options);

export type CompanyProfileInput = z.infer<typeof companyProfileSchema>;
export type JobContentInput = z.infer<typeof jobContentSchema>;
export type JobCreateInput = z.infer<typeof jobCreateSchema>;
