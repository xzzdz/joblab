import Link from "next/link";

/**
 * แสดงเมื่อมีการเรียก notFound() ใน page.tsx ของ segment นี้
 * Next.js จะตอบ HTTP 404 ให้อัตโนมัติด้วย (สำคัญ ไม่ใช่แค่เปลี่ยนหน้าตา)
 */
export default function JobNotFound() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-10 text-center">
      <h1 className="text-xl font-bold text-slate-900">ไม่พบประกาศงานนี้</h1>
      <p className="mt-2 text-sm text-slate-600">
        ประกาศอาจถูกปิดรับไปแล้ว หรือลิงก์ที่ใช้ไม่ถูกต้อง
      </p>
      <Link
        href="/jobs"
        className="mt-6 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        ดูตำแหน่งงานทั้งหมด
      </Link>
    </div>
  );
}
