"use client";

import { useActionState } from "react";

import { FormField } from "@/components/form-field";
import { UserRole } from "@/generated/prisma/enums";
import { registerAction, type AuthFormState } from "@/lib/actions/auth";

const EMPTY_STATE: AuthFormState = {};

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(registerAction, EMPTY_STATE);

  return (
    <form action={formAction} className="space-y-4">
      {state.message && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      )}

      <fieldset>
        <legend className="text-sm font-medium text-slate-700">สมัครในฐานะ</legend>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <RoleOption
            value={UserRole.SEEKER}
            title="ผู้สมัครงาน"
            description="ค้นหางานและส่งใบสมัคร"
            defaultChecked
          />
          <RoleOption
            value={UserRole.EMPLOYER}
            title="บริษัท"
            description="ลงประกาศและดูผู้สมัคร"
          />
        </div>
      </fieldset>

      <FormField id="name" label="ชื่อ-นามสกุล" errors={state.fieldErrors?.name}>
        {(props) => <input {...props} name="name" type="text" autoComplete="name" required />}
      </FormField>

      <FormField id="email" label="อีเมล" errors={state.fieldErrors?.email}>
        {(props) => <input {...props} name="email" type="email" autoComplete="email" required />}
      </FormField>

      <FormField id="password" label="รหัสผ่าน" errors={state.fieldErrors?.password}>
        {(props) => (
          <input
            {...props}
            name="password"
            type="password"
            autoComplete="new-password"
            required
          />
        )}
      </FormField>

      <FormField
        id="confirmPassword"
        label="ยืนยันรหัสผ่าน"
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
        className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {isPending ? "กำลังสมัคร..." : "สมัครสมาชิก"}
      </button>
    </form>
  );
}

/** ตัวเลือก role แบบการ์ด — ใช้ radio จริงข้างใน เพื่อให้กด Tab และใช้คีย์บอร์ดได้ตามปกติ */
function RoleOption({
  value,
  title,
  description,
  defaultChecked,
}: {
  value: string;
  title: string;
  description: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="cursor-pointer rounded-md border border-slate-300 bg-white p-3 has-checked:border-indigo-500 has-checked:bg-indigo-50">
      <input
        type="radio"
        name="role"
        value={value}
        defaultChecked={defaultChecked}
        className="sr-only"
      />
      <span className="block text-sm font-medium text-slate-900">{title}</span>
      <span className="mt-0.5 block text-xs text-slate-600">{description}</span>
    </label>
  );
}
