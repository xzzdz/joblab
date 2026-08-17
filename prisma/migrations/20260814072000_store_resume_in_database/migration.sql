-- ย้ายที่เก็บไฟล์ resume จากดิสก์มาไว้ในฐานข้อมูล
--
-- เหตุผล: Vercel รันบน serverless ที่ filesystem หายทุกครั้งที่ deploy
-- และไม่แชร์กันระหว่าง instance ไฟล์ที่เก็บลงดิสก์จึงหายไปเฉย ๆ
--
-- ⚠️ migration นี้ลบคอลัมน์ "resumeKey" ทิ้ง ซึ่งเคยเก็บชื่อไฟล์บนดิสก์
-- ใบสมัครที่มีอยู่เดิมจะไม่มีไฟล์ผูกอยู่ ต้องรัน `npm run db:seed` ใหม่เพื่อสร้างข้อมูลตัวอย่าง
-- ทำได้เพราะตาราง Application ยังไม่เคยขึ้น production — ถ้าเคยขึ้นแล้วต้องเขียนสคริปต์
-- ย้ายไฟล์จากดิสก์เข้า DB ก่อน แล้วค่อยลบคอลัมน์ในอีก migration หนึ่ง

-- AlterTable
ALTER TABLE "Application" DROP COLUMN "resumeKey";

-- CreateTable
CREATE TABLE "ResumeFile" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResumeFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResumeFile_applicationId_key" ON "ResumeFile"("applicationId");

-- AddForeignKey
ALTER TABLE "ResumeFile" ADD CONSTRAINT "ResumeFile_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
