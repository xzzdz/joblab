import Link from "next/link";

/**
 * หน้า 404 กลางของเว็บ ใช้เมื่อเปิด URL ที่ไม่มีอยู่จริง
 * (หน้า /jobs/[slug] มี not-found.tsx ของตัวเองที่เจาะจงกว่า จะถูกใช้แทนอันนี้)
 *
 * Next.js ตอบ HTTP 404 ให้อัตโนมัติ — ไม่ใช่แค่เปลี่ยนหน้าตา
 * ซึ่งสำคัญ เพราะ search engine ใช้ status code ตัดสินว่าจะเก็บหน้านี้เข้า index ไหม
 */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg rounded-lg border border-slate-200 bg-white p-10 text-center">
      <p className="font-mono text-4xl font-bold text-slate-300">404</p>
      <h1 className="mt-4 text-xl font-bold text-slate-900">ไม่พบหน้าที่ต้องการ</h1>
      <p className="mt-2 text-sm text-slate-600">
        ลิงก์อาจเปลี่ยนไปแล้ว หรือพิมพ์ที่อยู่ไม่ถูกต้อง
      </p>
      <Link
        href="/jobs"
        className="mt-6 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        ไปหน้าตำแหน่งงาน
      </Link>
    </div>
  );
}
