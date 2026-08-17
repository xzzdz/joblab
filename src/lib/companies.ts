import { JobStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

/**
 * Query ของหน้าโปรไฟล์บริษัท (ฝั่งสาธารณะ)
 *
 * เงื่อนไขสำคัญ: บริษัทจะมีหน้าโปรไฟล์ให้คนนอกเห็น **เฉพาะเมื่อมีประกาศที่เผยแพร่อยู่**
 * ไม่ใช่แค่กรองประกาศให้เหลือ PUBLISHED แล้วโชว์หน้าเปล่า ๆ
 *
 * เหตุผล: บริษัทที่ยังร่างประกาศอยู่ยังไม่ได้ตัดสินใจเปิดตัว
 * การมีหน้าโปรไฟล์ที่ค้นเจอได้เท่ากับเปิดเผยว่า "บริษัทนี้กำลังจะรับคน" ก่อนที่เขาจะพร้อม
 */
export async function getPublicCompanyBySlug(slug: string) {
  return prisma.company.findFirst({
    where: {
      slug,
      // `some` = ต้องมีประกาศอย่างน้อยหนึ่งอันที่ตรงเงื่อนไข
      jobs: { some: { status: JobStatus.PUBLISHED } },
    },
    select: {
      name: true,
      slug: true,
      website: true,
      description: true,
      jobs: {
        where: { status: JobStatus.PUBLISHED },
        orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          slug: true,
          title: true,
          location: true,
          workMode: true,
          type: true,
          salaryMin: true,
          salaryMax: true,
          publishedAt: true,
          company: { select: { name: true, slug: true } },
        },
      },
    },
  });
}

export type PublicCompany = NonNullable<Awaited<ReturnType<typeof getPublicCompanyBySlug>>>;
