import Link from "next/link";

import { ApplyForm } from "@/components/applications/apply-form";
import { UserRole } from "@/generated/prisma/enums";
import { getMyApplicationForJob } from "@/lib/applications";
import { getCurrentUser } from "@/lib/dal";
import { APPLICATION_STATUS_LABEL, APPLICATION_STATUS_STYLE, formatFullDate } from "@/lib/format";

/**
 * กล่องสมัครงานท้ายหน้ารายละเอียด — แสดงต่างกัน 4 แบบตามสถานะของคนดู
 *
 * เป็น Server Component จึงถามฐานข้อมูลได้เลยว่าคนนี้สมัครไปหรือยัง
 * ถ้าทำเป็น Client Component จะต้องมี API + loading state + จัดการ error เพิ่มอีกชุด
 * เพื่อให้ได้ผลลัพธ์เดียวกัน
 */
export async function ApplySection({ jobId }: { jobId: string }) {
  const user = await getCurrentUser();

  // 1) ยังไม่ล็อกอิน — ชวนล็อกอินและจำหน้านี้ไว้พากลับมา
  if (!user) {
    return (
      <Box>
        <p className="text-sm text-slate-600">เข้าสู่ระบบเพื่อสมัครงานนี้</p>
        <Link
          href="/login"
          className="mt-3 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          เข้าสู่ระบบ
        </Link>
        <p className="mt-2 text-xs text-slate-500">
          ยังไม่มีบัญชี?{" "}
          <Link href="/register" className="text-indigo-600 hover:underline">
            สมัครสมาชิก
          </Link>
        </p>
      </Box>
    );
  }

  // 2) เป็นบัญชีบริษัท — ไม่มีฟอร์มให้
  if (user.role === UserRole.EMPLOYER) {
    return (
      <Box>
        <p className="text-sm text-slate-600">
          บัญชีบริษัทสมัครงานไม่ได้ — ต้องใช้บัญชีผู้สมัครงาน
        </p>
      </Box>
    );
  }

  const existing = await getMyApplicationForJob(user.id, jobId);

  // 3) สมัครไปแล้ว — โชว์สถานะแทนฟอร์ม
  if (existing) {
    return (
      <Box>
        <p className="text-sm text-slate-600">คุณสมัครงานนี้ไปแล้ว</p>
        <div className="mt-3 flex items-center justify-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${APPLICATION_STATUS_STYLE[existing.status]}`}
          >
            {APPLICATION_STATUS_LABEL[existing.status]}
          </span>
          <span className="text-xs text-slate-500">
            ส่งเมื่อ {formatFullDate(existing.createdAt)}
          </span>
        </div>
        <Link
          href="/applications"
          className="mt-4 inline-block text-sm text-indigo-600 hover:underline"
        >
          ดูใบสมัครทั้งหมดของฉัน
        </Link>
      </Box>
    );
  }

  // 4) ผู้สมัครงานที่ยังไม่เคยสมัคร — โชว์ฟอร์มจริง
  return <ApplyForm jobId={jobId} />;
}

function Box({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 text-center">{children}</div>
  );
}
