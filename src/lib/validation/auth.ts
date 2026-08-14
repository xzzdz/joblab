import { z } from "zod";

import { UserRole } from "@/generated/prisma/enums";

/**
 * Schema สำหรับตรวจข้อมูลจากฟอร์ม
 *
 * เขียนไว้ที่เดียวแล้วใช้ทั้งฝั่ง client และ server
 * แต่จำไว้ว่า **การตรวจฝั่ง client เป็นแค่ UX** ผู้ใช้ปิด JavaScript หรือยิง request ตรงก็ข้ามได้
 * ด่านที่กันจริงคือการตรวจฝั่ง server เท่านั้น
 */

export const loginSchema = z.object({
  email: z.email("รูปแบบอีเมลไม่ถูกต้อง"),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "ชื่อต้องยาวอย่างน้อย 2 ตัวอักษร").max(80, "ชื่อยาวเกินไป"),
    email: z.email("รูปแบบอีเมลไม่ถูกต้อง").toLowerCase(),
    // bcrypt สนใจแค่ 72 byte แรกของรหัสผ่าน ส่วนที่เกินจะถูกตัดทิ้งเงียบ ๆ
    // เลยจำกัดความยาวไว้ ไม่ให้ผู้ใช้เข้าใจผิดว่ารหัสยาว ๆ ปลอดภัยกว่า
    password: z
      .string()
      .min(8, "รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร")
      .max(72, "รหัสผ่านยาวเกิน 72 ตัวอักษร"),
    confirmPassword: z.string(),
    role: z.enum(UserRole),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "รหัสผ่านทั้งสองช่องไม่ตรงกัน",
    path: ["confirmPassword"], // ให้ error ไปโผล่ใต้ช่องยืนยันรหัสผ่าน
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
