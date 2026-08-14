# JobLab

เว็บประกาศงาน + ระบบติดตามใบสมัคร สร้างด้วย Next.js 16, TypeScript, PostgreSQL และ Prisma 7

> โปรเจคนี้ทำเพื่อฝึกและเก็บเป็นผลงาน แบ่งงานเป็น 6 Phase
> ดูว่าทำถึงไหนแล้วได้ที่ [docs/PROGRESS.md](docs/PROGRESS.md)

## เทคโนโลยีที่ใช้

| ส่วน | ใช้ | เหตุผล |
|---|---|---|
| Framework | Next.js 16 (App Router) | Server Components ดึงข้อมูลจาก DB ได้โดยไม่ต้องมี API layer |
| ภาษา | TypeScript (`strict: true`) | จับ error ตั้งแต่ตอนเขียน ไม่ใช่ตอนผู้ใช้เจอ |
| ฐานข้อมูล | PostgreSQL 17 | รองรับ enum, transaction, full-text search และเจอในงานจริงมากที่สุด |
| ORM | Prisma 7 | schema เป็นแหล่งความจริงเดียว และได้ type ตรงกับ DB อัตโนมัติ |
| UI | Tailwind CSS v4 | |
| Auth | Auth.js v5 + bcrypt | session cookie แบบ HttpOnly, รหัสผ่านเก็บเป็นแฮชเท่านั้น |
| Validation | Zod | schema เดียวใช้ตรวจทั้ง client และ server |
| Dev DB | Docker Compose | ไม่ต้องติดตั้ง Postgres ลงเครื่อง ลบทิ้งได้ทุกเมื่อ |

## เริ่มใช้งาน

**ต้องมีก่อน:** Node.js 20+ และ Docker Desktop

```bash
# 1. ติดตั้ง dependencies
npm install

# 2. ตั้งค่า environment แล้วใส่ AUTH_SECRET
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"   # เอาค่าที่ได้ใส่ AUTH_SECRET

# 3. เปิดฐานข้อมูล (ต้องเปิด Docker Desktop ไว้ก่อน)
npm run db:up

# 4. สร้างตารางและใส่ข้อมูลตัวอย่าง
npm run db:migrate
npm run db:seed

# 5. เปิดเว็บ
npm run dev
```

เปิด http://localhost:3000

### บัญชีทดสอบ

| อีเมล | ประเภท | รหัสผ่าน |
|---|---|---|
| `seeker@joblab.dev` | ผู้สมัครงาน | `Password123!` |
| `employer@joblab.dev` | บริษัท | `Password123!` |

## คำสั่งทั้งหมด

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` | รัน dev server |
| `npm run build` | build สำหรับ production |
| `npm run lint` | ตรวจโค้ดด้วย ESLint |
| `npm run typecheck` | ตรวจ type ด้วย TypeScript |
| `npm run db:up` / `db:down` | เปิด/ปิด Postgres ใน Docker |
| `npm run db:migrate` | สร้าง migration หลังแก้ `prisma/schema.prisma` |
| `npm run db:seed` | ใส่ข้อมูลตัวอย่าง (รันซ้ำได้) |
| `npm run db:reset` | ล้าง DB แล้ว migrate + seed ใหม่ |
| `npm run db:studio` | เปิด Prisma Studio ดูข้อมูลใน DB |

## โครงสร้าง

```
prisma/
  schema.prisma           โครงสร้างฐานข้อมูล (แหล่งความจริงเดียว)
  seed.ts                 ข้อมูลตัวอย่างสำหรับ dev
src/
  proxy.ts                ด่านแรกกันหน้าที่ต้องล็อกอิน (Next 16 เปลี่ยนชื่อจาก middleware)
  app/
    jobs/(list)/          หน้ารายการงาน — อยู่ใน route group เพื่อไม่ให้ loading.tsx ครอบหน้า detail
    jobs/[slug]/          หน้ารายละเอียดงาน
    (auth)/               หน้า login และ register
    account/              หน้าบัญชีผู้ใช้ (ต้องล็อกอิน)
    api/auth/             route handler ของ Auth.js
  components/             React component ที่ใช้ซ้ำ
  lib/
    prisma.ts             Prisma Client singleton
    auth.ts               ตั้งค่า Auth.js (Credentials + JWT)
    dal.ts                ด่านตรวจสิทธิ์จริง — requireUser / requireRole
    jobs.ts               query ทั้งหมดที่เกี่ยวกับงาน
    format.ts             ฟังก์ชันแปลงข้อมูลเป็นข้อความไทย
    actions/              Server Actions
    validation/           Zod schema
```

## สถานะฟีเจอร์

- [x] ดูรายการตำแหน่งงานที่เปิดรับ
- [x] ดูรายละเอียดงานและข้อมูลบริษัท
- [x] สมัครสมาชิก / ล็อกอิน (แยกผู้สมัคร–บริษัท)
- [ ] บริษัทลงประกาศงาน
- [ ] ค้นหาและกรองงาน
- [ ] สมัครงาน + ติดตามสถานะแบบ Kanban
