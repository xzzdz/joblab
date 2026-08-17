import "server-only";

/**
 * ที่เก็บไฟล์ resume
 *
 * **ประวัติของไฟล์นี้ (สำคัญกว่าที่คิด)**
 * Phase 5 เก็บไฟล์ลงดิสก์ที่ `.uploads/` ซึ่งใช้ได้ดีตอน dev
 * พอถึง Phase 6 ที่จะ deploy จริงถึงรู้ว่าใช้บน Vercel ไม่ได้ —
 * serverless มี filesystem ที่หายทุกครั้งที่ deploy และแต่ละ instance ไม่เห็นไฟล์ของกัน
 *
 * **แต่การแก้ใช้เวลาไม่นานเลย เพราะทั้งโปรเจคเรียกไฟล์ผ่านฟังก์ชันในไฟล์นี้เท่านั้น**
 * ไม่มีที่ไหนเรียก `fs` ตรง ๆ — นี่คือเหตุผลที่ควรซ่อนรายละเอียดพวกนี้ไว้หลังฟังก์ชัน
 * ตั้งแต่แรก แม้ตอนนั้นจะดูเหมือนเขียนเกินจำเป็น
 *
 * ตอนนี้เก็บเป็น BYTEA ในตาราง ResumeFile (ดูเหตุผลและข้อจำกัดใน schema.prisma)
 */

export const MAX_RESUME_BYTES = 2 * 1024 * 1024; // 2 MB

/** ลายเซ็นไฟล์ PDF — 5 ไบต์แรกต้องเป็น "%PDF-" เสมอ */
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // % P D F -

export class InvalidFileError extends Error {}

export type ValidatedFile = {
  /**
   * เนื้อไฟล์ที่ตรวจแล้วว่าเป็น PDF จริง
   *
   * ต้องเขียน `Uint8Array<ArrayBuffer>` ให้ครบ ไม่ใช่แค่ `Uint8Array`
   *
   * เพราะ `Uint8Array` เฉย ๆ มีความหมายเท่ากับ `Uint8Array<ArrayBufferLike>`
   * ซึ่งครอบคลุม `SharedArrayBuffer` ด้วย ส่วนคอลัมน์ `Bytes` ของ Prisma 7
   * รับเฉพาะ `Uint8Array<ArrayBuffer>` — กว้างกว่าที่เขารับ TypeScript เลยปฏิเสธ
   * (`Buffer` ของ Node ก็ติดปัญหาเดียวกัน เพราะประกาศ `.buffer` เป็น `ArrayBufferLike`)
   */
  bytes: Uint8Array<ArrayBuffer>;
  size: number;
  /** ชื่อที่ผู้ใช้ตั้ง — ใช้แสดงผลเท่านั้น ห้ามเอาไปต่อ path หรือใช้เป็นชื่อไฟล์จริง */
  displayName: string;
};

/**
 * ตรวจไฟล์ที่ผู้ใช้อัปโหลด คืนข้อมูลที่พร้อมบันทึก
 *
 * ตรวจ 3 ชั้น เพราะแต่ละชั้นหลอกได้ต่างกัน:
 *   1. ขนาด — กันคนอัปไฟล์ใหญ่จนกินทรัพยากร
 *   2. นามสกุล — ผู้ใช้เปลี่ยนเองได้ แต่ช่วยกันคนกดผิดโดยสุจริต
 *   3. **ลายเซ็นในไฟล์จริง** — ชั้นนี้ต่างหากที่กันคนตั้งใจโกง
 *      เปลี่ยนนามสกุล .exe เป็น .pdf ใช้เวลา 2 วินาที และ MIME type ที่เบราว์เซอร์
 *      ส่งมาก็ปลอมได้เหมือนกัน แต่การปลอมไบต์แรกของไฟล์ให้เป็น PDF
 *      พร้อมกับให้ไฟล์ยังทำงานเป็นโปรแกรมได้นั้นยากกว่ามาก
 *
 * แยกการ "ตรวจ" ออกจากการ "บันทึก" เพราะการบันทึกต้องอยู่ใน transaction
 * เดียวกับการสร้างใบสมัคร (ดู applyToJobAction)
 */
export async function validateResume(file: File): Promise<ValidatedFile> {
  if (file.size === 0) {
    throw new InvalidFileError("ไฟล์ว่างเปล่า");
  }

  if (file.size > MAX_RESUME_BYTES) {
    throw new InvalidFileError("ไฟล์ใหญ่เกิน 2 MB");
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    throw new InvalidFileError("รับเฉพาะไฟล์ PDF เท่านั้น");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  const looksLikePdf = PDF_MAGIC.every((byte, index) => bytes[index] === byte);
  if (!looksLikePdf) {
    throw new InvalidFileError("ไฟล์นี้ไม่ใช่ PDF จริง");
  }

  return {
    bytes,
    size: bytes.byteLength,
    displayName: sanitizeDisplayName(file.name),
  };
}

/**
 * ตัดอักขระที่อาจก่อปัญหาตอนเอาชื่อไปใส่ HTTP header ตอนดาวน์โหลด
 *
 * `\r` และ `\n` อันตรายเป็นพิเศษ — ถ้าปล่อยผ่านไปอยู่ใน header ได้
 * คนโจมตีจะแทรก header ปลอมเพิ่มเข้ามาได้ (ช่องโหว่ header injection)
 */
function sanitizeDisplayName(name: string): string {
  return name.replace(/[\r\n"\\]/g, "").slice(0, 120) || "resume.pdf";
}
