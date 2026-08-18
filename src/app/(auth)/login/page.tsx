import type { Metadata } from "next";
import Link from "next/link";

import { GoogleButton } from "@/components/auth/google-button";
import { LoginForm } from "@/components/auth/login-form";
import { isGoogleEnabled } from "@/lib/auth";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ",
};

export default async function LoginPage(props: PageProps<"/login">) {
  const { callbackUrl } = await props.searchParams;

  return (
    <div className="border border-line bg-surface p-6">
      <h1 className="text-xl font-bold text-ink">เข้าสู่ระบบ</h1>
      <p className="mt-1 mb-6 text-sm text-ink-muted">
        ยังไม่มีบัญชี?{" "}
        <Link href="/register" className="text-accent hover:underline">
          สมัครสมาชิก
        </Link>
      </p>

      <LoginForm callbackUrl={typeof callbackUrl === "string" ? callbackUrl : undefined} />

      <p className="mt-3 text-sm">
        <Link
          href="/forgot-password"
          className="text-ink-muted transition-colors hover:text-accent"
        >
          ลืมรหัสผ่าน?
        </Link>
      </p>

      {/* ปุ่ม Google โผล่เฉพาะเมื่อตั้ง AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET แล้ว
          ไม่ตั้งก็ไม่มีปุ่มที่กดแล้วพัง */}
      {isGoogleEnabled && (
        <>
          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="label-mono text-ink-muted">หรือ</span>
            <span className="h-px flex-1 bg-line" />
          </div>
          <GoogleButton callbackUrl={typeof callbackUrl === "string" ? callbackUrl : undefined} />
        </>
      )}

      <div className="mt-6 bg-surface-2 p-3 text-xs text-ink-muted">
        <p className="font-medium text-ink">บัญชีทดสอบ</p>
        <p className="mt-1 font-mono">seeker@joblab.dev — ผู้สมัครงาน</p>
        <p className="font-mono">employer@joblab.dev — บริษัท</p>
        <p className="mt-1 font-mono">รหัสผ่าน: Password123!</p>
      </div>
    </div>
  );
}
