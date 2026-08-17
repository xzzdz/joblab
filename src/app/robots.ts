import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

/**
 * ไฟล์นี้ทำให้ Next สร้าง `/robots.txt` ให้อัตโนมัติ
 *
 * หน้าที่ของมันคือบอก bot ของ search engine ว่าหน้าไหนควรเก็บ หน้าไหนไม่ควร
 *
 * ⚠️ **robots.txt ไม่ใช่ระบบความปลอดภัย** — มันเป็นแค่ "คำขอ" ที่ bot ที่มีมารยาทจะทำตาม
 * ใครก็เปิด /robots.txt อ่านได้ และ bot ที่ไม่สนใจกฎก็เข้าไปได้อยู่ดี
 * สิ่งที่กันการเข้าถึงจริงคือ `requireUser()` / `requireRole()` ใน src/lib/dal.ts
 *
 * ที่ใส่ disallow ไว้เพราะเหตุผลอื่น: หน้าพวกนี้ต้องล็อกอินอยู่แล้ว
 * ปล่อยให้ bot ไล่คลานก็ได้แต่หน้า redirect เปล่า ๆ เปลืองโควตาการคลาน
 * (crawl budget) ที่ควรเอาไปใช้กับหน้าประกาศงานซึ่งเป็นเนื้อหาจริง
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/", // รวม /api/resumes ที่เป็นข้อมูลส่วนบุคคล
        "/account",
        "/applications",
        "/employer",
        "/login",
        "/register",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
