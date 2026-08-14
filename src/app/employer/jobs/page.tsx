import type { Metadata } from "next";
import Link from "next/link";

import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { JobStatus, UserRole } from "@/generated/prisma/enums";
import { deleteJob, setJobStatus } from "@/lib/actions/job";
import { requireRole } from "@/lib/dal";
import { getMyCompany, getMyJobs, type MyJobListItem } from "@/lib/employer";
import {
  JOB_STATUS_LABEL,
  JOB_TYPE_LABEL,
  WORK_MODE_LABEL,
  formatRelativeDate,
  formatSalaryRange,
} from "@/lib/format";

export const metadata: Metadata = {
  title: "จัดการประกาศงาน",
};

export default async function EmployerJobsPage() {
  const user = await requireRole(UserRole.EMPLOYER);
  const [company, jobs] = await Promise.all([getMyCompany(user.id), getMyJobs(user.id)]);

  if (!company) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="font-medium text-slate-900">ยังลงประกาศไม่ได้</p>
        <p className="mt-1 text-sm text-slate-600">ต้องกรอกข้อมูลบริษัทให้เสร็จก่อน</p>
        <Link
          href="/employer"
          className="mt-6 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          ไปกรอกข้อมูลบริษัท
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ประกาศงาน</h1>
          <p className="mt-1 text-sm text-slate-600">
            {company.name} — ทั้งหมด {jobs.length} ประกาศ
          </p>
        </div>
        <Link
          href="/employer/jobs/new"
          className="shrink-0 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + ลงประกาศใหม่
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="font-medium text-slate-900">ยังไม่มีประกาศงาน</p>
          <p className="mt-1 text-sm text-slate-600">กด &ldquo;ลงประกาศใหม่&rdquo; เพื่อเริ่ม</p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {jobs.map((job) => (
            <JobRow key={job.id} job={job} />
          ))}
        </ul>
      )}
    </div>
  );
}

function JobRow({ job }: { job: MyJobListItem }) {
  return (
    <li className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-slate-900">{job.title}</h2>
            <StatusBadge status={job.status} />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {job.location} · {WORK_MODE_LABEL[job.workMode]} · {JOB_TYPE_LABEL[job.type]}
          </p>
          <p className="mt-1 text-sm text-slate-700">
            {formatSalaryRange(job.salaryMin, job.salaryMax)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            แก้ไขล่าสุด {formatRelativeDate(job.updatedAt)}
            {job.status === JobStatus.PUBLISHED && ` · เผยแพร่ ${formatRelativeDate(job.publishedAt)}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* ดูหน้าจริงได้เฉพาะประกาศที่เผยแพร่อยู่ เพราะหน้าสาธารณะกรอง PUBLISHED เท่านั้น */}
          {job.status === JobStatus.PUBLISHED && (
            <Link
              href={`/jobs/${job.slug}`}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              ดูหน้าจริง
            </Link>
          )}

          <Link
            href={`/employer/jobs/${job.id}/edit`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            แก้ไข
          </Link>

          <StatusActions job={job} />
        </div>
      </div>
    </li>
  );
}

/**
 * ปุ่มเปลี่ยนสถานะและลบ
 *
 * ใช้ <form action={serverAction}> ตรง ๆ ไม่ต้องมี Client Component
 * ข้อดี: ปุ่มทำงานได้แม้ JavaScript ยังโหลดไม่เสร็จหรือโหลดไม่สำเร็จ
 *
 * ปุ่มที่แสดงตรงกับ state machine ใน setJobStatus:
 *   ฉบับร่าง   → เผยแพร่ได้
 *   เผยแพร่อยู่ → ปิดรับได้ (ลบไม่ได้)
 *   ปิดรับแล้ว → เปิดรับใหม่ได้
 */
function StatusActions({ job }: { job: MyJobListItem }) {
  return (
    <>
      {job.status === JobStatus.DRAFT && (
        <form action={setJobStatus}>
          <input type="hidden" name="jobId" value={job.id} />
          <input type="hidden" name="status" value={JobStatus.PUBLISHED} />
          <button
            type="submit"
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            เผยแพร่
          </button>
        </form>
      )}

      {job.status === JobStatus.PUBLISHED && (
        <form action={setJobStatus}>
          <input type="hidden" name="jobId" value={job.id} />
          <input type="hidden" name="status" value={JobStatus.CLOSED} />
          <ConfirmSubmitButton
            message={`ปิดรับสมัคร "${job.title}" ใช่ไหม? ประกาศจะหายจากหน้าค้นหางานทันที`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            ปิดรับ
          </ConfirmSubmitButton>
        </form>
      )}

      {job.status === JobStatus.CLOSED && (
        <form action={setJobStatus}>
          <input type="hidden" name="jobId" value={job.id} />
          <input type="hidden" name="status" value={JobStatus.PUBLISHED} />
          <button
            type="submit"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            เปิดรับใหม่
          </button>
        </form>
      )}

      {job.status !== JobStatus.PUBLISHED && (
        <form action={deleteJob}>
          <input type="hidden" name="jobId" value={job.id} />
          <ConfirmSubmitButton
            message={`ลบ "${job.title}" ถาวรใช่ไหม? กู้คืนไม่ได้`}
            className="rounded-md px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            ลบ
          </ConfirmSubmitButton>
        </form>
      )}
    </>
  );
}

function StatusBadge({ status }: { status: JobStatus }) {
  const style = {
    DRAFT: "bg-slate-100 text-slate-600",
    PUBLISHED: "bg-emerald-100 text-emerald-700",
    CLOSED: "bg-amber-100 text-amber-700",
  }[status];

  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>
      {JOB_STATUS_LABEL[status]}
    </span>
  );
}
