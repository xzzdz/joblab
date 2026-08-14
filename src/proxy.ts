import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

/**
 * Proxy — ตั้งแต่ Next.js 16 ไฟล์นี้คือสิ่งที่เคยชื่อว่า middleware
 * (ทำงานเหมือนเดิมทุกอย่าง เปลี่ยนแค่ชื่อไฟล์กับชื่อ export)
 *
 * หน้าที่ของมันที่นี่คือ "ด่านแรก" เท่านั้น — กันคนที่ยังไม่ล็อกอินไม่ให้เห็นหน้าที่ต้องล็อกอิน
 * และพาคนที่ล็อกอินแล้วออกจากหน้า login
 *
 * ⚠️ ห้ามคิดว่านี่คือระบบตรวจสิทธิ์หลัก
 * เอกสารของ Next.js ระบุชัดว่า proxy ไม่ควรเป็นด่านเดียว เพราะ:
 *   - มันทำงานทุก request รวมถึง route ที่ถูก prefetch → ห้ามยิง DB ในนี้ (ช้า)
 *   - มันเช็คจาก cookie ล้วน ๆ ซึ่งเป็นข้อมูล ณ ตอนที่ล็อกอิน อาจไม่ตรงกับ DB แล้ว
 *   - ถ้าเพิ่มหน้าใหม่แล้วลืมแก้ matcher ข้างล่าง หน้านั้นจะไม่มีด่านนี้เลย
 * ด่านจริงอยู่ที่ requireUser() / requireRole() ใน src/lib/dal.ts ซึ่งอยู่ติดกับข้อมูล
 */

/** หน้าที่ต้องล็อกอินก่อนถึงจะเข้าได้ */
const PROTECTED_PREFIXES = ["/account", "/employer", "/applications"];

/** หน้าที่คนล็อกอินแล้วไม่ควรเห็นอีก */
const GUEST_ONLY_PATHS = ["/login", "/register"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = Boolean(req.auth?.user);

  const needsAuth = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (needsAuth && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl);
    // จำไว้ว่าผู้ใช้ตั้งใจจะไปไหน เพื่อพากลับไปที่เดิมหลังล็อกอินเสร็จ
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && GUEST_ONLY_PATHS.includes(pathname)) {
    return NextResponse.redirect(new URL("/jobs", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  /**
   * ไม่ให้ proxy ทำงานกับไฟล์ static และ route ของ Auth.js เอง
   * ถ้าปล่อยให้ครอบ /api/auth/* จะเกิด redirect วนไม่จบตอนล็อกอิน
   */
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
