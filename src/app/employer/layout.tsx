import Link from "next/link";

import { UserRole } from "@/generated/prisma/enums";
import { requireRole } from "@/lib/dal";

/**
 * ด่านตรวจสิทธิ์ของทุกหน้าใต้ /employer
 *
 * วางไว้ที่ layout เพราะ layout ครอบทุกหน้าใน segment นี้และหน้าลูกทั้งหมด
 * เพิ่มหน้าใหม่ใต้ /employer วันหลังก็ได้ด่านนี้อัตโนมัติ ไม่ต้องจำว่าต้องไปเพิ่มอะไร
 *
 * ⚠️ แต่ layout ไม่ได้ครอบ Server Action
 * ผู้ใช้ยิง action ตรง ๆ ได้โดยไม่ผ่านหน้านี้เลย
 * เพราะฉะนั้นทุก action ใน src/lib/actions/job.ts ยังต้องเรียก requireRole เองอีกชั้น
 */
export default async function EmployerLayout({ children }: LayoutProps<"/employer">) {
  await requireRole(UserRole.EMPLOYER);

  return (
    <div>
      <nav className="mb-6 flex gap-1 border-b border-slate-200">
        <TabLink href="/employer">ข้อมูลบริษัท</TabLink>
        <TabLink href="/employer/jobs">ประกาศงาน</TabLink>
      </nav>
      {children}
    </div>
  );
}

function TabLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="-mb-px border-b-2 border-transparent px-4 py-2 text-sm text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
    >
      {children}
    </Link>
  );
}
