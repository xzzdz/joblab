import type { Metadata } from "next";
import Link from "next/link";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { checkResetToken } from "@/lib/password-reset";

export const metadata: Metadata = {
  title: "ตั้งรหัสผ่านใหม่",
  // ห้าม search engine เก็บหน้านี้ — URL มี token ที่เท่ากับกุญแจบัญชีอยู่ข้างใน
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage(props: PageProps<"/reset-password">) {
  const { token } = await props.searchParams;
  const tokenValue = typeof token === "string" ? token : "";

  /**
   * ตรวจ token ตั้งแต่ตอนแสดงหน้า ไม่ใช่รอตอนกดส่ง
   *
   * ถ้าลิงก์หมดอายุแล้ว บอกทันทีดีกว่าปล่อยให้กรอกรหัสผ่านใหม่สองช่องเสร็จ
   * แล้วค่อยบอกว่าใช้ไม่ได้ — เสียเวลาเปล่าและน่ารำคาญ
   *
   * ⚠️ การตรวจตรงนี้เป็นเรื่อง UX ไม่ใช่ความปลอดภัย
   * ฝั่ง action ตรวจซ้ำเองอยู่แล้ว เพราะระหว่างที่ผู้ใช้กรอกฟอร์ม token อาจหมดอายุ
   * หรือถูกใช้ไปจากอีกอุปกรณ์
   */
  const check = tokenValue ? await checkResetToken(tokenValue) : ({ valid: false, reason: "invalid" } as const);

  if (!check.valid) {
    const message = {
      invalid: "ลิงก์นี้ไม่ถูกต้อง",
      expired: "ลิงก์นี้หมดอายุแล้ว",
      used: "ลิงก์นี้ถูกใช้ไปแล้ว",
    }[check.reason];

    return (
      <div className="border border-line bg-surface p-6 text-center">
        <p className="label-mono text-ink-muted">ตั้งรหัสผ่านใหม่</p>
        <h1 className="display-th mt-2 text-xl font-bold">{message}</h1>
        <p className="mt-2 text-sm text-ink-muted">
          ลิงก์ตั้งรหัสผ่านใหม่ใช้ได้ 1 ชั่วโมง และใช้ได้ครั้งเดียวเท่านั้น
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-flex h-11 items-center bg-accent px-5 text-sm font-medium text-accent-on transition-colors hover:bg-accent-hover"
        >
          ขอลิงก์ใหม่
        </Link>
      </div>
    );
  }

  return (
    <div className="border border-line bg-surface p-6">
      <p className="label-mono text-accent">กู้คืนบัญชี</p>
      <h1 className="display-th mt-2 text-2xl font-bold">ตั้งรหัสผ่านใหม่</h1>
      <p className="mt-2 mb-6 text-sm text-ink-muted">
        ตั้งรหัสผ่านใหม่อย่างน้อย 8 ตัวอักษร
      </p>

      <ResetPasswordForm token={tokenValue} />
    </div>
  );
}
