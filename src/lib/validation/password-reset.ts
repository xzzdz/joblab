import { z } from "zod";

export const requestResetSchema = z.object({
  email: z.email("รูปแบบอีเมลไม่ถูกต้อง").toLowerCase(),
});

export const performResetSchema = z
  .object({
    token: z.string().min(1),
    // เงื่อนไขต้องตรงกับตอนสมัครสมาชิก ไม่งั้นจะตั้งรหัสผ่านที่ใช้ล็อกอินไม่ได้
    password: z
      .string()
      .min(8, "รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร")
      .max(72, "รหัสผ่านยาวเกิน 72 ตัวอักษร"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "รหัสผ่านทั้งสองช่องไม่ตรงกัน",
    path: ["confirmPassword"],
  });
