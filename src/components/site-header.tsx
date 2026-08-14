import Link from "next/link";

import { logoutAction } from "@/lib/actions/auth";
import { getCurrentUser } from "@/lib/dal";

/**
 * แถบบนสุดของเว็บ — แสดงต่างกันตามว่าล็อกอินอยู่หรือไม่
 *
 * เป็น async Server Component จึงอ่านผู้ใช้ปัจจุบันได้เลย
 * ปุ่มออกจากระบบใช้ <form> + Server Action ไม่ต้องมี Client Component
 * ผลคือปุ่มนี้ยังกดได้แม้ JavaScript จะยังโหลดไม่เสร็จ
 */
export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/jobs" className="text-lg font-bold tracking-tight text-slate-900">
          Job<span className="text-indigo-600">Lab</span>
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/jobs" className="text-slate-600 hover:text-indigo-600">
            ตำแหน่งงาน
          </Link>

          {user ? (
            <>
              <Link href="/account" className="text-slate-600 hover:text-indigo-600">
                {user.name}
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                >
                  ออกจากระบบ
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-slate-600 hover:text-indigo-600">
                เข้าสู่ระบบ
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-700"
              >
                สมัครสมาชิก
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
