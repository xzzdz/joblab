"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { UserRole } from "@/generated/prisma/enums";
import { requireRole } from "@/lib/dal";
import type { FormState } from "@/lib/form-state";
import { prisma } from "@/lib/prisma";
import { generateUniqueCompanySlug } from "@/lib/slug";
import { companyProfileSchema } from "@/lib/validation/job";

/**
 * บันทึกข้อมูลบริษัทของผู้ใช้ที่ล็อกอินอยู่
 *
 * ไม่รับ companyId จากฟอร์ม — หาบริษัทจาก `ownerId` ของผู้ใช้เท่านั้น
 * เพราะถ้ารับ id จาก client ใครก็ส่ง id ของบริษัทอื่นเข้ามาแก้ได้
 * หลักการ: **ข้อมูลที่ตัดสินเรื่องสิทธิ์ต้องมาจาก session ไม่ใช่จากฟอร์ม**
 */
export async function saveCompanyProfile(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireRole(UserRole.EMPLOYER);

  const parsed = companyProfileSchema.safeParse({
    name: formData.get("name"),
    website: formData.get("website"),
    logoUrl: formData.get("logoUrl"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const existing = await prisma.company.findUnique({
    where: { ownerId: user.id },
    select: { id: true, slug: true },
  });

  try {
    if (existing) {
      await prisma.company.update({
        // where เป็น ownerId ไม่ใช่ id ที่ส่งมาจากฟอร์ม → แก้ได้แค่บริษัทของตัวเอง
        where: { ownerId: user.id },
        data: parsed.data,
      });
      // ตั้งใจไม่เปลี่ยน slug ตอนเปลี่ยนชื่อบริษัท
      // เพราะ slug อยู่ใน URL ที่คนอาจแชร์หรือ bookmark ไว้แล้ว การเปลี่ยนทำให้ลิงก์เดิมพัง
    } else {
      await prisma.company.create({
        data: {
          ...parsed.data,
          slug: await generateUniqueCompanySlug(parsed.data.name),
          ownerId: user.id,
        },
      });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { message: "ชื่อหรือลิงก์นี้ถูกใช้ไปแล้ว ลองเปลี่ยนแล้วบันทึกอีกครั้ง" };
    }
    throw error;
  }

  // บอก Next ว่าข้อมูลที่หน้าพวกนี้ใช้เปลี่ยนแล้ว ให้สร้าง HTML ใหม่รอบหน้า
  revalidatePath("/employer");
  revalidatePath("/jobs");

  return { success: "บันทึกข้อมูลบริษัทแล้ว" };
}
