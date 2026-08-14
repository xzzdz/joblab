import Link from "next/link";

import { buildJobsQuery, type JobFilters } from "@/lib/validation/job-filters";

/**
 * แถบเปลี่ยนหน้า
 *
 * ทุกปุ่มเป็น <Link> ธรรมดา ไม่ใช่ปุ่มที่ต้องรอ JavaScript
 * และลิงก์พาตัวกรองปัจจุบันติดไปด้วยเสมอ ไม่งั้นกดหน้า 2 แล้วตัวกรองหายหมด
 */
export function Pagination({
  filters,
  currentPage,
  totalPages,
  hasPrevious,
  hasNext,
}: {
  filters: JobFilters;
  currentPage: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="เปลี่ยนหน้า" className="mt-6 flex items-center justify-between gap-4">
      <PageLink
        href={`/jobs${buildJobsQuery(filters, { page: currentPage - 1 })}`}
        disabled={!hasPrevious}
      >
        ← ก่อนหน้า
      </PageLink>

      <p className="text-sm text-slate-600">
        หน้า {currentPage} จาก {totalPages}
      </p>

      <PageLink
        href={`/jobs${buildJobsQuery(filters, { page: currentPage + 1 })}`}
        disabled={!hasNext}
      >
        ถัดไป →
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  // ปุ่มที่กดไม่ได้ใช้ <span> ไม่ใช่ <a> ที่ปิดการทำงาน
  // เพราะ <a> ที่ไม่พาไปไหนยังถูก Tab เข้าถึงและ screen reader ยังอ่านว่าเป็นลิงก์ ทำให้สับสน
  if (disabled) {
    return (
      <span className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-300">
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
    >
      {children}
    </Link>
  );
}
