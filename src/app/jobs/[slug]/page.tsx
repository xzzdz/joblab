import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ApplySection } from "@/components/applications/apply-section";
import { JobPostingSchema } from "@/components/job-posting-schema";
import { SaveJobButton } from "@/components/save-job-button";
import { UserRole } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/dal";
import { getSavedJobIds } from "@/lib/saved-jobs";
import {
  JOB_TYPE_LABEL,
  WORK_MODE_LABEL,
  formatFullDate,
  formatSalaryRange,
} from "@/lib/format";
import { getPublishedJobBySlug } from "@/lib/jobs";
import { decodeRouteParam } from "@/lib/route-params";

/**
 * ตั้ง <title> และ meta description จากข้อมูลจริงของแต่ละประกาศ
 * Next.js เรียกฟังก์ชันนี้บน server ก่อน render — สำคัญมากสำหรับ SEO
 * และ Next จะ dedupe การเรียก getPublishedJobBySlug ที่ซ้ำกับใน Page ให้เอง
 */
export async function generateMetadata(props: PageProps<"/jobs/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const job = await getPublishedJobBySlug(decodeRouteParam(slug));

  if (!job) return { title: "ไม่พบประกาศงาน" };

  return {
    title: `${job.title} ที่ ${job.company.name}`,
    description: job.description.slice(0, 155),
  };
}

export default async function JobDetailPage(props: PageProps<"/jobs/[slug]">) {
  // ตั้งแต่ Next.js 15 เป็นต้นมา params เป็น Promise ต้อง await ก่อนใช้
  const { slug } = await props.params;

  // ต้อง decode ก่อนเสมอ — slug ภาษาไทยมาถึงเป็น %E0%B8%99... (ดูคำอธิบายใน route-params.ts)
  const job = await getPublishedJobBySlug(decodeRouteParam(slug));

  // ไม่เจอ (หรือเจอแต่ยังเป็น DRAFT/CLOSED) → ตอบ 404 ให้เหมือนกันทั้งสองกรณี
  // ถ้าแยกข้อความว่า "มีอยู่แต่ยังไม่เผยแพร่" เท่ากับบอกใบ้ข้อมูลภายในบริษัทให้คนนอกรู้
  if (!job) notFound();

  // ปุ่มบันทึกแสดงเฉพาะผู้สมัครงานที่ล็อกอินแล้ว
  const user = await getCurrentUser();
  const canSave = user?.role === UserRole.SEEKER;
  const savedIds = canSave ? await getSavedJobIds(user.id, [job.id]) : new Set<string>();

  return (
    <article>
      {/* ข้อมูลสำหรับ Google Jobs — ไม่แสดงบนหน้าเว็บ แต่จำเป็นต่อการถูกค้นเจอ */}
      <JobPostingSchema job={job} />

      <Link
        href="/jobs"
        className="label-mono text-ink-muted transition-colors hover:text-accent"
      >
        ← ตำแหน่งงานทั้งหมด
      </Link>

      <header className="mt-6 border-b border-line pb-8">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="label-mono text-accent">{JOB_TYPE_LABEL[job.type]}</span>
          <span aria-hidden="true" className="text-line-strong">·</span>
          <span className="label-mono text-ink-muted">{WORK_MODE_LABEL[job.workMode]}</span>
        </div>

        {/* หัวข้อของหน้านี้ควรเป็นตัวที่ใหญ่ที่สุด — เป็นสิ่งที่คนเข้ามาอ่าน
            เดิมตั้งไว้แค่ text-2xl ซึ่งเล็กกว่าหัวข้อหน้ารายการ ทำให้ลำดับความสำคัญกลับหัว */}
        <h1
          className="display-th mt-3 font-bold text-balance"
          style={{ fontSize: "clamp(1.75rem, 4.5vw, 2.75rem)" }}
        >
          {job.title}
        </h1>

        <p className="mt-3 text-base text-ink-muted">
          <Link
            href={`/companies/${job.company.slug}`}
            className="font-medium text-ink transition-colors hover:text-accent"
          >
            {job.company.name}
          </Link>
          {" · "}
          {job.location}
        </p>

        <dl className="mt-6 grid gap-5 border-t border-line pt-6 sm:grid-cols-3">
          <Field label="เงินเดือน" value={formatSalaryRange(job.salaryMin, job.salaryMax)} numeric />
          <Field label="สถานที่" value={job.location} />
          <Field label="รูปแบบการทำงาน" value={WORK_MODE_LABEL[job.workMode]} />
        </dl>

        {canSave && (
          <div className="mt-6">
            <SaveJobButton jobId={job.id} initialSaved={savedIds.has(job.id)} variant="full" />
          </div>
        )}

        {job.publishedAt && (
          <p className="mt-6 text-xs text-ink-muted">
            เผยแพร่เมื่อ{" "}
            {/* <time> ช่วยให้ screen reader และ search engine อ่านวันที่ได้ถูกต้อง */}
            <time dateTime={job.publishedAt.toISOString()}>
              {formatFullDate(job.publishedAt)}
            </time>
          </p>
        )}
      </header>

      <section className="mt-8">
        <h2 className="text-lg font-bold tracking-tight">รายละเอียดงาน</h2>
        {/* whitespace-pre-line ทำให้ \n ใน description กลายเป็นการขึ้นบรรทัดจริง */}
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink">
          {job.description}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold tracking-tight">เกี่ยวกับ {job.company.name}</h2>
        {job.company.description && (
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">{job.company.description}</p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link
            href={`/companies/${job.company.slug}`}
            className="text-sm font-medium text-accent transition-colors hover:text-accent-hover"
          >
            ดูตำแหน่งอื่นของบริษัทนี้ →
          </Link>
          {job.company.website && (
            <a
              href={job.company.website}
              target="_blank"
              // noopener/noreferrer: กันหน้าปลายทางเข้าถึง window.opener ของเรา (ช่องโหว่ tabnabbing)
              rel="noopener noreferrer"
              className="text-sm text-ink-muted transition-colors hover:text-accent"
            >
              เว็บไซต์บริษัท ↗
            </a>
          )}
        </div>
      </section>

      <div className="mt-6">
        {/* ต้องส่ง job.id ไม่ใช่ slug เพราะ id เป็นกุญแจจริงของแถวใน DB
            ส่วน slug เปลี่ยนได้เมื่อบริษัทแก้ชื่อตำแหน่ง */}
        <ApplySection jobId={job.id} />
      </div>
    </article>
  );
}

function Field({
  label,
  value,
  numeric = false,
}: {
  label: string;
  value: string;
  numeric?: boolean;
}) {
  return (
    <div>
      <dt className="label-mono text-ink-muted">{label}</dt>
      {/* ตัวเลขใช้ฟอนต์ mono ส่วนข้อความไทยใช้ฟอนต์ปกติ — ดูคำอธิบายที่ .num ใน globals.css */}
      <dd className={`mt-1 font-medium text-ink ${numeric ? "num" : ""}`}>{value}</dd>
    </div>
  );
}
