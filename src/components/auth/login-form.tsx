"use client";

import { useActionState } from "react";

import { FormField } from "@/components/form-field";
import { loginAction, type AuthFormState } from "@/lib/actions/auth";

const EMPTY_STATE: AuthFormState = {};

/**
 * ต้องเป็น Client Component เพราะใช้ useActionState เพื่อรับ error กลับมาแสดง
 *
 * useActionState (React 19) คืนค่า 3 อย่าง:
 *   state     — ค่าที่ action คืนมาครั้งล่าสุด (ในที่นี้คือ error)
 *   formAction — ฟังก์ชันที่เอาไปใส่ใน <form action={...}>
 *   isPending  — true ระหว่างที่ action ยังทำงานอยู่ ใช้ปิดปุ่มกันกดซ้ำ
 */
export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, formAction, isPending] = useActionState(loginAction, EMPTY_STATE);

  return (
    <form action={formAction} className="space-y-4">
      {/* ส่งปลายทางที่ผู้ใช้ตั้งใจจะไปติดไปกับฟอร์ม เพื่อพากลับไปหลังล็อกอินสำเร็จ */}
      {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}

      {state.message && (
        // role="alert" ทำให้ screen reader อ่านข้อความนี้ทันทีที่มันปรากฏ
        <p role="alert" className="bg-critical-soft px-3 py-2 text-sm text-critical">
          {state.message}
        </p>
      )}

      <FormField id="email" label="อีเมล" errors={state.fieldErrors?.email}>
        {(props) => (
          <input {...props} name="email" type="email" autoComplete="email" required />
        )}
      </FormField>

      <FormField id="password" label="รหัสผ่าน" errors={state.fieldErrors?.password}>
        {(props) => (
          <input
            {...props}
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        )}
      </FormField>

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-on transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {isPending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
      </button>
    </form>
  );
}
