import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

import { PrismaClient } from "../src/generated/prisma/client";
import { JobStatus, JobType, UserRole, WorkMode } from "../src/generated/prisma/enums";

// สคริปต์นี้รันด้วย tsx (นอก Next.js) เลยต้องสร้าง client เอง ไม่ใช้ singleton ใน src/lib/prisma.ts
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("ไม่พบ DATABASE_URL");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

type SeedJob = {
  slug: string;
  title: string;
  description: string;
  location: string;
  workMode: WorkMode;
  type: JobType;
  salaryMin: number | null;
  salaryMax: number | null;
  status: JobStatus;
  daysAgo: number; // ใช้คำนวณ publishedAt ให้ข้อมูลดูมีอายุต่างกัน
};

type SeedCompany = {
  slug: string;
  name: string;
  website: string;
  description: string;
  ownerEmail: string; // อีเมลของผู้ใช้ role EMPLOYER ที่เป็นเจ้าของบริษัทนี้
  ownerName: string;
  jobs: SeedJob[];
};

/**
 * รหัสผ่านของบัญชีตัวอย่างทั้งหมด
 * เขียนไว้ตรง ๆ ได้เพราะเป็นข้อมูล dev เท่านั้น ไม่มีทางถูกใช้บน production
 * (ไฟล์ seed ไม่เคยถูกรันตอน deploy จริง)
 */
const DEMO_PASSWORD = "Password123!";

const companies: SeedCompany[] = [
  {
    slug: "siam-digital",
    name: "Siam Digital",
    website: "https://siamdigital.example.com",
    description:
      "บริษัทรับพัฒนาซอฟต์แวร์ให้องค์กรขนาดกลาง เน้นงานฝั่งเว็บและระบบหลังบ้าน ทีมประมาณ 40 คน",
    ownerEmail: "employer@joblab.dev", // บัญชีตัวอย่างสำหรับล็อกอินทดสอบฝั่งบริษัท
    ownerName: "ปิยะพงษ์ ศรีสุข",
    jobs: [
      {
        slug: "frontend-developer-react-siam-digital",
        title: "Frontend Developer (React)",
        description:
          "ดูแลการพัฒนา UI ของระบบ dashboard ให้ลูกค้าองค์กร ทำงานร่วมกับดีไซเนอร์และ backend อย่างใกล้ชิด\n\nสิ่งที่ต้องมี:\n- ประสบการณ์ React 1 ปีขึ้นไป (เด็กจบใหม่ที่มีผลงานพิจารณาเป็นพิเศษ)\n- เข้าใจ TypeScript ระดับใช้งานได้\n- อ่าน design จาก Figma แล้วทำออกมาได้ตรง\n\nถ้ามีจะดีมาก:\n- เคยใช้ Next.js App Router\n- เคยเขียน test ด้วย Vitest หรือ Playwright",
        location: "กรุงเทพฯ (อโศก)",
        workMode: WorkMode.HYBRID,
        type: JobType.FULL_TIME,
        salaryMin: 45000,
        salaryMax: 70000,
        status: JobStatus.PUBLISHED,
        daysAgo: 2,
      },
      {
        slug: "backend-developer-nodejs-siam-digital",
        title: "Backend Developer (Node.js)",
        description:
          "ออกแบบและพัฒนา REST API รองรับผู้ใช้หลักหมื่นคนต่อวัน ดูแลตั้งแต่ schema ฐานข้อมูลจนถึง deploy\n\nสิ่งที่ต้องมี:\n- Node.js + TypeScript 2 ปีขึ้นไป\n- เขียน SQL ได้ เข้าใจเรื่อง index และ transaction\n- เคยใช้ Docker ในงานจริง",
        location: "กรุงเทพฯ (อโศก)",
        workMode: WorkMode.HYBRID,
        type: JobType.FULL_TIME,
        salaryMin: 60000,
        salaryMax: 95000,
        status: JobStatus.PUBLISHED,
        daysAgo: 5,
      },
      {
        slug: "qa-engineer-siam-digital",
        title: "QA Engineer",
        description:
          "วางแผนการทดสอบและเขียน automated test ให้ระบบที่ทีมพัฒนา ทำงานร่วมกับ dev ตั้งแต่ต้น sprint",
        location: "กรุงเทพฯ (อโศก)",
        workMode: WorkMode.ONSITE,
        type: JobType.FULL_TIME,
        salaryMin: 35000,
        salaryMax: 55000,
        status: JobStatus.CLOSED,
        daysAgo: 60,
      },
    ],
  },
  {
    slug: "lanna-commerce",
    name: "Lanna Commerce",
    website: "https://lannacommerce.example.com",
    description:
      "แพลตฟอร์มอีคอมเมิร์ซสำหรับร้านค้าท้องถิ่นภาคเหนือ ทีมเล็ก ทำงานแบบ remote เป็นหลัก",
    ownerEmail: "owner@lannacommerce.example.com",
    ownerName: "นภัสสร วงศ์คำ",
    jobs: [
      {
        slug: "fullstack-developer-lanna-commerce",
        title: "Fullstack Developer",
        description:
          "ทำฟีเจอร์ตั้งแต่หน้าบ้านถึงหลังบ้านของระบบร้านค้า ตั้งแต่ตะกร้าสินค้า ระบบชำระเงิน จนถึงรายงานยอดขาย\n\nเราเป็นทีมเล็ก คุณจะได้ตัดสินใจเรื่องเทคนิคเองเยอะ และเห็นผลงานถึงมือผู้ใช้เร็ว",
        location: "เชียงใหม่",
        workMode: WorkMode.REMOTE,
        type: JobType.FULL_TIME,
        salaryMin: 50000,
        salaryMax: 80000,
        status: JobStatus.PUBLISHED,
        daysAgo: 1,
      },
      {
        slug: "ui-ux-designer-lanna-commerce",
        title: "UI/UX Designer",
        description:
          "ออกแบบประสบการณ์การซื้อขายบนมือถือให้ร้านค้าที่ไม่คุ้นเทคโนโลยีใช้งานได้จริง ทำ user research ร่วมกับทีม",
        location: "เชียงใหม่",
        workMode: WorkMode.REMOTE,
        type: JobType.FULL_TIME,
        salaryMin: 40000,
        salaryMax: 65000,
        status: JobStatus.PUBLISHED,
        daysAgo: 9,
      },
      {
        slug: "frontend-intern-lanna-commerce",
        title: "Frontend Developer Intern",
        description:
          "ฝึกงาน 4 เดือน ได้ลงมือทำฟีเจอร์จริงบน production ไม่ใช่แค่โปรเจคจำลอง มีพี่เลี้ยงประกบ",
        location: "เชียงใหม่",
        workMode: WorkMode.HYBRID,
        type: JobType.INTERNSHIP,
        salaryMin: 12000,
        salaryMax: null,
        status: JobStatus.PUBLISHED,
        daysAgo: 14,
      },
    ],
  },
  {
    slug: "andaman-fintech",
    name: "Andaman Fintech",
    website: "https://andamanfintech.example.com",
    description:
      "สตาร์ทอัพด้านการเงิน ให้บริการระบบผ่อนชำระสำหรับธุรกิจ SME ผ่านการตรวจสอบมาตรฐาน ISO 27001",
    ownerEmail: "owner@andamanfintech.example.com",
    ownerName: "ธนกฤต ชัยวัฒน์",
    jobs: [
      {
        slug: "senior-frontend-engineer-andaman-fintech",
        title: "Senior Frontend Engineer",
        description:
          "นำทีมหน้าบ้าน 3 คน วางมาตรฐานโค้ดและ design system ของบริษัท รับผิดชอบเรื่อง performance และ accessibility\n\nสิ่งที่ต้องมี:\n- ประสบการณ์ frontend 5 ปีขึ้นไป\n- เคยวาง architecture ของ codebase ขนาดกลางขึ้นไป\n- สื่อสารกับ stakeholder ที่ไม่ใช่สายเทคนิคได้",
        location: "กรุงเทพฯ (สาทร)",
        workMode: WorkMode.HYBRID,
        type: JobType.FULL_TIME,
        salaryMin: 110000,
        salaryMax: 160000,
        status: JobStatus.PUBLISHED,
        daysAgo: 3,
      },
      {
        slug: "devops-engineer-andaman-fintech",
        title: "DevOps Engineer",
        description:
          "ดูแล CI/CD, infrastructure บน AWS และ observability ของระบบที่ต้องมี uptime 99.9%",
        location: "กรุงเทพฯ (สาทร)",
        workMode: WorkMode.ONSITE,
        type: JobType.FULL_TIME,
        salaryMin: 90000,
        salaryMax: 140000,
        status: JobStatus.PUBLISHED,
        daysAgo: 7,
      },
      {
        slug: "security-analyst-andaman-fintech",
        title: "Security Analyst (Contract)",
        description:
          "สัญญาจ้าง 6 เดือน ทำ security assessment ให้ระบบหลักของบริษัท และช่วยเตรียมเอกสารสำหรับ audit",
        location: "กรุงเทพฯ (สาทร)",
        workMode: WorkMode.REMOTE,
        type: JobType.CONTRACT,
        salaryMin: 80000,
        salaryMax: 120000,
        status: JobStatus.PUBLISHED,
        daysAgo: 20,
      },
    ],
  },
  {
    slug: "isan-agritech",
    name: "Isan AgriTech",
    website: "https://isanagritech.example.com",
    description:
      "นำ IoT และข้อมูลดาวเทียมมาช่วยเกษตรกรวางแผนเพาะปลูก ทำงานร่วมกับสหกรณ์ในภาคอีสาน",
    ownerEmail: "owner@isanagritech.example.com",
    ownerName: "อารยา ภูมิใจ",
    jobs: [
      {
        slug: "data-engineer-isan-agritech",
        title: "Data Engineer",
        description:
          "สร้าง data pipeline รับข้อมูลจากเซนเซอร์ในแปลงเกษตรกว่า 2,000 จุด และเตรียมข้อมูลให้ทีม data science",
        location: "ขอนแก่น",
        workMode: WorkMode.HYBRID,
        type: JobType.FULL_TIME,
        salaryMin: 55000,
        salaryMax: 85000,
        status: JobStatus.PUBLISHED,
        daysAgo: 11,
      },
      {
        slug: "mobile-developer-flutter-isan-agritech",
        title: "Mobile Developer (Flutter)",
        description:
          "พัฒนาแอปสำหรับเกษตรกร ต้องออกแบบให้ใช้งานง่ายบนเครื่องสเปกต่ำและสัญญาณอินเทอร์เน็ตไม่เสถียร",
        location: "ขอนแก่น",
        workMode: WorkMode.ONSITE,
        type: JobType.FULL_TIME,
        salaryMin: 45000,
        salaryMax: 70000,
        status: JobStatus.PUBLISHED,
        daysAgo: 25,
      },
      {
        slug: "product-manager-isan-agritech",
        title: "Product Manager",
        description:
          "ยังเขียนรายละเอียดไม่เสร็จ — ประกาศนี้เป็นตัวอย่างสถานะ DRAFT ที่ไม่ควรแสดงบนหน้าเว็บสาธารณะ",
        location: "ขอนแก่น",
        workMode: WorkMode.HYBRID,
        type: JobType.FULL_TIME,
        salaryMin: null,
        salaryMax: null,
        status: JobStatus.DRAFT,
        daysAgo: 0,
      },
    ],
  },
  {
    slug: "bangkok-health-cloud",
    name: "Bangkok Health Cloud",
    website: "https://bangkokhealthcloud.example.com",
    description:
      "ระบบบริหารจัดการคลินิกและเวชระเบียนอิเล็กทรอนิกส์ ใช้งานอยู่ในคลินิกกว่า 300 แห่งทั่วประเทศ",
    ownerEmail: "owner@bangkokhealthcloud.example.com",
    ownerName: "ศิริพร ทองดี",
    jobs: [
      {
        slug: "nextjs-developer-bangkok-health-cloud",
        title: "Next.js Developer",
        description:
          "พัฒนาระบบนัดหมายและเวชระเบียนบน Next.js App Router ให้บุคลากรทางการแพทย์ใช้งานได้เร็วและแม่นยำ\n\nสิ่งที่ต้องมี:\n- React + TypeScript 2 ปีขึ้นไป\n- เข้าใจความต่างระหว่าง Server Component กับ Client Component\n- ใส่ใจรายละเอียดเรื่อง form validation เพราะข้อมูลผิดพลาดกระทบคนไข้จริง",
        location: "กรุงเทพฯ (พระราม 9)",
        workMode: WorkMode.HYBRID,
        type: JobType.FULL_TIME,
        salaryMin: 65000,
        salaryMax: 100000,
        status: JobStatus.PUBLISHED,
        daysAgo: 4,
      },
      {
        slug: "technical-support-part-time-bangkok-health-cloud",
        title: "Technical Support (Part-time)",
        description:
          "ช่วยคลินิกแก้ปัญหาการใช้งานระบบผ่านโทรศัพท์และ remote desktop ทำงาน 4 ชั่วโมงต่อวัน",
        location: "กรุงเทพฯ (พระราม 9)",
        workMode: WorkMode.REMOTE,
        type: JobType.PART_TIME,
        salaryMin: 15000,
        salaryMax: 22000,
        status: JobStatus.PUBLISHED,
        daysAgo: 30,
      },
    ],
  },
];

function daysAgoToDate(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

async function main() {
  console.log("เริ่ม seed ข้อมูล...");

  // แฮชครั้งเดียวแล้วใช้ซ้ำ เพราะ bcrypt ตั้งใจออกแบบให้ช้า (นี่คือจุดแข็งของมัน)
  // ถ้าแฮชใหม่ทุกบัญชี seed จะช้าขึ้นหลายเท่าโดยไม่ได้ประโยชน์อะไรกับข้อมูลทดสอบ
  const demoPasswordHash = await hash(DEMO_PASSWORD, 10);

  // บัญชีผู้สมัครงานตัวอย่าง
  const seeker = await prisma.user.upsert({
    where: { email: "seeker@joblab.dev" },
    update: { name: "กิตติกร ใจดี", role: UserRole.SEEKER },
    create: {
      email: "seeker@joblab.dev",
      name: "กิตติกร ใจดี",
      role: UserRole.SEEKER,
      passwordHash: demoPasswordHash,
    },
  });
  console.log(`  ผู้สมัคร: ${seeker.email}`);

  for (const company of companies) {
    const { jobs, ownerEmail, ownerName, ...companyData } = company;

    // สร้างบัญชี EMPLOYER ของบริษัทนี้ก่อน เพราะ Company ต้องอ้างถึง User.id
    const owner = await prisma.user.upsert({
      where: { email: ownerEmail },
      update: { name: ownerName, role: UserRole.EMPLOYER },
      create: {
        email: ownerEmail,
        name: ownerName,
        role: UserRole.EMPLOYER,
        passwordHash: demoPasswordHash,
      },
    });

    // upsert = มีอยู่แล้วก็อัปเดต ไม่มีก็สร้าง → รัน seed ซ้ำกี่ครั้งก็ไม่พัง (idempotent)
    // การใส่ ownerId ตรงนี้คือขั้น "backfill" ของบริษัทที่ seed ไว้ตั้งแต่ Phase 1
    const savedCompany = await prisma.company.upsert({
      where: { slug: companyData.slug },
      update: { ...companyData, ownerId: owner.id },
      create: { ...companyData, ownerId: owner.id },
    });

    for (const job of jobs) {
      const { daysAgo, ...jobData } = job;

      // ประกาศที่ยังเป็น DRAFT ต้องไม่มีวันที่เผยแพร่
      const publishedAt = jobData.status === JobStatus.DRAFT ? null : daysAgoToDate(daysAgo);

      await prisma.job.upsert({
        where: { slug: jobData.slug },
        update: { ...jobData, publishedAt, companyId: savedCompany.id },
        create: { ...jobData, publishedAt, companyId: savedCompany.id },
      });
    }

    console.log(`  ${savedCompany.name}: ${jobs.length} ประกาศ (เจ้าของ ${owner.email})`);
  }

  const totalUsers = await prisma.user.count();
  const totalCompanies = await prisma.company.count();
  const totalJobs = await prisma.job.count();
  const publishedJobs = await prisma.job.count({ where: { status: JobStatus.PUBLISHED } });
  const orphanCompanies = await prisma.company.count({ where: { ownerId: null } });

  console.log(
    `\nseed เสร็จแล้ว — ${totalUsers} ผู้ใช้, ${totalCompanies} บริษัท, ${totalJobs} ประกาศ (เผยแพร่อยู่ ${publishedJobs})`
  );
  if (orphanCompanies > 0) {
    console.warn(`เตือน: มีบริษัท ${orphanCompanies} แห่งที่ยังไม่มีเจ้าของ`);
  }
  console.log(`\nบัญชีทดสอบ (รหัสผ่านเหมือนกันหมด: ${DEMO_PASSWORD})`);
  console.log("  ผู้สมัครงาน : seeker@joblab.dev");
  console.log("  บริษัท      : employer@joblab.dev");
}

main()
  .catch((error) => {
    console.error("seed ล้มเหลว:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
