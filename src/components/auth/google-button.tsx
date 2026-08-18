import { signIn } from "@/lib/auth";

/**
 * ปุ่มล็อกอินด้วย Google
 *
 * เป็น Server Component + `<form>` ที่เรียก Server Action ตรง ๆ
 * ไม่ต้องมี Client Component และไม่ต้องมี `onClick` — ปุ่มนี้จึงทำงานได้
 * แม้ JavaScript ยังโหลดไม่เสร็จ
 *
 * คอมโพเนนต์นี้จะถูก render เฉพาะเมื่อ `isGoogleEnabled` เป็นจริง (ดูหน้า login/register)
 */
export function GoogleButton({ callbackUrl }: { callbackUrl?: string }) {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("google", { redirectTo: callbackUrl ?? "/jobs" });
      }}
    >
      <button
        type="submit"
        className="flex h-11 w-full cursor-pointer items-center justify-center gap-3 border border-line-strong text-sm font-medium transition-colors hover:border-accent hover:text-accent"
      >
        <GoogleIcon />
        เข้าสู่ระบบด้วย Google
      </button>
    </form>
  );
}

/**
 * โลโก้ Google เป็น SVG ที่มี 4 สีตามแบรนด์
 * ไม่ใส่ `currentColor` เพราะโลโก้แบรนด์ต้องคงสีเดิมทั้งในโหมดสว่างและมืด
 */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.06 12.25c0-.85-.08-1.67-.22-2.45H12v4.63h6.2a5.3 5.3 0 0 1-2.3 3.48v2.9h3.72c2.17-2 3.44-4.95 3.44-8.56Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.1 0 5.7-1.03 7.62-2.79l-3.72-2.88c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.53-2.02-6.43-4.74H1.72v2.98A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.57 14.69a7.2 7.2 0 0 1 0-4.6V7.11H1.72a12 12 0 0 0 0 10.78l3.85-2.98Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.69 0 3.2.58 4.4 1.72l3.3-3.3C17.7 1.2 15.1 0 12 0 7.3 0 3.25 2.7 1.72 7.11l3.85 2.98C6.47 7.37 9 4.75 12 4.75Z"
      />
    </svg>
  );
}
