"use client";

import { useActionState } from "react";

import { FormField } from "@/components/form-field";
import { saveCompanyProfile } from "@/lib/actions/company";
import { EMPTY_FORM_STATE } from "@/lib/form-state";
import type { MyCompany } from "@/lib/employer";

export function CompanyForm({ company }: { company: MyCompany | null }) {
  const [state, formAction, isPending] = useActionState(saveCompanyProfile, EMPTY_FORM_STATE);

  return (
    <form action={formAction} className="space-y-4">
      {state.message && (
        <p role="alert" className="bg-critical-soft px-3 py-2 text-sm text-critical">
          {state.message}
        </p>
      )}
      {state.success && (
        <p role="status" className="bg-positive-soft px-3 py-2 text-sm text-positive">
          {state.success}
        </p>
      )}

      <FormField id="name" label="ชื่อบริษัท" errors={state.fieldErrors?.name}>
        {(props) => (
          <input {...props} name="name" type="text" defaultValue={company?.name ?? ""} required />
        )}
      </FormField>

      <FormField id="website" label="เว็บไซต์ (ไม่บังคับ)" errors={state.fieldErrors?.website}>
        {(props) => (
          <input
            {...props}
            name="website"
            type="url"
            placeholder="https://example.com"
            defaultValue={company?.website ?? ""}
          />
        )}
      </FormField>

      <FormField id="logoUrl" label="ลิงก์โลโก้ (ไม่บังคับ)" errors={state.fieldErrors?.logoUrl}>
        {(props) => (
          <input
            {...props}
            name="logoUrl"
            type="url"
            placeholder="https://example.com/logo.png"
            defaultValue={company?.logoUrl ?? ""}
          />
        )}
      </FormField>

      <FormField
        id="description"
        label="เกี่ยวกับบริษัท (ไม่บังคับ)"
        errors={state.fieldErrors?.description}
      >
        {(props) => (
          <textarea {...props} name="description" rows={5} defaultValue={company?.description ?? ""} />
        )}
      </FormField>

      <button
        type="submit"
        disabled={isPending}
        className="bg-accent px-5 py-2.5 text-sm font-medium text-accent-on transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {isPending ? "กำลังบันทึก..." : company ? "บันทึกการแก้ไข" : "สร้างข้อมูลบริษัท"}
      </button>
    </form>
  );
}
