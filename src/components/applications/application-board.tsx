"use client";

import { useOptimistic, useState, useTransition } from "react";

import { ApplicationStatus } from "@/generated/prisma/enums";
import { updateApplicationStatusAction } from "@/lib/actions/application";
import type { JobApplicationItem } from "@/lib/applications";
import { APPLICATION_STATUS_LABEL, formatFullDate } from "@/lib/format";
import { EMPTY_FORM_STATE } from "@/lib/form-state";

/**
 * บอร์ดติดตามใบสมัครแบบ Kanban
 *
 * ทำไมใช้ปุ่มย้าย ไม่ใช่ลากวาง:
 *   - drag & drop บนมือถือใช้ไม่ได้ (HTML5 drag API ไม่รองรับ touch)
 *   - คนที่ใช้คีย์บอร์ดหรือ screen reader ลากไม่ได้เลย
 *   - ถ้าจะทำให้ครบทั้งสองอย่างต้องลง library เพิ่ม ซึ่งขัดกฎข้อ 1 ของโปรเจค
 *     (ห้ามลง library มาแก้ปัญหาที่ยังไม่เข้าใจ)
 *   ปุ่ม ← → ทำงานได้ทุกอุปกรณ์ ทุกวิธีการใช้งาน และเขียนเองได้ทั้งหมด
 *
 * useOptimistic (React 19) ทำให้การ์ดย้ายทันทีที่กด ไม่ต้องรอ server ตอบ
 * ถ้า server ปฏิเสธ React จะย้อนสถานะกลับให้เองอัตโนมัติเมื่อ transition จบ
 * — นี่คือจุดที่ optimistic UI ต่างจากการ setState เอง: เราไม่ต้องเขียน rollback
 */

const COLUMNS = [
  ApplicationStatus.APPLIED,
  ApplicationStatus.SCREENING,
  ApplicationStatus.INTERVIEW,
  ApplicationStatus.OFFER,
  ApplicationStatus.REJECTED,
] as const;

type Move = { id: string; status: ApplicationStatus };

export function ApplicationBoard({ applications }: { applications: JobApplicationItem[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [optimisticApplications, applyMove] = useOptimistic(
    applications,
    (current: JobApplicationItem[], move: Move) =>
      current.map((item) => (item.id === move.id ? { ...item, status: move.status } : item))
  );

  function move(id: string, status: ApplicationStatus) {
    setError(null);

    // ต้องเรียก applyMove ข้างใน transition เท่านั้น ไม่งั้น React จะเตือนและไม่ย้อนสถานะให้
    startTransition(async () => {
      applyMove({ id, status });

      const formData = new FormData();
      formData.set("applicationId", id);
      formData.set("status", status);

      const result = await updateApplicationStatusAction(EMPTY_FORM_STATE, formData);
      if (result.message) setError(result.message);
    });
  }

  // ใบที่ผู้สมัครถอนเอง ไม่อยู่บนบอร์ด เพราะบริษัทแตะไม่ได้อยู่แล้ว
  const withdrawn = optimisticApplications.filter(
    (item) => item.status === ApplicationStatus.WITHDRAWN
  );

  return (
    <div>
      {error && (
        <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div
        // aria-busy บอกเครื่องช่วยอ่านหน้าจอว่าตอนนี้ข้อมูลกำลังเปลี่ยน
        aria-busy={isPending}
        className="grid gap-3 md:grid-cols-3 xl:grid-cols-5"
      >
        {COLUMNS.map((status) => {
          const cards = optimisticApplications.filter((item) => item.status === status);
          const columnIndex = COLUMNS.indexOf(status);

          return (
            <section key={status} className="rounded-lg bg-slate-100 p-3">
              <h3 className="flex items-center justify-between text-sm font-medium text-slate-700">
                {APPLICATION_STATUS_LABEL[status]}
                <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500">
                  {cards.length}
                </span>
              </h3>

              <ul className="mt-3 grid gap-2">
                {cards.map((card) => (
                  <li key={card.id} className="rounded-md bg-white p-3 shadow-sm">
                    <p className="text-sm font-medium text-slate-900">{card.seeker.name}</p>
                    <p className="truncate text-xs text-slate-500">{card.seeker.email}</p>

                    {card.coverLetter && (
                      <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-600">
                        {card.coverLetter}
                      </p>
                    )}

                    <a
                      href={`/api/resumes/${card.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs text-indigo-600 hover:underline"
                    >
                      เปิด resume ↗
                    </a>

                    <p className="mt-2 text-[11px] text-slate-400">
                      สมัครเมื่อ {formatFullDate(card.createdAt)}
                    </p>

                    <div className="mt-3 flex justify-between gap-2 border-t border-slate-100 pt-2">
                      <MoveButton
                        label="←"
                        title={`ย้ายไป ${columnIndex > 0 ? APPLICATION_STATUS_LABEL[COLUMNS[columnIndex - 1]] : ""}`}
                        disabled={columnIndex === 0}
                        onClick={() => move(card.id, COLUMNS[columnIndex - 1])}
                      />
                      <MoveButton
                        label="→"
                        title={`ย้ายไป ${columnIndex < COLUMNS.length - 1 ? APPLICATION_STATUS_LABEL[COLUMNS[columnIndex + 1]] : ""}`}
                        disabled={columnIndex === COLUMNS.length - 1}
                        onClick={() => move(card.id, COLUMNS[columnIndex + 1])}
                      />
                    </div>
                  </li>
                ))}

                {cards.length === 0 && (
                  <li className="rounded-md border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
                    ยังไม่มี
                  </li>
                )}
              </ul>
            </section>
          );
        })}
      </div>

      {withdrawn.length > 0 && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-medium text-slate-700">
            ผู้สมัครถอนใบสมัครเอง ({withdrawn.length})
          </h3>
          <ul className="mt-2 grid gap-1">
            {withdrawn.map((card) => (
              <li key={card.id} className="text-sm text-slate-500">
                {card.seeker.name} · {card.seeker.email}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MoveButton({
  label,
  title,
  disabled,
  onClick,
}: {
  label: string;
  title: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className="flex-1 rounded border border-slate-200 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
    >
      {label}
    </button>
  );
}
