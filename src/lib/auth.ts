import { compare } from "bcryptjs";
import NextAuth from "next-auth";
// ชนิด Provider อยู่ที่ @auth/core ไม่ได้ re-export ผ่าน next-auth
import type { Provider } from "@auth/core/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validation/auth";

/**
 * เพดานการลองล็อกอิน — ต้องตรงกับค่าที่ใช้แสดงข้อความใน src/lib/actions/auth.ts
 *
 * **ทำไมด่านนี้ต้องอยู่ที่ authorize() ไม่ใช่แค่ที่ Server Action ของฟอร์ม**
 * ตอนแรกวางไว้ที่ loginAction อย่างเดียว แล้วทดสอบพบว่ายิงตรงไปที่
 * `/api/auth/callback/credentials` ผ่านฉลุยทั้ง 8 ครั้ง เพราะ endpoint นั้นเป็นของ Auth.js
 * ไม่ได้วิ่งผ่าน action ของเราเลย — ซึ่งเป็นทางที่คนเขียนสคริปต์ไล่เดารหัสผ่านจะใช้จริง
 *
 * authorize() คือจุดร่วมที่การล็อกอินทุกเส้นทางต้องผ่าน จึงเป็นที่เดียวที่กันได้ครบ
 * หลักการเดียวกับที่เอาเงื่อนไขสิทธิ์ไปไว้ใน where ของ query: วางด่านไว้ตรงที่เลี่ยงไม่ได้
 */
export const LOGIN_WINDOW_MS = 10 * 60 * 1000;
export const LOGIN_MAX_PER_IP = 10;
export const LOGIN_MAX_PER_EMAIL = 5;

/**
 * แฮชหลอกสำหรับกรณี "ไม่พบอีเมลนี้ในระบบ"
 *
 * ทำไมต้องมี: ถ้าเจอผู้ใช้เราจะเสียเวลา ~100ms ไปกับ bcrypt.compare
 * แต่ถ้าไม่เจอแล้ว return null ทันที จะใช้เวลาแค่ ~5ms
 * คนโจมตีจับเวลาตอบกลับก็รู้ได้ว่าอีเมลไหนมีบัญชีอยู่จริง (timing attack)
 * เลยบังคับให้เส้นทาง "ไม่เจอ" เสียเวลาพอ ๆ กัน
 */
const DUMMY_PASSWORD_HASH = "$2b$10$wAslZsRTtQbGYC1fH2M/8eE5q5LCL8YQAdstBfBCqo1OXCRYT2sKC";

/**
 * เปิดใช้ Google ก็ต่อเมื่อมี credential อยู่จริง
 *
 * ทำไมไม่ใส่ provider ไปเลยตรง ๆ: ถ้าใส่แล้วไม่มี client id/secret
 * Auth.js จะพังตอน request แรกที่แตะระบบล็อกอิน — ทั้งเว็บใช้ไม่ได้
 * แค่เพราะยังไม่ได้ตั้งค่าที่ไม่บังคับ
 *
 * แบบนี้ทำให้โปรเจคทำงานได้ทันทีบนเครื่องใหม่โดยไม่ต้องมีบัญชี Google
 * และพอใส่ env สองตัวเมื่อไหร่ ปุ่มก็โผล่มาเอง (ดู isGoogleEnabled ข้างล่าง)
 */
export const isGoogleEnabled = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
);

const credentialsProvider = Credentials({
  credentials: {
    email: { label: "อีเมล", type: "email" },
    password: { label: "รหัสผ่าน", type: "password" },
  },

  /**
   * คืนค่า user object = ล็อกอินผ่าน / คืน null = ไม่ผ่าน
   *
   * สังเกตว่าทุกกรณีที่ล้มเหลวคืน null เหมือนกันหมด ไม่บอกว่า
   * "ไม่มีอีเมลนี้" หรือ "รหัสผ่านผิด" เพราะนั่นคือการยืนยันให้คนโจมตีรู้ว่า
   * อีเมลไหนมีบัญชีอยู่จริง
   */
  async authorize(credentials) {
    const parsed = loginSchema.safeParse(credentials);
    if (!parsed.success) return null;

    const { password } = parsed.data;
    const email = parsed.data.email.toLowerCase();

    /**
     * นับ 2 แกนพร้อมกัน เพราะกันคนละแบบ:
     *   - ต่อ IP  → กันคนเดียวไล่เดารหัสผ่านของหลาย ๆ บัญชี
     *   - ต่ออีเมล → กันการระดมยิงจากหลาย IP มาที่บัญชีเดียว (credential stuffing)
     *
     * เกินโควตาแล้วคืน null เหมือนกรณีรหัสผ่านผิดทุกประการ
     * ไม่บอกว่า "ถูกจำกัดชั่วคราว" เพราะนั่นคือการยืนยันว่ามีคนสนใจบัญชีนี้อยู่
     * (ข้อความที่อ่านเข้าใจง่ายกว่าแสดงที่หน้าฟอร์มแทน ดู loginAction)
     */
    const ip = await getClientIp();
    const byIp = rateLimit(`login:ip:${ip}`, LOGIN_MAX_PER_IP, LOGIN_WINDOW_MS);
    const byEmail = rateLimit(`login:email:${email}`, LOGIN_MAX_PER_EMAIL, LOGIN_WINDOW_MS);
    if (!byIp.allowed || !byEmail.allowed) return null;

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, role: true, passwordHash: true },
    });

    /**
     * เทียบรหัสผ่านเสมอ แม้จะรู้อยู่แล้วว่าไม่มีผู้ใช้คนนี้ (ดูคำอธิบาย DUMMY_PASSWORD_HASH)
     *
     * `?? DUMMY_PASSWORD_HASH` ครอบ **สองกรณี** ที่ต่างกันโดยสิ้นเชิง:
     *   1. ไม่มีผู้ใช้อีเมลนี้เลย → กัน timing attack
     *   2. **มีผู้ใช้แต่ `passwordHash` เป็น null** → คือคนที่สมัครผ่าน Google เท่านั้น
     *      ยังไม่เคยตั้งรหัสผ่าน จึงต้องล็อกอินด้วยรหัสผ่านไม่ได้
     *
     * กรณีที่ 2 สำคัญมากและมองข้ามง่าย: ถ้าเขียนเป็น `if (user.passwordHash === null) ผ่าน`
     * หรือเทียบกับ null แล้วได้ผลลัพธ์เป็นจริง ใครรู้อีเมลของคนที่สมัครผ่าน Google
     * ก็เข้าบัญชีนั้นได้โดยไม่ต้องใส่รหัสผ่านเลย
     *
     * แฮชหลอกไม่ตรงกับรหัสผ่านอะไรเลย ทั้งสองกรณีจึงตกที่ `return null` เหมือนกัน
     */
    const passwordMatches = await compare(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

    if (!user || !passwordMatches) return null;

    // ค่าที่ return ตรงนี้จะถูกส่งต่อไปที่ callback jwt() ผ่านพารามิเตอร์ `user`
    // ห้ามใส่ passwordHash เด็ดขาด เพราะจะไหลไปอยู่ใน token
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  },
});

function buildProviders(): Provider[] {
  const providers: Provider[] = [credentialsProvider];

  if (isGoogleEnabled) {
    providers.push(
      Google({
        clientId: process.env.AUTH_GOOGLE_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET,
        /**
         * ขอข้อมูลเท่าที่จำเป็นจริง ๆ เท่านั้น
         * ยิ่งขอ scope มาก ผู้ใช้ยิ่งลังเลตอนกดอนุญาต และเราก็ยิ่งถือข้อมูลที่ไม่ได้ใช้
         */
        authorization: { params: { scope: "openid email profile" } },
      })
    );
  }

  return providers;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  /**
   * ใช้ JWT ไม่ใช่ database session
   * เหตุผลทางเทคนิค: Auth.js รองรับ Credentials provider เฉพาะกับ strategy นี้
   * ผลที่ตามมาที่ต้องรู้: ข้อมูลใน token จะไม่อัปเดตจนกว่าจะ login ใหม่
   * เช่นถ้าเปลี่ยน role ของผู้ใช้ใน DB token เดิมยังถือ role เก่าอยู่
   * → งานที่อ่อนไหวจริง ๆ ต้องเช็ค role จาก DB ซ้ำ (ดู requireUser ใน src/lib/dal.ts)
   */
  session: { strategy: "jwt" },

  // ให้ Auth.js พาไปหน้า login ของเราเอง แทนหน้า default ของ library
  pages: { signIn: "/login" },

  providers: buildProviders(),


  callbacks: {
    /**
     * จับคู่บัญชี Google กับผู้ใช้ในระบบเรา — จุดที่ยากที่สุดของการทำ OAuth
     *
     * เราไม่ได้ใช้ database adapter ของ Auth.js (เพราะ Credentials ต้องใช้ JWT session)
     * จึงต้องเขียนขั้นตอนนี้เอง มี 3 กรณีที่ต้องแยกให้ออก:
     *
     * 1. เคยล็อกอินด้วย Google มาก่อน → เจอใน OAuthAccount → ใช้ผู้ใช้เดิม
     * 2. ยังไม่เคย แต่มีบัญชีอีเมลเดียวกันอยู่แล้ว → **ผูกเข้ากับบัญชีเดิม**
     *    ถ้าไม่ทำ ผู้ใช้จะได้บัญชีที่สองที่อีเมลซ้ำกัน ซึ่ง unique constraint จะปฏิเสธ
     *    แล้วเขาจะล็อกอินไม่ได้เลยโดยไม่รู้สาเหตุ
     * 3. ไม่เคยมีเลย → สร้างผู้ใช้ใหม่ (ไม่มีรหัสผ่าน, role เริ่มต้นเป็นผู้สมัครงาน)
     *
     * ⚠️ กรณีที่ 2 ปลอดภัยเพราะ **เชื่อได้ว่า Google ยืนยันอีเมลแล้ว**
     * ถ้าเป็น provider ที่ไม่ยืนยันอีเมล การผูกอัตโนมัติจะกลายเป็นช่องยึดบัญชี:
     * คนร้ายสมัคร provider นั้นด้วยอีเมลของเหยื่อ แล้วเข้าบัญชีเหยื่อได้เลย
     * จึงเช็ค `email_verified` ก่อนทุกครั้ง
     */
    async signIn({ user, account, profile }) {
      // Credentials ตรวจไปแล้วใน authorize() ไม่ต้องทำอะไรเพิ่ม
      if (account?.provider !== "google") return true;

      const email = user.email?.toLowerCase();
      if (!email) return false;

      // Google ส่งฟิลด์นี้มาบอกว่าอีเมลถูกยืนยันแล้วหรือยัง
      if (profile?.email_verified === false) return false;

      const existingLink = await prisma.oAuthAccount.findUnique({
        where: {
          provider_providerAccountId: {
            provider: "google",
            providerAccountId: account.providerAccountId,
          },
        },
        select: { userId: true },
      });

      if (existingLink) {
        user.id = existingLink.userId;
        return true;
      }

      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (existingUser) {
        // กรณีที่ 2 — ผูกบัญชี Google เข้ากับผู้ใช้เดิมที่อีเมลตรงกัน
        await prisma.oAuthAccount.create({
          data: {
            userId: existingUser.id,
            provider: "google",
            providerAccountId: account.providerAccountId,
          },
        });
        user.id = existingUser.id;
        return true;
      }

      // กรณีที่ 3 — ผู้ใช้ใหม่ สร้างพร้อมผูกบัญชีในคราวเดียว (nested create = อยู่ใน transaction เดียว)
      const created = await prisma.user.create({
        data: {
          email,
          name: user.name ?? email.split("@")[0],
          // ไม่มีรหัสผ่าน — ล็อกอินด้วยรหัสผ่านจะไม่ผ่าน (ดูคำอธิบายใน authorize)
          passwordHash: null,
          oauthAccounts: {
            create: { provider: "google", providerAccountId: account.providerAccountId },
          },
        },
        select: { id: true },
      });

      user.id = created.id;
      return true;
    },

    /**
     * ทำงานตอนสร้าง/รีเฟรช token
     * `user` จะมีค่าเฉพาะครั้งแรกที่ล็อกอินสำเร็จเท่านั้น ครั้งต่อ ๆ ไปเป็น undefined
     * เลยต้องยัด id/role ใส่ token ตอนนั้น ไม่งั้นข้อมูลจะหายไปตั้งแต่ request ถัดไป
     */
    async jwt({ token, user }) {
      // เช็ค user.id ด้วย เพราะ type ของ Auth.js ประกาศ id เป็น optional
      // (รองรับ provider แบบอื่นที่อาจไม่มี id) แม้ authorize ของเราจะใส่ให้เสมอก็ตาม
      if (!user?.id) return token;

      token.id = user.id;

      /**
       * `user.role` มีค่าเฉพาะตอนล็อกอินด้วย Credentials เพราะ authorize() ของเราใส่ให้
       *
       * ตอนล็อกอินด้วย Google ค่านี้เป็น undefined — Auth.js ประกอบ user object
       * จากข้อมูลที่ Google ส่งมา ซึ่งไม่มีทางรู้จัก role ในระบบของเรา
       * ถ้าปล่อยไป `session.user.role` จะเป็น undefined แล้ว requireRole() จะไม่ผ่านทุกกรณี
       * → ผู้ใช้ที่ล็อกอินด้วย Google จะเข้าหน้าอะไรไม่ได้เลย
       *
       * จึงต้องอ่านจาก DB เอง (เกิดครั้งเดียวตอนล็อกอิน ไม่ใช่ทุก request)
       */
      if (user.role) {
        token.role = user.role;
      } else {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        if (dbUser) token.role = dbUser.role;
      }

      return token;
    },

    /** ย้ายค่าจาก token มาไว้ใน session ที่โค้ดฝั่งเราเรียกใช้ */
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
});
