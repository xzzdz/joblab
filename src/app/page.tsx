import Link from "next/link";

import { JobCard } from "@/components/job-card";
import { getJobBoardStats, getLatestPublishedJobs, getPublishedJobLocations } from "@/lib/jobs";

/**
 * หน้าแรก
 *
 * ใช้รูปแบบของเว็บ marketplace: **ช่องค้นหาคือ CTA หลัก** ไม่ใช่ปุ่ม "เริ่มต้นใช้งาน"
 * เพราะคนที่เข้ามาหน้านี้มีเป้าหมายเดียวคือหางาน — ให้เขาเริ่มค้นได้ทันทีตั้งแต่หน้าจอแรก
 * โดยไม่ต้องกดไปหน้าอื่นก่อน
 *
 * ตัวหนังสือใหญ่และช่องว่างเยอะเป็นลายเซ็นของธีม Swiss Editorial
 * ลำดับความสำคัญสร้างจากขนาดตัวอักษร ไม่ใช่จากการไล่เฉดสีเทา
 */
export default async function HomePage() {
  const [stats, latestJobs, locations] = await Promise.all([
    getJobBoardStats(),
    getLatestPublishedJobs(4),
    getPublishedJobLocations(),
  ]);

  return (
    <div className="-mt-2">
      <section>
        <p className="label-mono text-accent">แหล่งรวมงานสายไอที</p>

        {/*
          clamp() ทำให้ตัวอักษรค่อย ๆ โตตามความกว้างจอ
          ดีกว่าการกำหนดขนาดเป็นขั้น ๆ ตาม breakpoint เพราะไม่มีจุดที่ตัวหนังสือ "กระโดด"
        */}
        <h1
          className="display-th mt-4 font-bold text-balance"
          style={{ fontSize: "clamp(2.25rem, 7vw, 4.5rem)" }}
        >
          หางานที่ใช่
          <br />
          <span className="text-accent">ติดตามได้ทุกใบสมัคร</span>
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted">
          ค้นหาตำแหน่งงานจากบริษัทไทย สมัครพร้อมแนบ resume
          แล้วดูสถานะได้ตลอดว่าใบสมัครของคุณไปถึงขั้นไหนแล้ว
        </p>

        {/*
          ฟอร์มค้นหาแบบ GET ธรรมดา — ไม่ต้องใช้ JavaScript เลย
          กดค้นหาแล้วเบราว์เซอร์พาไป /jobs?q=... เอง และลิงก์ผลลัพธ์ copy ส่งต่อได้
        */}
        <form method="get" action="/jobs" className="mt-10 flex max-w-2xl flex-col gap-3 sm:flex-row">
          <label htmlFor="home-search" className="sr-only">
            ค้นหาตำแหน่งงาน
          </label>
          <input
            id="home-search"
            name="q"
            type="search"
            placeholder="ตำแหน่ง หรือชื่อบริษัท"
            className="h-14 flex-1 border border-line-strong bg-surface px-4 text-base outline-none transition-colors placeholder:text-ink-muted focus:border-accent"
          />
          <button
            type="submit"
            className="h-14 cursor-pointer bg-ink px-8 font-medium text-paper transition-colors hover:bg-accent"
          >
            ค้นหางาน
          </button>
        </form>

        {locations.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="label-mono text-ink-muted">ยอดนิยม</span>
            {locations.slice(0, 4).map((item) => (
              <Link
                key={item.location}
                href={`/jobs?location=${encodeURIComponent(item.location)}`}
                className="border border-line px-3 py-1.5 text-sm text-ink-muted transition-colors hover:border-accent hover:text-accent"
              >
                {item.location}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* แถบตัวเลข — ใช้ฟอนต์ monospace ให้ตัวเลขเรียงตรงกันและอ่านเป็น "ข้อมูล" */}
      <section className="mt-16 grid grid-cols-3 border-y border-line">
        <Stat value={stats.openJobs} label="ตำแหน่งเปิดรับ" />
        <Stat value={stats.companies} label="บริษัท" className="border-x border-line" />
        <Stat value={stats.locations} label="จังหวัด" />
      </section>

      <section className="mt-16">
        <div className="flex items-end justify-between gap-4 border-b border-line pb-4">
          <h2 className="text-2xl font-bold tracking-tight">ประกาศล่าสุด</h2>
          <Link
            href="/jobs"
            className="shrink-0 text-sm font-medium text-accent transition-colors hover:text-accent-hover"
          >
            ดูทั้งหมด →
          </Link>
        </div>

        {latestJobs.length > 0 ? (
          <ul className="mt-6 grid gap-3">
            {latestJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </ul>
        ) : (
          <p className="mt-6 text-sm text-ink-muted">
            ยังไม่มีประกาศงาน — ลองรัน <code className="font-mono">npm run db:seed</code>
          </p>
        )}
      </section>

      <section className="mt-16 grid gap-px border border-line bg-line sm:grid-cols-2">
        <CallToAction
          eyebrow="สำหรับผู้สมัครงาน"
          title="สมัครแล้วไม่ต้องเดา"
          body="แนบ resume ได้ในไม่กี่คลิก แล้วติดตามได้ว่าบริษัทอ่านแล้วหรือยัง นัดสัมภาษณ์แล้วหรือเปล่า"
          href="/register"
          cta="สมัครสมาชิกฟรี"
        />
        <CallToAction
          eyebrow="สำหรับบริษัท"
          title="จัดการผู้สมัครบนบอร์ดเดียว"
          body="ลงประกาศงาน ดูใบสมัครทั้งหมด แล้วลากผ่านแต่ละขั้นตอนของการคัดเลือกได้ในที่เดียว"
          href="/register"
          cta="เริ่มลงประกาศ"
        />
      </section>
    </div>
  );
}

function Stat({
  value,
  label,
  className = "",
}: {
  value: number;
  label: string;
  className?: string;
}) {
  return (
    <div className={`px-2 py-8 text-center ${className}`}>
      <p className="num text-4xl font-medium">{value}</p>
      <p className="label-mono mt-2 text-ink-muted">{label}</p>
    </div>
  );
}

function CallToAction({
  eyebrow,
  title,
  body,
  href,
  cta,
}: {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex flex-col bg-paper p-8">
      <p className="label-mono text-accent">{eyebrow}</p>
      <h3 className="mt-3 text-xl font-bold tracking-tight">{title}</h3>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-muted">{body}</p>
      <Link
        href={href}
        className="mt-6 inline-flex h-11 w-fit items-center border border-line-strong px-5 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
      >
        {cta}
      </Link>
    </div>
  );
}
