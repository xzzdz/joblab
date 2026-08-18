import type { Metadata } from "next";
import Link from "next/link";

import { RequestResetForm } from "@/components/auth/request-reset-form";
import { isEmailConfigured } from "@/lib/email";

export const metadata: Metadata = {
  title: "ลืมรหัสผ่าน",
};

export default function ForgotPasswordPage() {
  return (
    <div className="border border-line bg-surface p-6">
      <p className="label-mono text-accent">กู้คืนบัญชี</p>
      <h1 className="display-th mt-2 text-2xl font-bold">ลืมรหัสผ่าน</h1>
      <p className="mt-2 mb-6 text-sm text-ink-muted">
        กรอกอีเมลที่ใช้สมัคร เราจะส่งลิงก์ตั้งรหัสผ่านใหม่ไปให้
      </p>

      <RequestResetForm />

      {/*
        แจ้งให้คนที่รันบนเครื่องตัวเองรู้ว่าอีเมลจะไปโผล่ที่ไหน
        แสดงเฉพาะตอนที่ยังไม่ได้ตั้งค่าบริการอีเมล — ไม่โผล่บน production
      */}
      {!isEmailConfigured && (
        <p className="mt-6 border border-line bg-surface-2 px-3 py-2 text-xs text-ink-muted">
          โหมดพัฒนา: ยังไม่ได้ตั้ง <code className="font-mono">RESEND_API_KEY</code>{" "}
          ลิงก์จะถูกพิมพ์ออกที่ terminal ที่รัน <code className="font-mono">npm run dev</code>{" "}
          แทนการส่งอีเมลจริง
        </p>
      )}

      <p className="mt-6 text-sm text-ink-muted">
        <Link href="/login" className="text-accent transition-colors hover:text-accent-hover">
          ← กลับไปหน้าเข้าสู่ระบบ
        </Link>
      </p>
    </div>
  );
}
