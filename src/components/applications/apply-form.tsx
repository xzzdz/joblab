"use client";

import { useActionState, useState } from "react";

import { applyToJobAction } from "@/lib/actions/application";
import { EMPTY_FORM_STATE } from "@/lib/form-state";

/** ต้องตรงกับ MAX_RESUME_BYTES ใน src/lib/storage.ts */
const MAX_BYTES = 2 * 1024 * 1024;

/**
 * ฟอร์มสมัครงาน
 *
 * ต่างจากฟอร์มอื่นในโปรเจคตรงที่มีไฟล์แนบ
 * ไม่ต้องตั้ง encType เอง — React จะใช้ multipart/form-data ให้อัตโนมัติ
 * เมื่อเห็นว่า action เป็น Server Action และในฟอร์มมี <input type="file">
 */
export function ApplyForm({ jobId }: { jobId: string }) {
  const [state, formAction, isPending] = useActionState(applyToJobAction, EMPTY_FORM_STATE);

  /**
   * เช็คขนาดไฟล์ตั้งแต่ตอนเลือก
   *
   * นี่คือเรื่อง UX ล้วน ๆ ไม่ใช่ความปลอดภัย — ฝั่ง server ตรวจซ้ำอยู่แล้วเสมอ
   * แต่มีประโยชน์จริง 2 อย่าง:
   *   1. บอกผู้ใช้ทันทีโดยไม่ต้องรออัปโหลดไฟล์ใหญ่ ๆ จนเสร็จแล้วค่อยบอกว่าไม่ผ่าน
   *   2. ไฟล์ที่ใหญ่เกินเพดาน body ของ Next (3 MB ดู next.config.ts) จะถูกตัดทิ้ง
   *      ตั้งแต่ชั้นขนส่ง ทำให้ข้อความ error ที่เราเขียนไว้ไม่มีโอกาสได้แสดง
   *      การดักตรงนี้จึงเป็นทางเดียวที่ผู้ใช้จะได้เห็นคำอธิบายที่เข้าใจได้
   */
  const [localError, setLocalError] = useState<string | null>(null);

  function checkSize(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file && file.size > MAX_BYTES) {
      setLocalError(`ไฟล์ใหญ่ ${(file.size / 1024 / 1024).toFixed(1)} MB — ต้องไม่เกิน 2 MB`);
      event.target.value = ""; // ล้างไฟล์ที่เลือกไว้ กันกดส่งไปทั้งที่รู้ว่าไม่ผ่าน
    } else {
      setLocalError(null);
    }
  }

  // สมัครสำเร็จแล้วไม่ต้องโชว์ฟอร์มอีก
  if (state.success) {
    return (
      <div className="border border-positive bg-positive-soft p-6 text-center">
        <p className="font-medium text-ink">{state.success}</p>
        <a href="/applications" className="mt-2 inline-block text-sm text-positive underline">
          ดูใบสมัครของฉัน
        </a>
      </div>
    );
  }

  return (
    <form action={formAction} className="border border-line bg-surface p-6">
      <h2 className="font-semibold text-ink">สมัครงานนี้</h2>

      {/* jobId ต้องส่งไปกับฟอร์ม แต่ห้ามเชื่อค่านี้ฝั่ง server —
          ใครแก้ค่าใน DevTools ก็ได้ ฝั่ง server จึงเช็คซ้ำว่าประกาศนั้น PUBLISHED จริง */}
      <input type="hidden" name="jobId" value={jobId} />

      {state.message && (
        <p role="alert" className="mt-4 bg-critical-soft px-3 py-2 text-sm text-critical">
          {state.message}
        </p>
      )}

      <div className="mt-4">
        <label htmlFor="resume" className="block text-sm font-medium text-ink">
          ไฟล์ resume (PDF ไม่เกิน 2 MB)
        </label>
        <input
          id="resume"
          name="resume"
          type="file"
          // accept ช่วยกรองในหน้าต่างเลือกไฟล์เท่านั้น เป็นเรื่อง UX ล้วน ๆ
          // ผู้ใช้กดเลือก "ไฟล์ทั้งหมด" ก็ข้ามได้ ด่านจริงอยู่ที่ saveResume ฝั่ง server
          accept="application/pdf"
          required
          onChange={checkSize}
          aria-invalid={Boolean(state.fieldErrors?.resume ?? localError)}
          className="mt-1 w-full cursor-pointer border border-line-strong bg-surface px-3 py-2.5 text-sm transition-colors focus:border-accent file:mr-3 file:cursor-pointer file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-sm file:text-paper"
        />
        {(localError ?? state.fieldErrors?.resume?.[0]) && (
          <p className="mt-1 text-xs text-critical">{localError ?? state.fieldErrors?.resume?.[0]}</p>
        )}
      </div>

      <div className="mt-4">
        <label htmlFor="coverLetter" className="block text-sm font-medium text-ink">
          จดหมายแนะนำตัว <span className="text-ink-muted">(ไม่บังคับ)</span>
        </label>
        <textarea
          id="coverLetter"
          name="coverLetter"
          rows={5}
          maxLength={2000}
          placeholder="เล่าสั้น ๆ ว่าทำไมคุณเหมาะกับตำแหน่งนี้"
          aria-invalid={Boolean(state.fieldErrors?.coverLetter)}
          className="mt-1 w-full border border-line-strong px-3 py-2 text-sm outline-none focus:border-accent"
        />
        {state.fieldErrors?.coverLetter && (
          <p className="mt-1 text-xs text-critical">{state.fieldErrors.coverLetter[0]}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="mt-4 w-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-on transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {isPending ? "กำลังส่งใบสมัคร..." : "ส่งใบสมัคร"}
      </button>
    </form>
  );
}
