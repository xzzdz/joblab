"use client";

import { useActionState } from "react";

import { FormField } from "@/components/form-field";
import { JobStatus, JobType, WorkMode } from "@/generated/prisma/enums";
import type { MyJob } from "@/lib/employer";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/form-state";
import { JOB_TYPE_LABEL, WORK_MODE_LABEL } from "@/lib/format";

/**
 * ฟอร์มเดียวใช้ทั้งสร้างและแก้ไข
 *
 * รับ Server Action มาเป็น prop ได้เพราะ Next ส่งมันข้ามฝั่ง client/server เป็น "อ้างอิง"
 * ไม่ได้ส่งตัวโค้ดไปให้ browser — logic ยังรันบน server เหมือนเดิม
 *
 * ต่างกันแค่:
 *   สร้าง  → มีช่องเลือกว่าจะเก็บเป็นฉบับร่างหรือเผยแพร่เลย
 *   แก้ไข → ไม่มีช่องสถานะ (เปลี่ยนสถานะใช้ปุ่มในหน้ารายการ)
 */
export function JobForm({
  job,
  action,
  submitLabel,
}: {
  job?: MyJob;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, EMPTY_FORM_STATE);
  const isEditing = job !== undefined;

  return (
    <form action={formAction} className="space-y-4">
      {/* ส่ง id ไปกับฟอร์มเพื่อบอกว่าจะแก้ประกาศไหน
          แต่ id ตัวนี้ไม่ได้ให้สิทธิ์อะไร — action ยังตรวจซ้ำว่าเป็นประกาศของบริษัทเราจริง */}
      {isEditing && <input type="hidden" name="jobId" value={job.id} />}

      {state.message && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      )}
      {state.success && (
        <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.success}
        </p>
      )}

      <FormField id="title" label="ชื่อตำแหน่ง" errors={state.fieldErrors?.title}>
        {(props) => (
          <input
            {...props}
            name="title"
            type="text"
            placeholder="เช่น Frontend Developer (React)"
            defaultValue={job?.title ?? ""}
            required
          />
        )}
      </FormField>

      <FormField id="location" label="สถานที่ทำงาน" errors={state.fieldErrors?.location}>
        {(props) => (
          <input
            {...props}
            name="location"
            type="text"
            placeholder="เช่น กรุงเทพฯ (อโศก)"
            defaultValue={job?.location ?? ""}
            required
          />
        )}
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="workMode" label="รูปแบบการทำงาน" errors={state.fieldErrors?.workMode}>
          {(props) => (
            <select {...props} name="workMode" defaultValue={job?.workMode ?? WorkMode.ONSITE}>
              {Object.values(WorkMode).map((mode) => (
                <option key={mode} value={mode}>
                  {WORK_MODE_LABEL[mode]}
                </option>
              ))}
            </select>
          )}
        </FormField>

        <FormField id="type" label="ประเภทงาน" errors={state.fieldErrors?.type}>
          {(props) => (
            <select {...props} name="type" defaultValue={job?.type ?? JobType.FULL_TIME}>
              {Object.values(JobType).map((type) => (
                <option key={type} value={type}>
                  {JOB_TYPE_LABEL[type]}
                </option>
              ))}
            </select>
          )}
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="salaryMin"
          label="เงินเดือนต่ำสุด (บาท/เดือน)"
          errors={state.fieldErrors?.salaryMin}
        >
          {(props) => (
            <input
              {...props}
              name="salaryMin"
              type="number"
              min={0}
              step={1000}
              placeholder="ไม่ระบุก็ได้"
              defaultValue={job?.salaryMin ?? ""}
            />
          )}
        </FormField>

        <FormField
          id="salaryMax"
          label="เงินเดือนสูงสุด (บาท/เดือน)"
          errors={state.fieldErrors?.salaryMax}
        >
          {(props) => (
            <input
              {...props}
              name="salaryMax"
              type="number"
              min={0}
              step={1000}
              placeholder="ไม่ระบุก็ได้"
              defaultValue={job?.salaryMax ?? ""}
            />
          )}
        </FormField>
      </div>

      <FormField id="description" label="รายละเอียดงาน" errors={state.fieldErrors?.description}>
        {(props) => (
          <textarea
            {...props}
            name="description"
            rows={12}
            placeholder={"หน้าที่ความรับผิดชอบ\n\nสิ่งที่ต้องมี\n- ...\n\nถ้ามีจะดีมาก\n- ..."}
            defaultValue={job?.description ?? ""}
            required
          />
        )}
      </FormField>

      {isEditing ? (
        <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
          ฟอร์มนี้แก้ได้เฉพาะเนื้อหา — การเผยแพร่หรือปิดรับใช้ปุ่มในหน้ารายการประกาศ
        </p>
      ) : (
        <FormField id="status" label="จะทำอะไรกับประกาศนี้" errors={state.fieldErrors?.status}>
          {(props) => (
            <select {...props} name="status" defaultValue={JobStatus.DRAFT}>
              <option value={JobStatus.DRAFT}>เก็บเป็นฉบับร่าง (ยังไม่มีใครเห็น)</option>
              <option value={JobStatus.PUBLISHED}>เผยแพร่ทันที</option>
            </select>
          )}
        </FormField>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {isPending ? "กำลังบันทึก..." : submitLabel}
      </button>
    </form>
  );
}
