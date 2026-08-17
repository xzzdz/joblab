import type { Metadata } from "next";
import Link from "next/link";

import { RegisterForm } from "@/components/auth/register-form";

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

      <RegisterForm />
    </div>
  );
}
