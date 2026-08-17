import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="label-mono text-ink-muted">JobLab</p>
          <p className="mt-1 text-sm text-ink-muted">
            โปรเจคฝึก Next.js · TypeScript · PostgreSQL
          </p>
        </div>

        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link href="/jobs" className="text-ink-muted transition-colors hover:text-accent">
            ตำแหน่งงาน
          </Link>
          <a
            href="https://github.com/xzzdz/joblab"
            target="_blank"
            // กันหน้าปลายทางเข้าถึง window.opener ของเรา (ช่องโหว่ tabnabbing)
            rel="noopener noreferrer"
            className="text-ink-muted transition-colors hover:text-accent"
          >
            ซอร์สโค้ดบน GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
