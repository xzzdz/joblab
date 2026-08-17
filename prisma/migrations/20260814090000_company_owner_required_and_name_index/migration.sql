-- ขั้นที่ 3 ของการเพิ่มคอลัมน์แบบไม่ทำข้อมูลเดิมพัง:
--   ขั้น 1 เพิ่มเป็น nullable (migration 20260814034500)
--   ขั้น 2 backfill ให้ทุกแถวมีค่า (ผ่าน prisma/seed.ts)
--   ขั้น 3 บังคับเป็น NOT NULL  ← migration นี้
--
-- ตรวจก่อนรันแล้วว่าไม่มีแถวไหนเป็น NULL:
--   SELECT count(*) FILTER (WHERE "ownerId" IS NULL) FROM "Company";  → 0
--
-- ถ้ายังมีแถวที่เป็น NULL คำสั่งข้างล่างจะล้มทั้ง migration (ซึ่งเป็นสิ่งที่ถูกต้อง —
-- ดีกว่าปล่อยให้ schema กับข้อมูลจริงไม่ตรงกัน)
-- AlterTable
ALTER TABLE "Company" ALTER COLUMN "ownerId" SET NOT NULL;

-- Index สำหรับค้นหาชื่อบริษัทแบบกลางคำ (ใช้ extension pg_trgm ที่เปิดไว้แล้วใน migration ก่อนหน้า)
-- CreateIndex
CREATE INDEX "Company_name_idx" ON "Company" USING GIN ("name" gin_trgm_ops);
