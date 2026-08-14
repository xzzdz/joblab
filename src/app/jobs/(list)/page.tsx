import type { Metadata } from "next";

import { JobCard } from "@/components/job-card";
import { getPublishedJobs } from "@/lib/jobs";

export const metadata: Metadata = {
  title: "ตำแหน่งงานทั้งหมด",
};

/**
 * ISR: สร้างหน้าเป็น static แล้วสร้างใหม่อัตโนมัติเมื่อผ่านไป 60 วินาที
 *
 * ถ้าไม่ใส่บรรทัดนี้ Next จะ prerender หน้านี้ตอน build แล้ว "แช่" ข้อมูลชุดนั้นไว้ตลอด
 * (ลองสังเกตผลลัพธ์ `npm run build` — จะเห็น /jobs เป็น ○ Static)
 * ผลคือ deploy ไปแล้วบริษัทลงประกาศใหม่ ผู้ใช้จะไม่เห็นจนกว่าจะ build ใหม่
 *
 * เร็วเท่า static แต่ข้อมูลไม่ค้างเกิน 60 วินาที — เหมาะกับหน้าลิสต์แบบนี้
 */
export const revalidate = 60;

/**
 * หน้ารายการงาน
 *
 * async component ตัวนี้รันบน server เท่านั้น จึงเรียก Prisma ได้ตรง ๆ
 * ไม่ต้องมี API route, ไม่ต้อง useEffect, ไม่ต้องจัดการ loading state เอง
 * และ connection string ก็ไม่มีทางหลุดไปฝั่ง browser
 */
export default async function JobsPage() {
  const jobs = await getPublishedJobs();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">ตำแหน่งงานทั้งหมด</h1>
        <p className="mt-1 text-sm text-slate-600">
          พบ {jobs.length} ตำแหน่งที่กำลังเปิดรับ
        </p>
      </div>

      {jobs.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="grid gap-4">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** อย่าลืมออกแบบหน้าตอน "ไม่มีข้อมูล" ด้วย — เป็นสถานะที่ผู้ใช้เจอจริงและมักถูกลืม */
function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
      <p className="font-medium text-slate-900">ยังไม่มีประกาศงาน</p>
      <p className="mt-1 text-sm text-slate-600">
        ถ้ากำลังรันบนเครื่องตัวเอง ลองรัน <code className="font-mono">npm run db:seed</code>{" "}
        เพื่อใส่ข้อมูลตัวอย่าง
      </p>
    </div>
  );
}
