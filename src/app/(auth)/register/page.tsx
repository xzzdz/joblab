import type { Metadata } from "next";
import Link from "next/link";

import { GoogleButton } from "@/components/auth/google-button";
import { RegisterForm } from "@/components/auth/register-form";
import { isGoogleEnabled } from "@/lib/auth";

export const metadata: Metadata = {
  title: "สมัครสมาชิก",
};

export default function RegisterPage() {
  return (
    <div className="border border-line bg-surface p-6">
      <h1 className="text-xl font-bold text-ink">สมัครสมาชิก</h1>
      <p className="mt-1 mb-6 text-sm text-ink-muted">
        มีบัญชีอยู่แล้ว?{" "}
        <Link href="/login" className="text-accent hover:underline">
          เข้าสู่ระบบ
        </Link>
      </p>

      {isGoogleEnabled && (
        <>
          <GoogleButton />
          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="label-mono text-ink-muted">หรือสมัครด้วยอีเมล</span>
            <span className="h-px flex-1 bg-line" />
          </div>
        </>
      )}

      <RegisterForm />
    </div>
  );
}
