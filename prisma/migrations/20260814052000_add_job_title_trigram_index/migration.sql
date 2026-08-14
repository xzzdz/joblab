-- เปิด extension pg_trgm ก่อน เพราะ index ข้างล่างต้องใช้ตัวดำเนินการ gin_trgm_ops จากมัน
-- Prisma สร้างบรรทัดนี้ให้เองไม่ได้ (การเปิด extension ไม่ได้อยู่ใน schema.prisma) จึงเขียนเพิ่มมือ
--
-- IF NOT EXISTS ทำให้รันซ้ำได้ และไม่พังถ้า extension ถูกเปิดไว้อยู่แล้ว
-- หมายเหตุตอน deploy ขึ้น production: การ CREATE EXTENSION ต้องใช้สิทธิ์ระดับสูง
-- ผู้ให้บริการอย่าง Neon เปิด pg_trgm ให้ใช้ได้อยู่แล้ว แต่บางเจ้าอาจต้องขอเปิดก่อน
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateIndex
CREATE INDEX "Job_title_idx" ON "Job" USING GIN ("title" gin_trgm_ops);
