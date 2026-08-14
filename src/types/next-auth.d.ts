import type { DefaultSession } from "next-auth";

import type { UserRole } from "@/generated/prisma/enums";

/**
 * ขยาย type ของ Auth.js ให้รู้จักฟิลด์ที่เราเพิ่มเข้าไปเอง (id กับ role)
 *
 * ถ้าไม่มีไฟล์นี้ `session.user.role` จะ error ว่าไม่มี property นี้
 * และเราจะเผลอใช้ `as any` ซึ่งทำให้ TypeScript เลิกช่วยตรวจสิทธิ์ให้เราทันที
 *
 * เทคนิคนี้เรียกว่า "module augmentation" — เติม property เข้า interface ของ library อื่น
 */

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }

  /** ค่าที่ authorize() ส่งกลับมา */
  interface User {
    role: UserRole;
  }
}

/**
 * ต้อง augment `@auth/core/jwt` ไม่ใช่ `next-auth/jwt`
 *
 * เพราะ next-auth/jwt เป็นแค่ `export * from "@auth/core/jwt"` — ไม่ได้ประกาศ interface JWT เอง
 * ถ้าเขียน `declare module "next-auth/jwt"` TypeScript จะสร้าง interface ใหม่ที่ไม่เชื่อมกับของจริง
 * ผลคือ token.id ยังเป็น unknown อยู่เหมือนเดิม (เจอมาแล้วตอน typecheck ไม่ผ่าน)
 */
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
  }
}
