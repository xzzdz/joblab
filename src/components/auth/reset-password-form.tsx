"use client";

import Link from "next/link";
import { useActionState } from "react";

import { FormField } from "@/components/form-field";
import { performPasswordResetAction } from "@/lib/actions/password-reset";
import { EMPTY_FORM_STATE } from "@/lib/form-state";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(
    performPasswordResetAction,
    EMPTY_FORM_STATE
  );

  if (state.success) {
    return (
      <div className="border border-positive bg-positive-soft px-4 py-4">
        <p role="status" className="text-sm text-ink">
          {state.success}
        </p>
        <Link
          href="/login"
          className="mt-4 inline-flex h-11 items-center bg-accent px-5 text-sm font-medium text-accent-on transition-colors hover:bg-accent-hover"
        >
          ไปหน้าเข้าสู่ระบบ
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {/* token มาจาก URL — ฝั่ง server ตรวจซ้ำทุกครั้ง ไม่เชื่อค่าที่ส่งมากับฟอร์ม */}
      <input type="hidden" name="token" value={token} />

      {state.message && (
        <p role="alert" className="bg-critical-soft px-3 py-2 text-sm text-critical">
          {state.message}{" "}
          <Link href="/forgot-password" className="underline">
            ขอลิงก์ใหม่
          </Link>
        </p>
      )}

      <FormField id="password" label="รหัสผ่านใหม่" errors={state.fieldErrors?.password}>
        {(props) => (
          <input {...props} name="password" type="password" autoComplete="new-password" required />
        )}
      </FormField>

      <FormField
        id="confirmPassword"
        label="ยืนยันรหัสผ่านใหม่"
        errors={state.fieldErrors?.confirmPassword}
      >
        {(props) => (
          <input
            {...props}
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
          />
        )}
      </FormField>

      <button
        type="submit"
        disabled={isPending}
        className="h-11 w-full cursor-pointer bg-accent px-4 text-sm font-medium text-accent-on transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {isPending ? "กำลังบันทึก..." : "ตั้งรหัสผ่านใหม่"}
      </button>
    </form>
  );
}
