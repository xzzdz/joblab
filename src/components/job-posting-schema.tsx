import { JobType, WorkMode } from "@/generated/prisma/enums";
import type { JobDetail } from "@/lib/jobs";
import { SITE_NAME, absoluteUrl } from "@/lib/site";

/**
 * structured data ของประกาศงานตามมาตรฐาน schema.org/JobPosting
 *
 * **ทำไมเว็บหางานต้องมีอันนี้:**
 * Google มีหน้าค้นหางานแยก (Google Jobs) ซึ่งดึงข้อมูลจาก JSON-LD ก้อนนี้เท่านั้น
 * ไม่ได้อ่านจาก HTML ปกติ ถ้าไม่มี ประกาศจะไม่โผล่ในนั้นเลย
 * — สำหรับเว็บประกาศงาน ช่องทางนี้คือแหล่งผู้เข้าชมที่ใหญ่ที่สุด
 *
 * เป็น Server Component ล้วน ไม่มี JavaScript ส่งไปฝั่ง browser
 */

/** แปลง enum ของเราเป็นค่าที่ schema.org กำหนด — ชื่อไม่ตรงกันทุกตัว */
const EMPLOYMENT_TYPE: Record<JobType, string> = {
  FULL_TIME: "FULL_TIME",
  PART_TIME: "PART_TIME",
  CONTRACT: "CONTRACTOR", // schema.org ใช้คำว่า CONTRACTOR ไม่ใช่ CONTRACT
  INTERNSHIP: "INTERN", // และใช้ INTERN ไม่ใช่ INTERNSHIP
};

export function JobPostingSchema({ job }: { job: JobDetail }) {
  /**
   * `validThrough` — วันหมดอายุของประกาศ
   *
   * Google ซ่อนประกาศที่เลยวันนี้ออกจากผลค้นหาอัตโนมัติ ซึ่งเป็นเรื่องดี:
   * ประกาศที่ปิดรับไปแล้วแต่ยังโผล่อยู่ทำให้คนเสียเวลาสมัครเก้อ
   *
   * schema ของเราไม่มีฟิลด์วันหมดอายุ จึงประมาณเป็น 60 วันหลังเผยแพร่
   * (ถ้าวันหลังเพิ่มฟิลด์ `expiresAt` ใน schema.prisma ให้เปลี่ยนมาใช้ค่าจริง)
   */
  const publishedAt = job.publishedAt ?? job.createdAt;
  const validThrough = new Date(publishedAt);
  validThrough.setDate(validThrough.getDate() + 60);

  const data = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    datePosted: publishedAt.toISOString(),
    validThrough: validThrough.toISOString(),
    employmentType: EMPLOYMENT_TYPE[job.type],
    directApply: true,

    hiringOrganization: {
      "@type": "Organization",
      name: job.company.name,
      ...(job.company.website ? { sameAs: job.company.website } : {}),
    },

    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.location,
        addressCountry: "TH",
      },
    },

    // ทำงานทางไกลต้องประกาศแยก ไม่งั้น Google จะแสดงเฉพาะกับคนที่ค้นในจังหวัดนั้น
    ...(job.workMode === WorkMode.REMOTE ? { jobLocationType: "TELECOMMUTE" } : {}),

    // ใส่เงินเดือนเฉพาะตอนที่มีข้อมูลจริง — เดาค่าใส่แย่กว่าไม่ใส่
    ...(job.salaryMin !== null || job.salaryMax !== null
      ? {
          baseSalary: {
            "@type": "MonetaryAmount",
            currency: "THB",
            value: {
              "@type": "QuantitativeValue",
              ...(job.salaryMin !== null ? { minValue: job.salaryMin } : {}),
              ...(job.salaryMax !== null ? { maxValue: job.salaryMax } : {}),
              unitText: "MONTH",
            },
          },
        }
      : {}),

    identifier: {
      "@type": "PropertyValue",
      name: SITE_NAME,
      value: job.slug,
    },
    url: absoluteUrl(`/jobs/${job.slug}`),
  };

  return (
    <script
      type="application/ld+json"
      // JSON.stringify ไม่ escape `<` ให้ ถ้าในรายละเอียดงานมีข้อความว่า `</script>`
      // เบราว์เซอร์จะคิดว่า script จบตรงนั้น แล้วเนื้อหาที่เหลือกลายเป็น HTML ที่รันได้ (ช่องโหว่ XSS)
      // แทน `<` ด้วย escape sequence ของ JSON ซึ่งมีความหมายเดียวกันแต่เบราว์เซอร์ไม่ตีความเป็นแท็ก
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
