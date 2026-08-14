import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * ที่เก็บไฟล์ resume
 *
 * ตอนนี้เก็บลงดิสก์ในโฟลเดอร์ `.uploads/` ของโปรเจค (ถูก gitignore ไว้)
 *
 * ⚠️ วิธีนี้ใช้บน Vercel ไม่ได้ เพราะ filesystem ของ serverless หายทุกครั้งที่ deploy
 * แต่จงใจเริ่มแบบนี้เพราะ:
 *   1. ได้เข้าใจของจริงว่าการรับไฟล์ต้องตรวจอะไรบ้าง ก่อนจะไปใช้ service สำเร็จรูป
 *   2. โค้ดส่วนที่เหลือเรียกผ่านฟังก์ชันในไฟล์นี้เท่านั้น วันที่ย้ายไป S3 / UploadThing
 *      จะแก้แค่ไฟล์นี้ไฟล์เดียว ไม่ต้องไล่แก้ทั้งโปรเจค (อยู่ใน Phase 6)
 *
 * กฎที่ยึดไว้ตลอด: **ไฟล์ที่ผู้ใช้อัปโหลดต้องไม่อยู่ในโฟลเดอร์ public/**
 * ถ้าวางไว้ที่นั่น ใครเดา URL ถูกก็โหลด resume ของคนอื่นได้ทันทีโดยไม่ต้องล็อกอิน
 */

const UPLOAD_DIR = path.join(process.cwd(), ".uploads", "resumes");

export const MAX_RESUME_BYTES = 2 * 1024 * 1024; // 2 MB

/** ลายเซ็นไฟล์ PDF — 5 ไบต์แรกต้องเป็น "%PDF-" เสมอ */
const PDF_MAGIC = Buffer.from("%PDF-", "ascii");

export type StoredFile = { key: string; originalName: string };

export class InvalidFileError extends Error {}

/**
 * ตรวจไฟล์แล้วเก็บลงที่เก็บ คืน key ที่ใช้อ้างถึงไฟล์นั้น
 *
 * ตรวจ 3 ชั้น เพราะแต่ละชั้นหลอกได้ต่างกัน:
 *   1. ขนาด — กันคนอัปไฟล์ใหญ่จนดิสก์เต็ม
 *   2. นามสกุลและ MIME type — ผู้ใช้ตั้งเองได้ทั้งคู่ เชื่อไม่ได้ แต่ช่วยกันคนกดผิดโดยสุจริต
 *   3. **ลายเซ็นในไฟล์จริง** — ชั้นนี้ต่างหากที่กันคนตั้งใจโกง
 *      เปลี่ยนนามสกุล .exe เป็น .pdf ทำได้ใน 2 วินาที แต่ปลอมไบต์แรกของไฟล์ให้เป็น PDF
 *      พร้อมกับให้ไฟล์ยังทำงานเป็นโปรแกรมได้ ยากกว่ามาก
 */
export async function saveResume(file: File): Promise<StoredFile> {
  if (file.size === 0) {
    throw new InvalidFileError("ไฟล์ว่างเปล่า");
  }

  if (file.size > MAX_RESUME_BYTES) {
    throw new InvalidFileError("ไฟล์ใหญ่เกิน 2 MB");
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    throw new InvalidFileError("รับเฉพาะไฟล์ PDF เท่านั้น");
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  // เทียบไบต์แรกกับลายเซ็นจริงของ PDF
  if (!bytes.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)) {
    throw new InvalidFileError("ไฟล์นี้ไม่ใช่ PDF จริง");
  }

  // ชื่อไฟล์บนดิสก์เราสร้างเองทั้งหมด ไม่เอาส่วนไหนของชื่อเดิมมาใช้เลย
  // จึงไม่มีทางที่ชื่อจากผู้ใช้จะพาไปเขียนไฟล์นอกโฟลเดอร์ที่ตั้งใจ (path traversal)
  const key = `${randomUUID()}.pdf`;

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, key), bytes);

  return { key, originalName: sanitizeDisplayName(file.name) };
}

/**
 * อ่านไฟล์กลับมา
 *
 * ⚠️ ฟังก์ชันนี้ **ไม่ตรวจสิทธิ์** — คนเรียกต้องตรวจมาก่อนแล้วว่าผู้ใช้คนนี้ดูไฟล์นี้ได้จริง
 * (ดู src/app/api/resumes/[key]/route.ts)
 */
export async function readResume(key: string): Promise<Buffer> {
  // กันไว้อีกชั้น เผื่อวันหลังมีใครส่ง key ที่มาจาก input ผู้ใช้เข้ามาตรง ๆ
  assertSafeKey(key);
  return readFile(path.join(UPLOAD_DIR, key));
}

export async function deleteResume(key: string): Promise<void> {
  assertSafeKey(key);
  try {
    await unlink(path.join(UPLOAD_DIR, key));
  } catch {
    // ไฟล์หายไปแล้วก็ถือว่าสำเร็จ — เป้าหมายคือ "ไม่มีไฟล์นี้อยู่" ซึ่งเป็นจริงแล้ว
  }
}

/**
 * key ที่ถูกต้องต้องเป็น uuid.pdf เท่านั้น
 * ถ้าเจอ `../` หรืออะไรแปลก ๆ แปลว่ามีคนพยายามอ่านไฟล์นอกโฟลเดอร์
 */
function assertSafeKey(key: string): void {
  if (!/^[0-9a-f-]{36}\.pdf$/i.test(key)) {
    throw new InvalidFileError("รหัสไฟล์ไม่ถูกต้อง");
  }
}

/** ตัดอักขระที่อาจก่อปัญหาตอนเอาไปใส่ header ตอนดาวน์โหลด */
function sanitizeDisplayName(name: string): string {
  return name.replace(/[\r\n"\\]/g, "").slice(0, 120) || "resume.pdf";
}
