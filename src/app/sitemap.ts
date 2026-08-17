import type { MetadataRoute } from "next";

import { getSitemapEntries } from "@/lib/jobs";
import { absoluteUrl } from "@/lib/site";

/**
 * ไฟล์นี้ทำให้ Next สร้าง `/sitemap.xml` ให้อัตโนมัติ
 *
 * ทำไมเว็บประกาศงานต้องมี: search engine หาหน้าใหม่ด้วยการเดินตามลิงก์
 * ประกาศที่อยู่หน้า 3 ของผลค้นหาอาจไม่มีลิงก์ไหนชี้ถึงเลย → ไม่ถูกเก็บเข้า index
 * sitemap คือการยื่นรายการหน้าทั้งหมดให้ตรง ๆ ไม่ต้องรอให้เดินมาเจอ
 *
 * `lastModified` สำคัญกว่าที่คิด — bot ใช้ค่านี้ตัดสินว่าควรกลับมาดูหน้าไหนซ้ำ
 * ถ้าใส่ `new Date()` ให้ทุกหน้าเหมือนกันหมด เท่ากับบอกว่า "ทุกหน้าเพิ่งแก้"
 * ซึ่งทำให้ค่านี้ไม่มีความหมายและ bot จะเลิกเชื่อ
 *
 * หมายเหตุ: ที่นี่ไม่ต้องกรอง `status = PUBLISHED` เอง เพราะ query ทำให้แล้ว
 * — ถ้าเผลอใส่ประกาศ DRAFT ลง sitemap เท่ากับประกาศให้ Google ไปเก็บหน้าที่ตอบ 404
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { jobs, companies } = await getSitemapEntries();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/jobs"),
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
  ];

  const jobPages: MetadataRoute.Sitemap = jobs.map((job) => ({
    url: absoluteUrl(`/jobs/${job.slug}`),
    lastModified: job.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const companyPages: MetadataRoute.Sitemap = companies.map((company) => ({
    url: absoluteUrl(`/companies/${company.slug}`),
    lastModified: company.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticPages, ...jobPages, ...companyPages];
}
