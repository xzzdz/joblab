"use server";

import { hash } from "bcryptjs";
import { AuthError } from "next-auth";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { signIn, signOut } from "@/lib/auth";
import type { FormState } from "@/lib/form-state";
import { prisma } from "@/lib/prisma";
import { loginSchema, registerSchema } from "@/lib/validation/auth";

/**
 * Server Actions สำหรับสมัครสมาชิก / เข้าสู่ระบบ / ออกจากระบบ
 *
 * `"use server"` บนสุดทำให้ฟังก์ชันในไฟล์นี้รันบน server เสมอ
 * ฟอร์มฝั่ง client เรียกได้เหมือนเรียกฟังก์ชันธรรมดา โดย Next สร้าง endpoint ให้เบื้องหลัง
 * ข้อดีคือฟอร์มยังทำงานได้แม้ JavaScript ยังโหลดไม่เสร็จ (progressive enhancement)
 *
 * ข้อควรระวัง: ฟังก์ชันที่ export จากไฟล์ "use server" = endpoint สาธารณะ
 * ใครก็ยิงเข้ามาได้ตรง ๆ ด้วยข้อมูลอะไรก็ได้ → ต้อง validate ทุกครั้ง ห้ามเชื่อ input
 */

/** ใช้รูปร่างเดียวกับฟอร์มอื่นทั้งโปรเจค (ดู src/lib/form-state.ts) */
export type AuthFormState = FormState;

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const callbackUrl = formData.get("callbackUrl");
  const redirectTo = typeof callbackUrl === "string" && callbackUrl.startsWith("/")
    ? callbackUrl // รับเฉพาะ path ภายในเว็บ กัน open redirect ไปเว็บฟิชชิง
    : "/jobs";

  try {
    await signIn("credentials", { ...parsed.data, redirectTo });
  } catch (error) {
    // signIn ที่สำเร็จจะ "โยน" redirect ออกมา ซึ่งเป็นพฤติกรรมปกติของ Next
    // เลยต้องแยกให้ออกว่าอันไหนคือ error จริง อันไหนคือ redirect
    if (error instanceof AuthError) {
      // ไม่บอกว่าผิดที่อีเมลหรือรหัสผ่าน เพื่อไม่ให้คนเดาได้ว่าอีเมลไหนมีบัญชีอยู่
      return { message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
    }
    throw error; // ปล่อย redirect ผ่านไป
  }

  return {};
}

export async function registerAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const { name, email, password, role } = parsed.data;

  // cost 12: ใช้เวลาแฮชราว 200-300ms ต่อครั้ง
  // ช้าพอที่จะทำให้การไล่เดารหัสผ่านจากฐานข้อมูลที่หลุดไม่คุ้ม แต่ยังเร็วพอสำหรับผู้ใช้จริง
  const passwordHash = await hash(password, 12);

  try {
    await prisma.user.create({
      data: { name, email, passwordHash, role },
    });
  } catch (error) {
    /**
     * P2002 = ผิดกฎ unique constraint (ในที่นี้คืออีเมลซ้ำ)
     *
     * ทำไมไม่เช็คด้วย findUnique ก่อนสร้าง: ระหว่างที่เช็คเสร็จแล้วยังไม่ทันสร้าง
     * อาจมี request อีกอันสมัครอีเมลเดียวกันแทรกเข้ามาพอดี (race condition)
     * การให้ฐานข้อมูลเป็นคนตัดสินคือวิธีเดียวที่ปิดช่องนี้ได้จริง
     */
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { fieldErrors: { email: ["อีเมลนี้ถูกใช้สมัครไปแล้ว"] } };
    }
    throw error;
  }

  // สมัครเสร็จแล้วล็อกอินให้เลย ผู้ใช้จะได้ไม่ต้องกรอกซ้ำ
  try {
    await signIn("credentials", { email, password, redirectTo: "/jobs" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { message: "สมัครสำเร็จแล้ว แต่เข้าสู่ระบบอัตโนมัติไม่สำเร็จ กรุณาล็อกอินเอง" };
    }
    throw error;
  }

  return {};
}

export async function logoutAction() {
  await signOut({ redirectTo: "/jobs" });
}
