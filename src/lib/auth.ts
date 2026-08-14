import { compare } from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation/auth";

/**
 * แฮชหลอกสำหรับกรณี "ไม่พบอีเมลนี้ในระบบ"
 *
 * ทำไมต้องมี: ถ้าเจอผู้ใช้เราจะเสียเวลา ~100ms ไปกับ bcrypt.compare
 * แต่ถ้าไม่เจอแล้ว return null ทันที จะใช้เวลาแค่ ~5ms
 * คนโจมตีจับเวลาตอบกลับก็รู้ได้ว่าอีเมลไหนมีบัญชีอยู่จริง (timing attack)
 * เลยบังคับให้เส้นทาง "ไม่เจอ" เสียเวลาพอ ๆ กัน
 */
const DUMMY_PASSWORD_HASH = "$2b$10$wAslZsRTtQbGYC1fH2M/8eE5q5LCL8YQAdstBfBCqo1OXCRYT2sKC";

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

  providers: [
    Credentials({
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

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          select: { id: true, email: true, name: true, role: true, passwordHash: true },
        });

        // เทียบรหัสผ่านเสมอ แม้จะรู้อยู่แล้วว่าไม่มีผู้ใช้คนนี้ (ดูคำอธิบาย DUMMY_PASSWORD_HASH)
        const passwordMatches = await compare(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

        if (!user || !passwordMatches) return null;

        // ค่าที่ return ตรงนี้จะถูกส่งต่อไปที่ callback jwt() ผ่านพารามิเตอร์ `user`
        // ห้ามใส่ passwordHash เด็ดขาด เพราะจะไหลไปอยู่ใน token
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],

  callbacks: {
    /**
     * ทำงานตอนสร้าง/รีเฟรช token
     * `user` จะมีค่าเฉพาะครั้งแรกที่ล็อกอินสำเร็จเท่านั้น ครั้งต่อ ๆ ไปเป็น undefined
     * เลยต้องยัด id/role ใส่ token ตอนนั้น ไม่งั้นข้อมูลจะหายไปตั้งแต่ request ถัดไป
     */
    jwt({ token, user }) {
      // เช็ค user.id ด้วย เพราะ type ของ Auth.js ประกาศ id เป็น optional
      // (รองรับ provider แบบอื่นที่อาจไม่มี id) แม้ authorize ของเราจะใส่ให้เสมอก็ตาม
      if (user?.id) {
        token.id = user.id;
        token.role = user.role;
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
