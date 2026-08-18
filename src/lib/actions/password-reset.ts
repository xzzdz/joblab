"use server";

import { hash } from "bcryptjs";
import { z } from "zod";

import { sendEmail } from "@/lib/email";
import type { FormState } from "@/lib/form-state";
import {
  RESET_TOKEN_TTL_MS,
  checkResetToken,
  consumeResetToken,
  createPasswordResetToken,
} from "@/lib/password-reset";
import { formatRetryAfter, getClientIp, rateLimit } from "@/lib/rate-limit";
import { absoluteUrl } from "@/lib/site";
import { performResetSchema, requestResetSchema } from "@/lib/validation/password-reset";

/**
 * เพดานการขอลิงก์ตั้งรหัสผ่านใหม่
 *
 * จำกัดเข้มกว่าการล็อกอินเพราะแต่ละครั้งส่งอีเมลจริงออกไป
 * ถ้าไม่กัน คนร้ายยิงรัว ๆ ด้วยอีเมลของเหยื่อได้ → เหยื่อถูกถล่มด้วยอีเมล (mail bombing)
 * และโควตาอีเมลของเราหมดฟรี ๆ
 */
const RESET_WINDOW_MS = 15 * 60 * 1000;
const RESET_MAX_PER_IP = 5;
const RESET_MAX_PER_EMAIL = 3;

/**
 * ข้อความที่ตอบกลับ **เหมือนกันทุกกรณี**
 *
 * ไม่ว่าจะมีบัญชีนั้นจริงหรือไม่ ผู้ใช้จะเห็นข้อความเดียวกันเสมอ
 * ถ้าแยกข้อความ หน้านี้จะกลายเป็นเครื่องมือให้คนไล่เช็คว่าอีเมลไหนมีบัญชีในระบบ
 * ซึ่งเป็นข้อมูลที่เอาไปใช้ต่อได้ (ส่งอีเมลหลอก, ไล่เดารหัสผ่านเฉพาะบัญชีที่มีจริง)
 */
const SAME_ANSWER =
  "ถ้าอีเมลนี้มีบัญชีอยู่ในระบบ เราได้ส่งลิงก์ตั้งรหัสผ่านใหม่ไปให้แล้ว กรุณาตรวจกล่องจดหมาย";

export async function requestPasswordResetAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = requestResetSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const { email } = parsed.data;
  const ip = await getClientIp();

  const byIp = rateLimit(`reset:ip:${ip}`, RESET_MAX_PER_IP, RESET_WINDOW_MS);
  const byEmail = rateLimit(`reset:email:${email}`, RESET_MAX_PER_EMAIL, RESET_WINDOW_MS);

  if (!byIp.allowed || !byEmail.allowed) {
    const wait = Math.max(byIp.retryAfterSeconds, byEmail.retryAfterSeconds);
    return { message: `ขอลิงก์ถี่เกินไป กรุณารออีก ${formatRetryAfter(wait)}` };
  }

  const created = await createPasswordResetToken(email);

  // ไม่มีบัญชี (หรือเป็นบัญชีที่ไม่มีรหัสผ่าน) → ตอบเหมือนกันโดยไม่ส่งอะไร
  if (!created) return { success: SAME_ANSWER };

  const minutes = Math.round(RESET_TOKEN_TTL_MS / 60000);
  const link = absoluteUrl(`/reset-password?token=${created.token}`);

  try {
    await sendEmail({
      to: email,
      subject: "ตั้งรหัสผ่านใหม่สำหรับ JobLab",
      text: [
        `สวัสดีคุณ${created.userName}`,
        "",
        "มีการขอตั้งรหัสผ่านใหม่สำหรับบัญชี JobLab ของคุณ",
        `กดลิงก์ด้านล่างเพื่อตั้งรหัสผ่านใหม่ (ลิงก์ใช้ได้ ${minutes} นาที และใช้ได้ครั้งเดียว)`,
        "",
        link,
        "",
        "ถ้าคุณไม่ได้เป็นคนขอ ไม่ต้องทำอะไร รหัสผ่านเดิมยังใช้งานได้ตามปกติ",
      ].join("\n"),
    });
  } catch (error) {
    /**
     * ส่งอีเมลล้มเหลว — log ไว้ฝั่ง server แต่ยังตอบผู้ใช้ด้วยข้อความเดียวกัน
     *
     * ทำไมไม่บอกผู้ใช้ว่าส่งไม่สำเร็จ: ข้อความ error จากผู้ให้บริการอาจบอกได้ว่า
     * อีเมลปลายทางมีอยู่จริงหรือไม่ ซึ่งทำให้ความพยายามซ่อนข้อมูลข้างบนเสียเปล่า
     */
    console.error("ส่งอีเมลตั้งรหัสผ่านใหม่ไม่สำเร็จ:", error);
  }

  return { success: SAME_ANSWER };
}

export async function performPasswordResetAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = performResetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const { token, password } = parsed.data;

  /**
   * จำกัดจำนวนครั้งที่ยิง token เข้ามาด้วย
   *
   * token เดาไม่ได้ในทางปฏิบัติอยู่แล้ว (สุ่ม 256 บิต) แต่การจำกัดตรงนี้กันอีกเรื่อง:
   * ไม่ให้ใครใช้ endpoint นี้เป็นเครื่องกิน CPU ของเรา (แต่ละครั้งมีการแฮชรหัสผ่าน)
   */
  const ip = await getClientIp();
  const limit = rateLimit(`reset-perform:ip:${ip}`, 10, RESET_WINDOW_MS);
  if (!limit.allowed) {
    return { message: `ลองบ่อยเกินไป กรุณารออีก ${formatRetryAfter(limit.retryAfterSeconds)}` };
  }

  const check = await checkResetToken(token);

  if (!check.valid) {
    const reason = {
      invalid: "ลิงก์นี้ไม่ถูกต้อง",
      expired: "ลิงก์นี้หมดอายุแล้ว",
      used: "ลิงก์นี้ถูกใช้ไปแล้ว",
    }[check.reason];

    return { message: `${reason} กรุณาขอลิงก์ใหม่` };
  }

  // cost 12 เท่ากับตอนสมัครสมาชิก เพื่อให้ความแข็งแรงของแฮชเท่ากันทุกเส้นทาง
  const passwordHash = await hash(password, 12);

  const done = await consumeResetToken(check.resetId, check.userId, passwordHash);

  if (!done) {
    // ชนกับ request อื่นที่ใช้ token เดียวกันไปก่อนแล้วเสี้ยววินาที
    return { message: "ลิงก์นี้ถูกใช้ไปแล้ว กรุณาขอลิงก์ใหม่" };
  }

  return { success: "ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว เข้าสู่ระบบด้วยรหัสผ่านใหม่ได้เลย" };
}
