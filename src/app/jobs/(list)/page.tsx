import type { Metadata } from "next";
import Link from "next/link";

import { JobCard } from "@/components/job-card";
import { JobFiltersForm } from "@/components/job-filters";
import { Pagination } from "@/components/pagination";
import { getPublishedJobLocations, searchPublishedJobs } from "@/lib/jobs";
import { hasActiveFilters, parseJobFilters } from "@/lib/validation/job-filters";

export const metadata: Metadata = {
  title: "ตำแหน่งงานทั้งหมด",
};

/**
 * หน้ารายการงาน + ค้นหา + กรอง + แบ่งหน้า
 *
 * เดิมหน้านี้เคยมี `export const revalidate = 60` เพื่อทำ ISR
 * ตอนนี้เอาออกแล้ว เพราะหน้านี้อ่าน `searchParams` ซึ่งเป็นข้อมูลที่ต่างกันทุก request
 * (แต่ละคนกรองไม่เหมือนกัน) จึงเก็บ HTML ชุดเดียวไว้ใช้ซ้ำไม่ได้อยู่แล้ว
 * — เก็บบรรทัดที่ไม่มีผลไว้มีแต่จะทำให้คนอ่านโค้ดเข้าใจผิด
 *
 * ถ้าอยากได้ความเร็วแบบ static คืน ต้องแคชที่ระดับ query ไม่ใช่ระดับหน้า (อยู่ใน Backlog)
 */
export default async function JobsPage(props: PageProps<"/jobs">) {
  const searchParams = await props.searchParams;
  const filters = parseJobFilters(searchParams);

  const [result, locations] = await Promise.all([
    searchPublishedJobs(filters),
    getPublishedJobLocations(),
  ]);

  return (
    <div>
      <div className="mb-6 border-b border-line pb-6">
        <p className="label-mono text-accent">ค้นหางาน</p>
        <h1
          className="mt-3 font-bold tracking-tight"
          style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", lineHeight: 1.1 }}
        >
          ตำแหน่งงานทั้งหมด
        </h1>
        <p className="mt-2 font-mono text-sm tabular-nums text-ink-muted">
          {result.total > 0
            ? `พบ ${result.total.toLocaleString("th-TH")} ตำแหน่งที่ตรงกับเงื่อนไข`
            : "ไม่พบตำแหน่งที่ตรงกับเงื่อนไข"}
        </p>
      </div>

      <div className="mb-6">
        <JobFiltersForm filters={filters} locations={locations} />
      </div>

      {result.jobs.length === 0 ? (
        <EmptyState filtered={hasActiveFilters(filters)} />
      ) : (
        <>
          <ul className="grid gap-4">
            {result.jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </ul>

          <Pagination
            filters={filters}
            currentPage={result.currentPage}
            totalPages={result.totalPages}
            hasPrevious={result.hasPrevious}
            hasNext={result.hasNext}
          />
        </>
      )}
    </div>
  );
}

/**
 * สถานะ "ไม่มีข้อมูล" มี 2 แบบที่ต้องแยกกัน
 *   - กรองแล้วไม่เจอ → บอกให้ลองผ่อนเงื่อนไข
 *   - ไม่มีข้อมูลเลยตั้งแต่แรก → บอกวิธีใส่ข้อมูลตัวอย่าง
 * ถ้าใช้ข้อความเดียวกันทั้งสองกรณี ผู้ใช้จะไม่รู้ว่าควรทำอะไรต่อ
 */
function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="border border-dashed border-line-strong bg-surface p-10 text-center">
      {filtered ? (
        <>
          <p className="font-medium text-ink">ไม่พบตำแหน่งที่ตรงกับเงื่อนไข</p>
          <p className="mt-1 text-sm text-ink-muted">ลองลดเงื่อนไขลง หรือล้างตัวกรองทั้งหมด</p>
          <Link
            href="/jobs"
            className="mt-6 inline-block bg-accent px-5 py-2.5 text-sm font-medium text-accent-on transition-colors hover:bg-accent-hover"
          >
            ล้างตัวกรอง
          </Link>
        </>
      ) : (
        <>
          <p className="font-medium text-ink">ยังไม่มีประกาศงาน</p>
          <p className="mt-1 text-sm text-ink-muted">
            ถ้ากำลังรันบนเครื่องตัวเอง ลองรัน <code className="font-mono">npm run db:seed</code>{" "}
            เพื่อใส่ข้อมูลตัวอย่าง
          </p>
        </>
      )}
    </div>
  );
}
