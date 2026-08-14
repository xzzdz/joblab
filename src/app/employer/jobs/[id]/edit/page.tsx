import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JobForm } from "@/components/employer/job-form";
import { UserRole } from "@/generated/prisma/enums";
import { updateJob } from "@/lib/actions/job";
import { requireRole } from "@/lib/dal";
import { getMyJob } from "@/lib/employer";
import { JOB_STATUS_LABEL } from "@/lib/format";

export const metadata: Metadata = {
  title: "แก้ไขประกาศงาน",
};

export default async function EditJobPage(props: PageProps<"/employer/jobs/[id]/edit">) {
  const user = await requireRole(UserRole.EMPLOYER);
  const { id } = await props.params;

  /**
   * getMyJob ใส่เงื่อนไข `company.ownerId = user.id` ไว้ใน where แล้ว
   *
   * ผลคือถ้าเอา id ของประกาศบริษัทอื่นมาใส่ใน URL จะได้ผลลัพธ์ null
   * แล้วตกลงมาที่ notFound() → ตอบ 404 เหมือนไม่มีประกาศนั้นอยู่จริง
   * เราไม่ตอบ 403 เพราะการบอกว่า "มีอยู่แต่คุณไม่มีสิทธิ์" คือการยืนยันว่า id นี้มีจริง
   */
  const job = await getMyJob(user.id, id);
  if (!job) notFound();

  return (
    <div className="max-w-2xl">
      <Link href="/employer/jobs" className="text-sm text-indigo-600 hover:underline">
        ← กลับไปหน้าประกาศงาน
      </Link>

      <div className="mt-4 flex items-center gap-2">
        <h1 className="text-2xl font-bold text-slate-900">แก้ไขประกาศงาน</h1>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          {JOB_STATUS_LABEL[job.status]}
        </span>
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
        <JobForm job={job} action={updateJob} submitLabel="บันทึกการแก้ไข" />
      </div>
    </div>
  );
}
