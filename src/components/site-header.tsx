import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { UserRole } from "@/generated/prisma/enums";
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
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-ink transition-colors hover:text-accent"
        >
          Job<span className="text-accent">Lab</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <NavLink href="/jobs">ตำแหน่งงาน</NavLink>

          {user ? (
            <>
              {/* เมนูนี้โผล่เฉพาะบัญชีบริษัท — คนหางานไม่เห็นทางเข้าเลย
                  แต่การซ่อนเมนูไม่ใช่ความปลอดภัย ด่านจริงอยู่ที่ requireRole ใน layout ของ /employer */}
              {user.role === UserRole.EMPLOYER && (
                <NavLink href="/employer/jobs">จัดการประกาศ</NavLink>
              )}

              {user.role === UserRole.SEEKER && (
                <NavLink href="/applications">ใบสมัครของฉัน</NavLink>
              )}

              <NavLink href="/account">{user.name}</NavLink>

              <form action={logoutAction}>
                <button
                  type="submit"
                  className="h-11 cursor-pointer px-3 text-sm text-ink-muted transition-colors hover:text-accent"
                >
                  ออกจากระบบ
                </button>
              </form>
            </>
          ) : (
            <>
              <NavLink href="/login">เข้าสู่ระบบ</NavLink>
              <Link
                href="/register"
                className="flex h-11 items-center bg-ink px-4 text-sm font-medium text-paper transition-colors hover:bg-accent"
              >
                สมัครสมาชิก
              </Link>
            </>
          )}

          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

/**
 * ลิงก์ในแถบเมนู
 * ความสูง 44px ตามขนาดขั้นต่ำที่นิ้วกดได้แม่นบนมือถือ — ต่ำกว่านี้คนจะกดพลาดบ่อย
 */
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex h-11 items-center px-3 text-sm text-ink-muted transition-colors hover:text-accent"
    >
      {children}
    </Link>
  );
}
