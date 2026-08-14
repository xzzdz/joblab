import { z } from "zod";

import { JobType, WorkMode } from "@/generated/prisma/enums";

/**
 * แปลง searchParams จาก URL ให้เป็นค่าที่เชื่อถือได้
 *
 * ทำไมต้อง validate ทั้งที่เป็นแค่ query string:
 * URL คือ input จากผู้ใช้เหมือนฟอร์มทุกประการ ใครจะพิมพ์อะไรใส่ก็ได้
 * เช่น `?type=DROP_TABLE` หรือ `?perPage=999999` (ดึงทั้งตารางมาทีเดียว)
 * เราจึงคัดเฉพาะค่าที่รู้จัก ค่าที่ไม่รู้จักให้ตกไปเป็นค่า default เงียบ ๆ
 * ไม่ต้องขึ้น error เพราะ URL เพี้ยนไม่ใช่ความผิดของคนกด — แค่แสดงผลปกติก็พอ
 */

export const JOBS_PER_PAGE = 6;

/** ช่องว่างล้วนหรือค่าว่าง → undefined เพื่อให้ถือว่า "ไม่ได้กรอง" */
const optionalTrimmed = (max: number) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed.slice(0, max);
  }, z.string().optional());

/**
 * ค่าที่ไม่อยู่ในรายการที่รู้จัก → undefined (ไม่ใช่ error)
 *
 * เขียนแยกทีละ enum แทนที่จะทำเป็นฟังก์ชัน generic เพราะอยากได้ type ที่แคบจริง
 * (`JobType | undefined` ไม่ใช่ `string | undefined`) จะได้ส่งเข้า Prisma ได้ตรง ๆ
 * โดยไม่ต้อง cast — การ cast คือจุดที่ TypeScript เลิกช่วยตรวจให้เรา
 */
const dropUnknown = (allowed: Record<string, string>) => (value: unknown) =>
  typeof value === "string" && value in allowed ? value : undefined;

const optionalJobType = z.preprocess(dropUnknown(JobType), z.enum(JobType).optional());
const optionalWorkMode = z.preprocess(dropUnknown(WorkMode), z.enum(WorkMode).optional());

const optionalPositiveInt = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}, z.number().int().optional());

export const jobFiltersSchema = z.object({
  /** คำค้นหา — ใช้กับชื่อตำแหน่งและชื่อบริษัท */
  q: optionalTrimmed(100),
  location: optionalTrimmed(120),
  type: optionalJobType,
  workMode: optionalWorkMode,
  /** เงินเดือนขั้นต่ำที่ผู้สมัครรับได้ */
  salary: optionalPositiveInt,
  /** เลขหน้า เริ่มที่ 1 เสมอ ค่าที่ผิดรูปหรือติดลบจะกลายเป็นหน้า 1 */
  page: z.preprocess((value) => {
    if (typeof value !== "string") return 1;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 1000) : 1;
  }, z.number().int().min(1)),
});

export type JobFilters = z.infer<typeof jobFiltersSchema>;

/** ค่าที่ได้จาก searchParams ของ Next มาเป็น string | string[] | undefined */
type RawSearchParams = Record<string, string | string[] | undefined>;

/** ถ้าพารามิเตอร์ซ้ำ (`?type=A&type=B`) ให้ใช้ตัวแรก */
function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseJobFilters(searchParams: RawSearchParams): JobFilters {
  const parsed = jobFiltersSchema.safeParse({
    q: firstValue(searchParams.q),
    location: firstValue(searchParams.location),
    type: firstValue(searchParams.type),
    workMode: firstValue(searchParams.workMode),
    salary: firstValue(searchParams.salary),
    page: firstValue(searchParams.page),
  });

  // schema ออกแบบให้ทุกฟิลด์ optional และมี fallback อยู่แล้ว จึงแทบไม่มีทางล้มเหลว
  // แต่ถ้าล้มเหลวจริงก็ถือว่าไม่ได้กรองอะไร ดีกว่าปล่อยให้หน้าพัง
  return parsed.success ? parsed.data : { page: 1 };
}

/** มีการกรองอะไรอยู่ไหม (ไม่นับเลขหน้า) — ใช้ตัดสินว่าจะโชว์ปุ่ม "ล้างตัวกรอง" ไหม */
export function hasActiveFilters(filters: JobFilters): boolean {
  return Boolean(filters.q || filters.location || filters.type || filters.workMode || filters.salary);
}

/**
 * สร้าง query string ใหม่จากตัวกรองปัจจุบัน โดยเปลี่ยนบางค่า
 * ใช้ทำลิงก์ "หน้าถัดไป" และปุ่มลบตัวกรองทีละอัน
 */
export function buildJobsQuery(filters: JobFilters, overrides: Partial<JobFilters> = {}): string {
  const merged = { ...filters, ...overrides };
  const params = new URLSearchParams();

  if (merged.q) params.set("q", merged.q);
  if (merged.location) params.set("location", merged.location);
  if (merged.type) params.set("type", merged.type);
  if (merged.workMode) params.set("workMode", merged.workMode);
  if (merged.salary) params.set("salary", String(merged.salary));
  // หน้า 1 ไม่ต้องใส่ในลิงก์ ให้ URL สั้นและสะอาด
  if (merged.page > 1) params.set("page", String(merged.page));

  const query = params.toString();
  return query ? `?${query}` : "";
}
