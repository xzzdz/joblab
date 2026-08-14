import { handlers } from "@/lib/auth";

/**
 * Route handler ที่ Auth.js ใช้จัดการ callback ทั้งหมด
 * (`/api/auth/signin`, `/api/auth/callback/credentials`, `/api/auth/session`, ...)
 *
 * `[...nextauth]` คือ catch-all segment — รับทุก path ที่ขึ้นต้นด้วย /api/auth/
 * ไฟล์นี้แค่ส่งต่อ ไม่มี logic ของเราเอง (logic อยู่ที่ src/lib/auth.ts)
 */
export const { GET, POST } = handlers;
