import type { Metadata } from "next";
import Link from "next/link";

import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "สมัครสมาชิก",
};

export default function RegisterPage() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h1 className="text-xl font-bold text-slate-900">สมัครสมาชิก</h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">
        มีบัญชีอยู่แล้ว?{" "}
        <Link href="/login" className="text-indigo-600 hover:underline">
          เข้าสู่ระบบ
        </Link>
      </p>

      <RegisterForm />
    </div>
  );
}
