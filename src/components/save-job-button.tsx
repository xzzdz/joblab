"use client";

import { useOptimistic, useTransition } from "react";

import { toggleSavedJobAction } from "@/lib/actions/saved-job";
import { EMPTY_FORM_STATE } from "@/lib/form-state";

/**
 * ปุ่มบันทึกงาน
 *
 * ใช้ `useOptimistic` ให้ปุ่มเปลี่ยนสถานะทันทีที่กด ไม่ต้องรอ server ตอบ
 * เพราะการกดบันทึกเป็นการกระทำเล็ก ๆ ที่คนคาดหวังว่าจะตอบสนองทันที
 * ถ้ารอ 300ms จะรู้สึกว่าเว็บหนืด
 *
 * ถ้า server ปฏิเสธ React ย้อนสถานะกลับให้เองเมื่อ transition จบ — ไม่ต้องเขียน rollback
 */
export function SaveJobButton({
  jobId,
  initialSaved,
  variant = "icon",
}: {
  jobId: string;
  initialSaved: boolean;
  /** icon = ใช้บนการ์ด (มีแต่ไอคอน) · full = ใช้บนหน้ารายละเอียด (มีข้อความ) */
  variant?: "icon" | "full";
}) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useOptimistic(initialSaved, (_current, next: boolean) => next);

  function toggle() {
    startTransition(async () => {
      setSaved(!saved);

      const formData = new FormData();
      formData.set("jobId", jobId);
      await toggleSavedJobAction(EMPTY_FORM_STATE, formData);
    });
  }

  const label = saved ? "เอาออกจากรายการที่บันทึก" : "บันทึกงานนี้ไว้ดูภายหลัง";

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        // ปุ่มที่มีแต่ไอคอนต้องมีชื่อกำกับ ไม่งั้น screen reader อ่านว่า "ปุ่ม" เฉย ๆ
        aria-label={label}
        // aria-pressed บอกว่าปุ่มนี้เป็นแบบสลับสถานะ และตอนนี้อยู่สถานะไหน
        aria-pressed={saved}
        title={label}
        className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center border border-line text-ink-muted transition-colors hover:border-line-strong hover:text-accent disabled:opacity-50"
      >
        <BookmarkIcon filled={saved} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      aria-pressed={saved}
      className="inline-flex h-11 cursor-pointer items-center gap-2 border border-line-strong px-4 text-sm font-medium transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
    >
      <BookmarkIcon filled={saved} />
      {saved ? "บันทึกไว้แล้ว" : "บันทึกงานนี้"}
    </button>
  );
}

/** ไอคอนเป็น SVG — ไม่ใช้ emoji เพราะหน้าตาต่างกันทุกระบบและเปลี่ยนสีตามธีมไม่ได้ */
function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      // ทึบเมื่อบันทึกแล้ว โปร่งเมื่อยังไม่บันทึก
      // ไม่พึ่งสีอย่างเดียวในการสื่อสถานะ เพราะคนตาบอดสีจะแยกไม่ออก
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}
