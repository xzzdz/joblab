import Link from "next/link";

import { JobType, WorkMode } from "@/generated/prisma/enums";
import { JOB_TYPE_LABEL, WORK_MODE_LABEL } from "@/lib/format";
import { buildJobsQuery, hasActiveFilters, type JobFilters } from "@/lib/validation/job-filters";

/**
 * ฟอร์มค้นหาและกรองงาน
 *
 * เป็น Server Component ล้วน ไม่มี JavaScript สักบรรทัดส่งไปฝั่ง browser
 * ใช้ `<form method="get">` ธรรมดา — พอกดค้นหา เบราว์เซอร์จะประกอบ query string
 * จาก name ของแต่ละ input แล้วพาไป /jobs?q=...&type=... ให้เอง
 *
 * ผลพลอยได้ที่สำคัญกว่าที่คิด:
 *   - ตัวกรองอยู่ใน URL → copy ลิงก์ส่งให้เพื่อนแล้วเห็นผลลัพธ์ชุดเดียวกัน
 *   - ปุ่ม back/forward ของเบราว์เซอร์ทำงานถูกต้องโดยเราไม่ต้องเขียนอะไรเลย
 *   - bookmark ได้ และ search engine เก็บหน้าที่กรองแล้วเข้า index ได้
 *   - ใช้งานได้แม้ JavaScript พัง
 *
 * สังเกตว่าไม่มี input ชื่อ `page` ในฟอร์ม — ตั้งใจ
 * เพราะทุกครั้งที่เปลี่ยนตัวกรอง ควรกลับไปหน้า 1 เสมอ
 * (ถ้าค้างอยู่หน้า 5 แล้วผลลัพธ์ใหม่มีแค่ 2 หน้า ผู้ใช้จะเจอหน้าว่างโดยไม่รู้สาเหตุ)
 */
export function JobFiltersForm({
  filters,
  locations,
}: {
  filters: JobFilters;
  locations: { location: string; count: number }[];
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <form method="get" action="/jobs" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <label htmlFor="q" className="block text-xs font-medium text-slate-600">
            ค้นหา
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={filters.q ?? ""}
            placeholder="ชื่อตำแหน่ง หรือชื่อบริษัท"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="location" className="block text-xs font-medium text-slate-600">
            สถานที่
          </label>
          <select
            id="location"
            name="location"
            defaultValue={filters.location ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">ทุกที่</option>
            {locations.map((item) => (
              <option key={item.location} value={item.location}>
                {item.location} ({item.count})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="workMode" className="block text-xs font-medium text-slate-600">
            รูปแบบการทำงาน
          </label>
          <select
            id="workMode"
            name="workMode"
            defaultValue={filters.workMode ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">ทั้งหมด</option>
            {Object.values(WorkMode).map((mode) => (
              <option key={mode} value={mode}>
                {WORK_MODE_LABEL[mode]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="type" className="block text-xs font-medium text-slate-600">
            ประเภทงาน
          </label>
          <select
            id="type"
            name="type"
            defaultValue={filters.type ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">ทั้งหมด</option>
            {Object.values(JobType).map((type) => (
              <option key={type} value={type}>
                {JOB_TYPE_LABEL[type]}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2 lg:col-span-4">
          <label htmlFor="salary" className="block text-xs font-medium text-slate-600">
            เงินเดือนขั้นต่ำที่ต้องการ (บาท/เดือน)
          </label>
          <input
            id="salary"
            name="salary"
            type="number"
            min={0}
            step={5000}
            defaultValue={filters.salary ?? ""}
            placeholder="ไม่ระบุ"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            ค้นหา
          </button>
        </div>
      </form>

      {hasActiveFilters(filters) && <ActiveFilterChips filters={filters} />}
    </div>
  );
}

/** แสดงตัวกรองที่ใช้อยู่ กดกากบาทเพื่อลบทีละอันได้ */
function ActiveFilterChips({ filters }: { filters: JobFilters }) {
  const chips: { label: string; clearHref: string }[] = [];

  if (filters.q) {
    chips.push({
      label: `ค้นหา: ${filters.q}`,
      // ส่ง undefined เข้าไปทับค่าเดิม = ลบตัวกรองนั้นออกจาก URL และกลับไปหน้า 1
      clearHref: `/jobs${buildJobsQuery(filters, { q: undefined, page: 1 })}`,
    });
  }
  if (filters.location) {
    chips.push({
      label: `สถานที่: ${filters.location}`,
      clearHref: `/jobs${buildJobsQuery(filters, { location: undefined, page: 1 })}`,
    });
  }
  if (filters.workMode) {
    chips.push({
      label: WORK_MODE_LABEL[filters.workMode],
      clearHref: `/jobs${buildJobsQuery(filters, { workMode: undefined, page: 1 })}`,
    });
  }
  if (filters.type) {
    chips.push({
      label: JOB_TYPE_LABEL[filters.type],
      clearHref: `/jobs${buildJobsQuery(filters, { type: undefined, page: 1 })}`,
    });
  }
  if (filters.salary) {
    chips.push({
      label: `ขั้นต่ำ ${filters.salary.toLocaleString("th-TH")} บาท`,
      clearHref: `/jobs${buildJobsQuery(filters, { salary: undefined, page: 1 })}`,
    });
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
      <span className="text-xs text-slate-500">กรองอยู่:</span>
      {chips.map((chip) => (
        <Link
          key={chip.label}
          href={chip.clearHref}
          className="group inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs text-indigo-700 hover:bg-indigo-100"
        >
          {chip.label}
          <span aria-hidden className="text-indigo-400 group-hover:text-indigo-700">
            ✕
          </span>
          <span className="sr-only">ลบตัวกรองนี้</span>
        </Link>
      ))}
      <Link href="/jobs" className="ml-1 text-xs text-slate-500 underline hover:text-slate-700">
        ล้างทั้งหมด
      </Link>
    </div>
  );
}
