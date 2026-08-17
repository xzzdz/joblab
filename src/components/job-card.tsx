import Link from "next/link";

import {
  JOB_TYPE_LABEL,
  WORK_MODE_LABEL,
  formatRelativeDate,
  formatSalaryRange,
} from "@/lib/format";
import type { JobListItem } from "@/lib/jobs";

/**
 * การ์ดแสดงงาน 1 รายการ
 *
 * เป็น Server Component (ไม่มี "use client") เพราะไม่มี state ไม่มี event handler
 * ผลคือโค้ดนี้ไม่ถูกส่งไปเป็น JavaScript ที่ฝั่ง browser เลย — หน้าเว็บเบาลง
 *
 * ดีไซน์ตามธีม Swiss Editorial:
 *   - ขอบบาง 1px ไม่มีเงา ไม่มีมุมโค้งมาก
 *   - ข้อมูลกำกับ (ประเภทงาน/วันที่) ใช้ฟอนต์ monospace แยกชั้นจากเนื้อหาชัดเจน
 *   - เส้นสีสัญญาณด้านซ้ายจะโผล่มาตอนชี้เมาส์ ทำให้รู้ว่ากดได้โดยไม่ต้องเพิ่มเงา
 */
export function JobCard({ job }: { job: JobListItem }) {
  return (
    <li className="group relative border border-line bg-surface transition-colors duration-200 hover:border-line-strong">
      {/*
        แถบสีด้านซ้ายเป็นแค่การตกแต่ง จึงซ่อนจาก screen reader
        และไม่ใช้เป็นตัวสื่อความหมายเพียงอย่างเดียว (ข้อมูลทุกอย่างเป็นข้อความอยู่แล้ว)
      */}
      <span
        aria-hidden="true"
        className="absolute top-0 bottom-0 left-0 w-[3px] scale-y-0 bg-accent transition-transform duration-200 group-hover:scale-y-100"
      />

      <Link href={`/jobs/${job.slug}`} className="block p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="label-mono text-accent">{JOB_TYPE_LABEL[job.type]}</span>
          <span aria-hidden="true" className="text-line-strong">
            ·
          </span>
          <span className="label-mono text-ink-muted">{WORK_MODE_LABEL[job.workMode]}</span>
          <span className="label-mono ml-auto text-ink-muted">
            {formatRelativeDate(job.publishedAt)}
          </span>
        </div>

        <h2 className="mt-3 text-lg font-semibold tracking-tight text-ink transition-colors group-hover:text-accent">
          {job.title}
        </h2>

        <p className="mt-1 text-sm text-ink-muted">
          {job.company.name} · {job.location}
        </p>

        <p className="mt-4 font-mono text-sm tabular-nums text-ink">
          {formatSalaryRange(job.salaryMin, job.salaryMax)}
        </p>
      </Link>
    </li>
  );
}
