import Link from "next/link";

/**
 * แสดงเมื่อมีการเรียก notFound() ใน page.tsx ของ segment นี้
 * Next.js จะตอบ HTTP 404 ให้อัตโนมัติด้วย (สำคัญ ไม่ใช่แค่เปลี่ยนหน้าตา)
 */
export default function JobNotFound() {
  return (
    <div className="border border-line bg-surface p-10 text-center">
      <h1 className="text-xl font-bold text-ink">ไม่พบประกาศงานนี้</h1>
      <p className="mt-2 text-sm text-ink-muted">
        ประกาศอาจถูกปิดรับไปแล้ว หรือลิงก์ที่ใช้ไม่ถูกต้อง
      </p>
      <Link
        href="/jobs"
        className="mt-6 inline-block bg-accent px-5 py-2.5 text-sm font-medium text-accent-on transition-colors hover:bg-accent-hover"
      >
        ดูตำแหน่งงานทั้งหมด
      </Link>
    </div>
  );
}
