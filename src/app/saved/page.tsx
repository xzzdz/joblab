import type { Metadata } from "next";
import Link from "next/link";

import { JobCard } from "@/components/job-card";
import { UserRole } from "@/generated/prisma/enums";
import { requireRole } from "@/lib/dal";
import { getSavedJobs } from "@/lib/saved-jobs";

export const metadata: Metadata = {
  title: "งานที่บันทึกไว้",
};

export default async function SavedJobsPage() {
  const user = await requireRole(UserRole.SEEKER);
  const saved = await getSavedJobs(user.id);

  const openCount = saved.filter((item) => item.isOpen).length;
  const closedCount = saved.length - openCount;

  return (
    <div>
      <div className="mb-6 border-b border-line pb-6">
        <p className="label-mono text-accent">รายการของฉัน</p>
        <h1
          className="display-th mt-3 font-bold"
          style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)" }}
        >
          งานที่บันทึกไว้
        </h1>
        <p className="mt-2 num text-sm text-ink-muted">
          {saved.length === 0
            ? "ยังไม่ได้บันทึกงานไว้"
            : `${saved.length} รายการ · เปิดรับอยู่ ${openCount}${closedCount > 0 ? ` · ปิดรับแล้ว ${closedCount}` : ""}`}
        </p>
      </div>

      {saved.length === 0 ? (
        <div className="border border-dashed border-line-strong p-10 text-center">
          <p className="font-medium text-ink">ยังไม่มีงานที่บันทึกไว้</p>
          <p className="mt-1 text-sm text-ink-muted">
            กดไอคอนรูปที่คั่นหนังสือบนการ์ดงาน เพื่อเก็บไว้ดูภายหลัง
          </p>
          <Link
            href="/jobs"
            className="mt-6 inline-flex h-11 items-center bg-accent px-5 text-sm font-medium text-accent-on transition-colors hover:bg-accent-hover"
          >
            หางานที่สนใจ
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3">
          {saved.map((item) => (
            <div key={item.savedId}>
              {/*
                ประกาศที่ปิดรับไปแล้วยังแสดงอยู่ ไม่ถูกกรองออกเงียบ ๆ
                เพราะผู้ใช้กดบันทึกไว้เอง ถ้าหายไปโดยไม่บอกจะสงสัยว่าของหายไปไหน
                — บอกตรง ๆ แล้วให้เขาเอาออกเองดีกว่า
              */}
              {!item.isOpen && (
                <p className="mb-1 bg-warning-soft px-3 py-1.5 text-xs text-warning-ink">
                  ประกาศนี้ปิดรับสมัครแล้ว
                </p>
              )}
              <JobCard job={item.job} savedState />
            </div>
          ))}
        </ul>
      )}
    </div>
  );
}
