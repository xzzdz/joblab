"use client";

import { useActionState } from "react";

import { withdrawApplicationAction } from "@/lib/actions/application";
import { EMPTY_FORM_STATE } from "@/lib/form-state";

export function WithdrawButton({ applicationId }: { applicationId: string }) {
  const [state, formAction, isPending] = useActionState(
    withdrawApplicationAction,
    EMPTY_FORM_STATE
  );

  return (
    <form action={formAction} className="text-right">
      <input type="hidden" name="applicationId" value={applicationId} />
      <button
        type="submit"
        disabled={isPending}
        className="text-xs text-slate-500 underline hover:text-red-600 disabled:opacity-50"
      >
        {isPending ? "กำลังถอน..." : "ถอนใบสมัคร"}
      </button>
      {state.message && <p className="mt-1 text-xs text-red-600">{state.message}</p>}
    </form>
  );
}
