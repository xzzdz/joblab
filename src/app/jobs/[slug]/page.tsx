import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ApplySection } from "@/components/applications/apply-section";
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

  return (
    <article>
      <Link href="/jobs" className="text-sm text-indigo-600 hover:underline">
        ← กลับไปดูตำแหน่งงานทั้งหมด
      </Link>

      <header className="mt-4 rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-slate-900">{job.title}</h1>
        <p className="mt-1 text-slate-600">{job.company.name}</p>

        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="สถานที่" value={job.location} />
          <Field label="รูปแบบการทำงาน" value={WORK_MODE_LABEL[job.workMode]} />
          <Field label="ประเภทงาน" value={JOB_TYPE_LABEL[job.type]} />
          <Field label="เงินเดือน" value={formatSalaryRange(job.salaryMin, job.salaryMax)} />
        </dl>

        {job.publishedAt && (
          <p className="mt-5 text-xs text-slate-400">
            เผยแพร่เมื่อ{" "}
            {/* <time> ช่วยให้ screen reader และ search engine อ่านวันที่ได้ถูกต้อง */}
            <time dateTime={job.publishedAt.toISOString()}>
              {formatFullDate(job.publishedAt)}
            </time>
          </p>
        )}
      </header>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="font-semibold text-slate-900">รายละเอียดงาน</h2>
        {/* whitespace-pre-line ทำให้ \n ใน description กลายเป็นการขึ้นบรรทัดจริง */}
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">
          {job.description}
        </p>
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="font-semibold text-slate-900">เกี่ยวกับ {job.company.name}</h2>
        {job.company.description && (
          <p className="mt-3 text-sm leading-relaxed text-slate-700">{job.company.description}</p>
        )}
        {job.company.website && (
          <a
            href={job.company.website}
            target="_blank"
            // noopener/noreferrer: กันหน้าปลายทางเข้าถึง window.opener ของเรา (ช่องโหว่ tabnabbing)
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm text-indigo-600 hover:underline"
          >
            เว็บไซต์บริษัท ↗
          </a>
        )}
      </section>

      <div className="mt-6">
        {/* ต้องส่ง job.id ไม่ใช่ slug เพราะ id เป็นกุญแจจริงของแถวใน DB
            ส่วน slug เปลี่ยนได้เมื่อบริษัทแก้ชื่อตำแหน่ง */}
        <ApplySection jobId={job.id} />
      </div>
    </article>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}
