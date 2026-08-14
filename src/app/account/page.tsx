import type { Metadata } from "next";

import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "บัญชีของฉัน",
};

const ROLE_LABEL: Record<UserRole, string> = {
  SEEKER: "ผู้สมัครงาน",
  EMPLOYER: "บริษัท",
};

export default async function AccountPage() {
  // ด่านจริงอยู่ตรงนี้ ไม่ใช่ที่ proxy.ts
  // ถ้าวันหลังมีใครลบ "/account" ออกจาก matcher ใน proxy หน้านี้ก็ยังปลอดภัยอยู่
  const user = await requireUser();

  const company =
    user.role === UserRole.EMPLOYER
      ? await prisma.company.findUnique({
          where: { ownerId: user.id },
          select: { name: true, slug: true, _count: { select: { jobs: true } } },
        })
      : null;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900">บัญชีของฉัน</h1>

      <dl className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
        <Row label="ชื่อ" value={user.name} />
        <Row label="อีเมล" value={user.email} />
        <Row label="ประเภทบัญชี" value={ROLE_LABEL[user.role]} />
      </dl>

      {user.role === UserRole.EMPLOYER && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">บริษัทของคุณ</h2>
          {company ? (
            <dl className="mt-4">
              <Row label="ชื่อบริษัท" value={company.name} />
              <Row label="ประกาศงานทั้งหมด" value={`${company._count.jobs} ประกาศ`} />
            </dl>
          ) : (
            <p className="mt-2 text-sm text-slate-600">
              ยังไม่ได้สร้างข้อมูลบริษัท — จะทำใน Phase 3
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-100 py-3 last:border-0">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}
