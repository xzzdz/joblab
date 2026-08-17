import type { Metadata } from "next";
import Link from "next/link";

import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { JobStatus, UserRole } from "@/generated/prisma/enums";
import { deleteJob, setJobStatus } from "@/lib/actions/job";
import { getApplicationCountsByJob } from "@/lib/applications";
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

  /**
   * นับใบสมัครด้วย groupBy ครั้งเดียวสำหรับทุกประกาศ แล้วค่อยแจกให้แต่ละแถว
   * ถ้าให้แต่ละแถวไปนับเอง จะเกิดปัญหา N+1 query — มี 50 ประกาศก็ยิง 51 query
   */
  const [company, jobs, applicationCounts] = await Promise.all([
    getMyCompany(user.id),
    getMyJobs(user.id),
    getApplicationCountsByJob(user.id),
  ]);

  if (!company) {
    return (
      <div className="border border-dashed border-line-strong bg-surface p-10 text-center">
        <p className="font-medium text-ink">ยังลงประกาศไม่ได้</p>
        <p className="mt-1 text-sm text-ink-muted">ต้องกรอกข้อมูลบริษัทให้เสร็จก่อน</p>
        <Link
          href="/employer"
          className="mt-6 inline-block bg-accent px-5 py-2.5 text-sm font-medium text-accent-on transition-colors hover:bg-accent-hover"
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
          <h1 className="text-2xl font-bold text-ink">ประกาศงาน</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {company.name} — ทั้งหมด {jobs.length} ประกาศ
          </p>
        </div>
        <Link
          href="/employer/jobs/new"
          className="shrink-0 bg-accent px-5 py-2.5 text-sm font-medium text-accent-on transition-colors hover:bg-accent-hover"
        >
          + ลงประกาศใหม่
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="border border-dashed border-line-strong bg-surface p-10 text-center">
          <p className="font-medium text-ink">ยังไม่มีประกาศงาน</p>
          <p className="mt-1 text-sm text-ink-muted">กด &ldquo;ลงประกาศใหม่&rdquo; เพื่อเริ่ม</p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {jobs.map((job) => (
            <JobRow key={job.id} job={job} applicationCount={applicationCounts.get(job.id) ?? 0} />
          ))}
        </ul>
      )}
    </div>
  );
}

function JobRow({
  job,
  applicationCount,
}: {
  job: MyJobListItem;
  applicationCount: number;
}) {
  return (
    <li className="border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-ink">{job.title}</h2>
            <StatusBadge status={job.status} />
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            {job.location} · {WORK_MODE_LABEL[job.workMode]} · {JOB_TYPE_LABEL[job.type]}
          </p>
          <p className="mt-1 text-sm text-ink">
            {formatSalaryRange(job.salaryMin, job.salaryMax)}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            แก้ไขล่าสุด {formatRelativeDate(job.updatedAt)}
            {job.status === JobStatus.PUBLISHED && ` · เผยแพร่ ${formatRelativeDate(job.publishedAt)}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/employer/jobs/${job.id}/applications`}
            className="border border-accent bg-accent-soft px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent-soft"
          >
            ผู้สมัคร {applicationCount}
          </Link>

          {/* ดูหน้าจริงได้เฉพาะประกาศที่เผยแพร่อยู่ เพราะหน้าสาธารณะกรอง PUBLISHED เท่านั้น */}
          {job.status === JobStatus.PUBLISHED && (
            <Link
              href={`/jobs/${job.slug}`}
              className="border border-line-strong px-3 py-1.5 text-sm text-ink hover:bg-surface-2"
            >
              ดูหน้าจริง
            </Link>
          )}

          <Link
            href={`/employer/jobs/${job.id}/edit`}
            className="border border-line-strong px-3 py-1.5 text-sm text-ink hover:bg-surface-2"
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
            className="bg-positive px-4 py-2 text-sm font-medium text-paper transition-colors hover:opacity-90"
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
            className="border border-line-strong px-3 py-1.5 text-sm text-ink hover:bg-surface-2"
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
            className="border border-line-strong px-3 py-1.5 text-sm text-ink hover:bg-surface-2"
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
            className="px-3 py-1.5 text-sm text-critical hover:bg-critical-soft"
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
    DRAFT: "bg-surface-2 text-ink-muted",
    PUBLISHED: "bg-positive-soft text-positive",
    CLOSED: "bg-warning-soft text-warning-ink",
  }[status];

  return (
    <span className={`shrink-0 px-2 py-0.5 text-xs font-medium ${style}`}>
      {JOB_STATUS_LABEL[status]}
    </span>
  );
}
