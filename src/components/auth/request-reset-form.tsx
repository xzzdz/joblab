"use client";

import { useActionState } from "react";

import { FormField } from "@/components/form-field";
import { requestPasswordResetAction } from "@/lib/actions/password-reset";
import { EMPTY_FORM_STATE } from "@/lib/form-state";

export function RequestResetForm() {
  const [state, formAction, isPending] = useActionState(
    requestPasswordResetAction,
    EMPTY_FORM_STATE
  );

  // ส่งแล้วไม่ต้องโชว์ฟอร์มอีก กันคนกดซ้ำแล้วชน rate limit ของตัวเอง
  if (state.success) {
    return (
      <p
        role="status"
        className="border border-positive bg-positive-soft px-4 py-3 text-sm text-ink"
      >
        {state.success}
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.message && (
        <p role="alert" className="bg-critical-soft px-3 py-2 text-sm text-critical">
          {state.message}
        </p>
      )}

      <FormField id="email" label="อีเมลที่ใช้สมัคร" errors={state.fieldErrors?.email}>
        {(props) => <input {...props} name="email" type="email" autoComplete="email" required />}
      </FormField>

      <button
        type="submit"
        disabled={isPending}
        className="h-11 w-full cursor-pointer bg-accent px-4 text-sm font-medium text-accent-on transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {isPending ? "กำลังส่ง..." : "ส่งลิงก์ตั้งรหัสผ่านใหม่"}
      </button>
    </form>
  );
}
