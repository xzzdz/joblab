/**
 * ค่าคงที่ระดับเว็บ
 *
 * แยกมาไว้ที่เดียวเพราะถูกใช้ทั้งใน metadata, sitemap, robots และ structured data
 * ถ้ากระจายเขียน URL ไว้หลายที่ วันที่เปลี่ยนโดเมนจะมีสักที่ที่ลืมแก้
 * แล้วจะกลายเป็นบั๊กที่มองไม่เห็น (เช่น sitemap ชี้ไปโดเมนเก่า)
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://joblab.vercel.app";

export const SITE_NAME = "JobLab";

export const SITE_DESCRIPTION =
  "ค้นหาตำแหน่งงานจากบริษัทไทย สมัครพร้อมแนบ resume แล้วติดตามสถานะใบสมัครได้ทุกใบ";

/** ต่อ path ให้เป็น URL เต็ม — ใช้ใน sitemap และ structured data ที่ต้องใช้ URL แบบเต็มเสมอ */
export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}
