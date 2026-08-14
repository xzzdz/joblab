import Link from "next/link";

import { JOB_TYPE_LABEL, WORK_MODE_LABEL, formatRelativeDate, formatSalaryRange } from "@/lib/format";
import type { JobListItem } from "@/lib/jobs";

/**
 * การ์ดแสดงงาน 1 รายการ
 *
 * เป็น Server Component (ไม่มี "use client") เพราะไม่มี state ไม่มี event handler
 * ผลคือโค้ดนี้ไม่ถูกส่งไปเป็น JavaScript ที่ฝั่ง browser เลย — หน้าเว็บเบาลง
 */
export function JobCard({ job }: { job: JobListItem }) {
  return (
    <li className="rounded-lg border border-slate-200 bg-white transition-shadow hover:shadow-md">
      <Link href={`/jobs/${job.slug}`} className="block p-5">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-semibold text-slate-900">{job.title}</h2>
          <span className="shrink-0 text-xs text-slate-400">
            {formatRelativeDate(job.publishedAt)}
          </span>
        </div>

        <p className="mt-1 text-sm text-slate-600">{job.company.name}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          <Badge>{job.location}</Badge>
          <Badge>{WORK_MODE_LABEL[job.workMode]}</Badge>
          <Badge>{JOB_TYPE_LABEL[job.type]}</Badge>
        </div>

        <p className="mt-3 text-sm font-medium text-slate-700">
          {formatSalaryRange(job.salaryMin, job.salaryMax)}
        </p>
      </Link>
    </li>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">{children}</span>
  );
}
