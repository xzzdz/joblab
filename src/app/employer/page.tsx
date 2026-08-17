import type { Metadata } from "next";
import Link from "next/link";

import { CompanyForm } from "@/components/employer/company-form";
import { UserRole } from "@/generated/prisma/enums";
import { requireRole } from "@/lib/dal";
import { getMyCompany, getMyJobStats } from "@/lib/employer";

export const metadata: Metadata = {
  title: "ข้อมูลบริษัท",
};

export default async function EmployerHomePage() {
  // เรียก requireRole ซ้ำจาก layout ได้โดยไม่เสียประสิทธิภาพ
  // เพราะ getCurrentUser ห่อด้วย React cache → query DB ครั้งเดียวต่อ 1 request
  const user = await requireRole(UserRole.EMPLOYER);

  const [company, stats] = await Promise.all([getMyCompany(user.id), getMyJobStats(user.id)]);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-ink">ข้อมูลบริษัท</h1>

      {company ? (
        <div className="mt-4 grid grid-cols-3 gap-3">
          <StatCard label="เผยแพร่อยู่" value={stats.PUBLISHED} tone="published" />
          <StatCard label="ฉบับร่าง" value={stats.DRAFT} tone="draft" />
          <StatCard label="ปิดรับแล้ว" value={stats.CLOSED} tone="closed" />
        </div>
      ) : (
        <p className="mt-4 bg-warning-soft px-3 py-2 text-sm text-warning-ink">
          ยังไม่มีข้อมูลบริษัท — กรอกฟอร์มด้านล่างให้เสร็จก่อน จึงจะลงประกาศงานได้
        </p>
      )}

      <div className="mt-6 border border-line bg-surface p-6">
        <CompanyForm company={company} />
      </div>

      {company && (
        <p className="mt-4 text-sm text-ink-muted">
          หน้าประกาศงานของคุณ:{" "}
          <Link href="/employer/jobs" className="text-accent hover:underline">
            จัดการประกาศงาน →
          </Link>
        </p>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "published" | "draft" | "closed";
}) {
  const toneClass = {
    published: "text-positive",
    draft: "text-ink",
    closed: "text-ink-muted",
  }[tone];

  return (
    <div className="border border-line bg-surface p-4 text-center">
      <p className={`text-2xl font-bold ${toneClass}`}>{value}</p>
      <p className="mt-0.5 text-xs text-ink-muted">{label}</p>
    </div>
  );
}
