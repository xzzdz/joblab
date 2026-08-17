"use client";

import { useEffect } from "react";

/**
 * ด่านรับ error ที่ไม่ได้คาดไว้ ครอบทุกหน้าใต้ app/
 *
 * ต่างจาก error ที่ "คาดไว้แล้ว" (เช่นกรอกฟอร์มผิด ซึ่งเราคืนเป็นค่าจาก Server Action)
 * ไฟล์นี้รับพวกที่ไม่ควรเกิด เช่น DB ล่ม หรือโค้ดเราพัง
 *
 * ต้องเป็น Client Component เสมอ (React error boundary ทำงานฝั่ง client เท่านั้น)
 *
 * ⚠️ Next.js 16 เปลี่ยนชื่อ prop จาก `reset` เป็น `retry` — ตัวอย่างเก่าในเน็ตยังใช้ `reset`
 */
export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // ตอนนี้ log ลง console ก่อน — ของจริงควรส่งเข้าเครื่องมือรวบรวม error (Sentry ฯลฯ)
    console.error("เกิดข้อผิดพลาดที่ไม่ได้คาดไว้:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg border border-line bg-surface p-10 text-center">
      <h1 className="text-xl font-bold text-ink">เกิดข้อผิดพลาด</h1>
      <p className="mt-2 text-sm text-ink-muted">
        ระบบขัดข้องชั่วคราว ลองใหม่อีกครั้งได้เลย ถ้ายังไม่หายให้ลองรีเฟรชหน้า
      </p>

      {/* digest คือรหัสอ้างอิงที่ Next สร้างให้ ใช้ตามหา error ตัวเดียวกันใน log ฝั่ง server
          แสดงเฉพาะรหัสได้ ไม่ควรแสดงข้อความ error จริงให้ผู้ใช้เห็น
          เพราะอาจหลุดชื่อตาราง ชื่อไฟล์ หรือโครงสร้างภายในระบบออกไป */}
      {error.digest && (
        <p className="mt-4 font-mono text-xs text-ink-muted">รหัสอ้างอิง: {error.digest}</p>
      )}

      <div className="mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={retry}
          className="bg-accent px-5 py-2.5 text-sm font-medium text-accent-on transition-colors hover:bg-accent-hover"
        >
          ลองใหม่
        </button>
        {/*
          ใช้ <a> ธรรมดา ไม่ใช่ <Link> โดยตั้งใจ
          <Link> เปลี่ยนหน้าด้วย client router ซึ่งตอนนี้อาจอยู่ในสภาพที่พังไปแล้ว
          (เราถึงได้มาอยู่ในหน้า error นี่แหละ) การโหลดหน้าใหม่ทั้งหน้าจึงเชื่อถือได้กว่า
        */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/jobs"
          className="border border-line-strong px-4 py-2 text-sm text-ink hover:bg-surface-2"
        >
          กลับหน้าตำแหน่งงาน
        </a>
      </div>
    </div>
  );
}
