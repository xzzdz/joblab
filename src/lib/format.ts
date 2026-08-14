import type { JobType, WorkMode } from "@/generated/prisma/enums";

/**
 * ใช้ `Record<JobType, string>` แทน object ธรรมดา
 * ประโยชน์: ถ้าวันหลังเพิ่มค่าใน enum JobType ที่ schema.prisma แล้วลืมมาเพิ่มคำแปลตรงนี้
 * TypeScript จะ error ตอน build ทันที ไม่ปล่อยให้หน้าเว็บขึ้นค่าว่าง
 */
export const JOB_TYPE_LABEL: Record<JobType, string> = {
  FULL_TIME: "งานประจำ",
  PART_TIME: "พาร์ทไทม์",
  CONTRACT: "สัญญาจ้าง",
  INTERNSHIP: "ฝึกงาน",
};

export const WORK_MODE_LABEL: Record<WorkMode, string> = {
  ONSITE: "เข้าออฟฟิศ",
  HYBRID: "ไฮบริด",
  REMOTE: "ทำงานทางไกล",
};

const bahtFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});

/** แปลงช่วงเงินเดือนเป็นข้อความ รองรับกรณีระบุแค่ค่าเดียวหรือไม่ระบุเลย */
export function formatSalaryRange(min: number | null, max: number | null): string {
  if (min !== null && max !== null) {
    return `${bahtFormatter.format(min)} – ${bahtFormatter.format(max)} / เดือน`;
  }
  if (min !== null) return `เริ่มต้น ${bahtFormatter.format(min)} / เดือน`;
  if (max !== null) return `สูงสุด ${bahtFormatter.format(max)} / เดือน`;
  return "ไม่ระบุเงินเดือน";
}

/** แปลงวันที่เป็นข้อความแบบ "3 วันที่แล้ว" เพื่อให้ผู้ใช้รู้ว่าประกาศใหม่แค่ไหน */
export function formatRelativeDate(date: Date | null): string {
  if (date === null) return "ยังไม่เผยแพร่";

  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "วันนี้";
  if (diffDays === 1) return "เมื่อวาน";
  if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} สัปดาห์ที่แล้ว`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} เดือนที่แล้ว`;
  return `${Math.floor(diffDays / 365)} ปีที่แล้ว`;
}

/** วันที่แบบเต็ม ใช้ในหน้ารายละเอียดและใน <time dateTime> */
export function formatFullDate(date: Date): string {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
