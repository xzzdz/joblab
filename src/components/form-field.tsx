/**
 * ช่องกรอกข้อมูลพร้อม label และข้อความ error
 *
 * จุดที่ตั้งใจทำเรื่อง accessibility:
 * - `htmlFor` + `id` ผูก label กับ input ทำให้คลิกที่ label แล้วโฟกัสเข้าช่อง และ screen reader อ่านถูก
 * - `aria-invalid` บอกเครื่องช่วยอ่านหน้าจอว่าช่องนี้กรอกผิด (ไม่ใช่รู้จากสีแดงอย่างเดียว)
 * - `aria-describedby` ชี้ไปที่ข้อความ error เพื่อให้ถูกอ่านออกมาด้วย
 */
export function FormField({
  id,
  label,
  errors,
  children,
}: {
  id: string;
  label: string;
  errors?: string[];
  children: (props: {
    id: string;
    "aria-invalid": boolean;
    "aria-describedby": string | undefined;
    className: string;
  }) => React.ReactNode;
}) {
  const hasError = Boolean(errors?.length);
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>

      {children({
        id,
        "aria-invalid": hasError,
        "aria-describedby": hasError ? errorId : undefined,
        className: `mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${
          hasError ? "border-red-400 bg-red-50" : "border-slate-300 bg-white"
        }`,
      })}

      {hasError && (
        <p id={errorId} className="mt-1 text-xs text-red-600">
          {errors?.[0]}
        </p>
      )}
    </div>
  );
}
