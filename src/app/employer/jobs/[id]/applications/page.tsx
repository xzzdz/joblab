import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ApplicationBoard } from "@/components/applications/application-board";
import { UserRole } from "@/generated/prisma/enums";
import { getApplicationCountsForJob, getApplicationsForJob } from "@/lib/applications";
import { requireRole } from "@/lib/dal";
import { getMyJob } from "@/lib/employer";
import { JOB_STATUS_LABEL } from "@/lib/format";

export const metadata: Metadata = {
  title: "ผู้สมัคร",
};

export default async function JobApplicationsPage(
  props: PageProps<"/employer/jobs/[id]/applications">
) {
  const owner = await requireRole(UserRole.EMPLOYER);
  const { id } = await props.params;

  /**
   * ดึงงานพร้อมเช็คความเป็นเจ้าของในคราวเดียว
   * ถ้าบริษัทอื่นเดา id ถูก getMyJob จะคืน null → ตอบ 404 เหมือนไม่มีงานนี้อยู่
   * ไม่ตอบ 403 เพราะนั่นเท่ากับยืนยันว่างาน id นี้มีจริง
   */
  const job = await getMyJob(owner.id, id);
  if (!job) notFound();

  const [applications, counts] = await Promise.all([
    getApplicationsForJob(owner.id, id),
    getApplicationCountsForJob(owner.id, id),
  ]);

  const activeTotal =
    counts.APPLIED + counts.SCREENING + counts.INTERVIEW + counts.OFFER;

  return (
    <div>
      <Link href="/employer/jobs" className="text-sm text-accent hover:underline">
        ← กลับไปหน้าจัดการประกาศ
      </Link>

      <div className="mt-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-ink">{job.title}</h1>
          <span className="bg-surface-2 px-3 py-1 text-xs text-ink-muted">
            {JOB_STATUS_LABEL[job.status]}
          </span>
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          ผู้สมัครทั้งหมด {applications.length} คน · อยู่ระหว่างพิจารณา {activeTotal} คน ·
          ไม่ผ่าน {counts.REJECTED} คน · ถอนเอง {counts.WITHDRAWN} คน
        </p>
      </div>

      {applications.length === 0 ? (
        <div className="border border-dashed border-line-strong bg-surface p-10 text-center">
          <p className="font-medium text-ink">ยังไม่มีใครสมัครงานนี้</p>
          <p className="mt-1 text-sm text-ink-muted">
            {job.status === "PUBLISHED"
              ? "ประกาศเผยแพร่อยู่แล้ว รอผู้สมัครเข้ามา"
              : "ประกาศนี้ยังไม่ถูกเผยแพร่ ผู้สมัครจึงยังมองไม่เห็น"}
          </p>
        </div>
      ) : (
        <ApplicationBoard applications={applications} />
      )}
    </div>
  );
}
