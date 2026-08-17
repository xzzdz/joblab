import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { JobForm } from "@/components/employer/job-form";
import { UserRole } from "@/generated/prisma/enums";
import { createJob } from "@/lib/actions/job";
import { requireRole } from "@/lib/dal";
import { getMyCompany } from "@/lib/employer";

export const metadata: Metadata = {
  title: "ลงประกาศงานใหม่",
};

export default async function NewJobPage() {
  const user = await requireRole(UserRole.EMPLOYER);

  // ยังไม่มีข้อมูลบริษัท → ลงประกาศไม่ได้ ส่งไปกรอกก่อน
  // (action ก็เช็คซ้ำอีกชั้น เผื่อมีคนยิงตรงไม่ผ่านหน้านี้)
  const company = await getMyCompany(user.id);
  if (!company) redirect("/employer");

  return (
    <div className="max-w-2xl">
      <Link href="/employer/jobs" className="text-sm text-accent hover:underline">
        ← กลับไปหน้าประกาศงาน
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-ink">ลงประกาศงานใหม่</h1>
      <p className="mt-1 text-sm text-ink-muted">ลงในชื่อ {company.name}</p>

      <div className="mt-6 border border-line bg-surface p-6">
        <JobForm action={createJob} submitLabel="สร้างประกาศ" />
      </div>
    </div>
  );
}
