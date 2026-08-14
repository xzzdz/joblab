import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ",
};

export default async function LoginPage(props: PageProps<"/login">) {
  const { callbackUrl } = await props.searchParams;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h1 className="text-xl font-bold text-slate-900">เข้าสู่ระบบ</h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">
        ยังไม่มีบัญชี?{" "}
        <Link href="/register" className="text-indigo-600 hover:underline">
          สมัครสมาชิก
        </Link>
      </p>

      <LoginForm callbackUrl={typeof callbackUrl === "string" ? callbackUrl : undefined} />

      <div className="mt-6 rounded-md bg-slate-50 p-3 text-xs text-slate-600">
        <p className="font-medium text-slate-700">บัญชีทดสอบ</p>
        <p className="mt-1 font-mono">seeker@joblab.dev — ผู้สมัครงาน</p>
        <p className="font-mono">employer@joblab.dev — บริษัท</p>
        <p className="mt-1 font-mono">รหัสผ่าน: Password123!</p>
      </div>
    </div>
  );
}
