import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JobCard } from "@/components/job-card";
import { getPublicCompanyBySlug } from "@/lib/companies";
import { decodeRouteParam } from "@/lib/route-params";

export async function generateMetadata(props: PageProps<"/companies/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const company = await getPublicCompanyBySlug(decodeRouteParam(slug));

  if (!company) return { title: "ไม่พบบริษัท" };

  return {
    title: `งานที่ ${company.name}`,
    description:
      company.description?.slice(0, 155) ?? `ตำแหน่งงานที่เปิดรับอยู่ที่ ${company.name}`,
  };
}

export default async function CompanyPage(props: PageProps<"/companies/[slug]">) {
  const { slug } = await props.params;

  // slug ที่มาถึงหน้า Page ยังเป็น percent-encoded ต้อง decode ก่อนเอาไปค้น
  const company = await getPublicCompanyBySlug(decodeRouteParam(slug));

  // ไม่มีบริษัทนี้ หรือมีแต่ยังไม่มีประกาศที่เผยแพร่ → ตอบ 404 เหมือนกันทั้งสองกรณี
  if (!company) notFound();

  return (
    <div>
      <Link href="/jobs" className="label-mono text-ink-muted transition-colors hover:text-accent">
        ← ตำแหน่งงานทั้งหมด
      </Link>

      <header className="mt-6 border-b border-line pb-8">
        <p className="label-mono text-accent">บริษัท</p>
        <h1
          className="mt-3 font-bold tracking-tight text-balance"
          style={{ fontSize: "clamp(1.875rem, 5vw, 3rem)", lineHeight: 1.1 }}
        >
          {company.name}
        </h1>

        {company.description && (
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-muted">
            {company.description}
          </p>
        )}

        {company.website && (
          <a
            href={company.website}
            target="_blank"
            // กันหน้าปลายทางเข้าถึง window.opener ของเรา (ช่องโหว่ tabnabbing)
            rel="noopener noreferrer"
            className="mt-5 inline-flex h-11 items-center border border-line-strong px-4 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
          >
            เว็บไซต์บริษัท ↗
          </a>
        )}
      </header>

      <section className="mt-10">
        <h2 className="text-xl font-bold tracking-tight">
          ตำแหน่งที่เปิดรับ{" "}
          <span className="font-mono text-ink-muted tabular-nums">({company.jobs.length})</span>
        </h2>

        <ul className="mt-6 grid gap-3">
          {company.jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </ul>
      </section>
    </div>
  );
}
