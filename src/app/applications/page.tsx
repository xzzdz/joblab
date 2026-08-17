import type { Metadata } from "next";
import Link from "next/link";

import { WithdrawButton } from "@/components/applications/withdraw-button";
import { ApplicationStatus, JobStatus, UserRole } from "@/generated/prisma/enums";
import { getMyApplications } from "@/lib/applications";
import { requireRole } from "@/lib/dal";
import {
  APPLICATION_STATUS_LABEL,
  APPLICATION_STATUS_STYLE,
  formatFullDate,
  formatRelativeDate,
} from "@/lib/format";

export const metadata: Metadata = {
  title: "ใบสมัครของฉัน",
};

/** สถานะที่ยังถอนได้ — ต้องตรงกับเงื่อนไขใน withdrawApplicationAction */
const WITHDRAWABLE: ApplicationStatus[] = [
  ApplicationStatus.APPLIED,
  ApplicationStatus.SCREENING,
  ApplicationStatus.INTERVIEW,
  ApplicationStatus.OFFER,
];

export default async function MyApplicationsPage() {
  const seeker = await requireRole(UserRole.SEEKER);
  const applications = await getMyApplications(seeker.id);

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">ใบสมัครของฉัน</h1>
      <p className="mt-1 text-sm text-ink-muted">
        {applications.length > 0
          ? `ส่งไปแล้ว ${applications.length} ใบ`
          : "ยังไม่ได้ส่งใบสมัครไปที่ไหน"}
      </p>

      {applications.length === 0 ? (
        <div className="mt-6 border border-dashed border-line-strong bg-surface p-10 text-center">
          <p className="font-medium text-ink">ยังไม่มีใบสมัคร</p>
          <Link
            href="/jobs"
            className="mt-6 inline-block bg-accent px-5 py-2.5 text-sm font-medium text-accent-on transition-colors hover:bg-accent-hover"
          >
            หางานที่สนใจ
          </Link>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {applications.map((application) => (
            <li
              key={application.id}
              className="border border-line bg-surface p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/jobs/${application.job.slug}`}
                    className="font-semibold text-ink hover:text-accent"
                  >
                    {application.job.title}
                  </Link>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {application.job.company.name} · {application.job.location}
                  </p>
                </div>

                <span
                  className={`shrink-0 px-3 py-1 text-xs font-medium ${APPLICATION_STATUS_STYLE[application.status]}`}
                >
                  {APPLICATION_STATUS_LABEL[application.status]}
                </span>
              </div>

              {/* ถ้าประกาศถูกปิดรับไปแล้ว ต้องบอกผู้สมัครให้รู้ ไม่ใช่ปล่อยให้รอเก้อ */}
              {application.job.status !== JobStatus.PUBLISHED && (
                <p className="mt-3 bg-warning-soft px-3 py-2 text-xs text-warning-ink">
                  ประกาศนี้ถูกปิดรับสมัครแล้ว
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                <div className="text-xs text-ink-muted">
                  <span>ส่งเมื่อ {formatFullDate(application.createdAt)}</span>
                  <span className="mx-2">·</span>
                  <span>อัปเดตล่าสุด {formatRelativeDate(application.updatedAt)}</span>
                </div>

                <div className="flex items-center gap-4">
                  <a
                    href={`/api/resumes/${application.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent hover:underline"
                  >
                    {application.resumeName} ↗
                  </a>

                  {WITHDRAWABLE.includes(application.status) && (
                    <WithdrawButton applicationId={application.id} />
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
