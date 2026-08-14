# ความคืบหน้าโปรเจค JobLab

> **เปิดโปรเจคใหม่ อ่านไฟล์นี้ก่อน** แล้วดูหัวข้อ "ทำต่อจากตรงไหน" ด้านล่างสุด
> อัปเดตล่าสุด: 14 ส.ค. 2569

---

## สถานะตอนนี้

**Phase 1 เสร็จแล้ว** — เว็บรันได้ ดึงข้อมูลจาก PostgreSQL จริง มีหน้ารายการงานและหน้ารายละเอียด

| Phase | เรื่อง | สถานะ |
|---|---|---|
| 1 | วางฐาน + หน้าอ่านข้อมูล | ✅ เสร็จ |
| 2 | ระบบสมาชิก + แยก role | ⬜ ยังไม่เริ่ม |
| 3 | ลงประกาศงาน (CRUD จริง) | ⬜ ยังไม่เริ่ม |
| 4 | ค้นหา / กรอง / แบ่งหน้า | ⬜ ยังไม่เริ่ม |
| 5 | สมัครงาน + Kanban ติดตามใบสมัคร | ⬜ ยังไม่เริ่ม |
| 6 | ขัดให้เป็นมืออาชีพ + deploy | ⬜ ยังไม่เริ่ม |

---

## เริ่มทำงานยังไง (ทุกครั้งที่เปิดเครื่องมา)

```bash
# 1. เปิด Docker Desktop ก่อน (รอจนไอคอนนิ่ง)
npm run db:up     # เปิด Postgres
npm run dev       # เปิด http://localhost:3000
```

ถ้า DB พังหรือข้อมูลมั่ว: `npm run db:reset` (ล้างแล้วสร้างใหม่พร้อม seed)

---

## Phase 1 — วางฐาน ✅

**เป้าหมาย:** ให้เว็บดึงข้อมูลจาก DB จริงมาแสดงได้

- [x] สร้างโปรเจค Next.js 16 + TypeScript (strict) + Tailwind v4
- [x] ตั้ง PostgreSQL ด้วย Docker (`docker-compose.yml`, port **5433**)
- [x] ติดตั้ง Prisma 7 + `@prisma/adapter-pg`
- [x] เขียน schema: `Company`, `Job` + enum `JobType` / `WorkMode` / `JobStatus`
- [x] migration แรก (`prisma/migrations/…_init`)
- [x] seed ข้อมูลตัวอย่าง 5 บริษัท 14 ประกาศ (เผยแพร่ 12, DRAFT 1, CLOSED 1)
- [x] Prisma Client singleton กัน connection รั่วตอน hot reload
- [x] หน้า `/jobs` รายการงาน + skeleton ตอนโหลด + empty state
- [x] หน้า `/jobs/[slug]` รายละเอียด + `generateMetadata` + 404
- [x] ตรวจ HTTP status ครบทุกเส้นทาง

### สิ่งที่ได้เรียนรู้ใน Phase นี้

1. **Server Component เรียก DB ได้ตรง ๆ** — ไม่ต้องมี API route, ไม่ต้อง `useEffect`, connection string ไม่หลุดไป browser
2. **`params` เป็น Promise แล้ว** — Next.js 15 ขึ้นไปต้อง `await props.params` ก่อนใช้
3. **Static vs ISR** — `npm run build` ตอนแรกขึ้น `○ Static` ที่ `/jobs` แปลว่าข้อมูลถูกอบไว้ตอน build
   ถ้า deploy ไปจะไม่เห็นประกาศใหม่เลย แก้ด้วย `export const revalidate = 60`
   👉 **อ่านผลลัพธ์ `npm run build` ทุกครั้ง** สัญลักษณ์ ○ / ƒ บอกพฤติกรรมจริงตอน production
4. **`loading.tsx` ครอบ route ลูกด้วย** — บั๊กจริงที่เจอใน Phase นี้:
   วาง `loading.tsx` ไว้ที่ `app/jobs/` ทำให้ `/jobs/[slug]` ถูกห่อ Suspense ไปด้วย
   Next เริ่ม stream ทันที → **ล็อก HTTP status ไว้ที่ 200** พอ `notFound()` ทำงานทีหลัง
   หน้าตาเป็น 404 แต่ status จริงคือ 200 → Google เก็บหน้า 404 เข้า index
   แก้โดยย้ายเข้า route group `app/jobs/(list)/` (ชื่อในวงเล็บไม่มีผลกับ URL)
5. **กรองสิทธิ์ที่ชั้น query** — `getPublishedJobBySlug` ใส่ `status: PUBLISHED` ไว้ใน where
   ทำให้เดา URL ประกาศ DRAFT ของบริษัทอื่นไม่ได้ (ทดสอบแล้ว ได้ 404 จริง)
6. **`Record<Enum, string>`** — ถ้าเพิ่มค่าใน enum แล้วลืมเพิ่มคำแปล TypeScript จะ error ตอน build

---

## Phase 2 — ระบบสมาชิก + role ⬜ (ทำต่อจากตรงนี้)

**เป้าหมาย:** ล็อกอินได้ และแยกได้ว่าใครเป็นผู้สมัคร ใครเป็นบริษัท

- [ ] เพิ่ม model `User` (+ `role: SEEKER | EMPLOYER`) และผูก `Company` กับ `User`
- [ ] รัน migration ที่ 2 — จะได้เห็นว่า migration ทำงานยังไงตอน schema มีข้อมูลอยู่แล้ว
- [ ] ติดตั้ง Auth.js (NextAuth v5) — สมัคร/ล็อกอินด้วย email + password
- [ ] hash password ด้วย bcrypt (ห้ามเก็บ plain text เด็ดขาด)
- [ ] middleware กันหน้าที่ต้องล็อกอิน
- [ ] หน้า `/login`, `/register`
- [ ] แสดงชื่อผู้ใช้ + ปุ่ม logout บน header

**สิ่งที่จะได้เรียน:** session ทำงานยังไง, ต่างกับ JWT ตรงไหน, ทำไมห้ามเช็คสิทธิ์แค่ที่ middleware

---

## Phase 3 — ลงประกาศงาน (CRUD) ⬜

- [ ] หน้า `/employer/jobs` รายการประกาศของบริษัทตัวเอง
- [ ] ฟอร์มสร้าง/แก้ไขประกาศ ด้วย Server Actions + Zod + React Hook Form
- [ ] **เช็ค ownership ก่อนแก้/ลบทุกครั้ง** (สำคัญที่สุดใน Phase นี้)
- [ ] เปลี่ยนสถานะ DRAFT → PUBLISHED → CLOSED
- [ ] `revalidatePath` ให้หน้า list อัปเดตทันทีหลังแก้ข้อมูล

---

## Phase 4 — ค้นหา / กรอง / แบ่งหน้า ⬜

- [ ] ช่องค้นหาจากชื่อตำแหน่ง
- [ ] กรองตาม location / type / workMode / ช่วงเงินเดือน
- [ ] เก็บ filter ไว้ใน URL (`searchParams`) ให้ copy ลิงก์ส่งต่อได้
- [ ] แบ่งหน้าแบบ cursor
- [ ] ดู query จริงใน log แล้วเพิ่ม index ให้ตรงกับที่ query จริง

---

## Phase 5 — สมัครงาน + Kanban ⬜

- [ ] model `Application` + `@@unique([jobId, seekerId])` กันสมัครซ้ำ
- [ ] อัปโหลด resume PDF
- [ ] บอร์ด Kanban ลากเปลี่ยนสถานะใบสมัคร + optimistic UI
- [ ] dashboard สรุปตัวเลขด้วย `groupBy` / `aggregate`

---

## Phase 6 — ขัดให้เป็นมืออาชีพ + deploy ⬜

- [ ] `error.tsx` ทุกหน้า, rate limit
- [ ] Vitest เทสต์ logic ใน `src/lib/`
- [ ] Playwright เทสต์ flow สมัครงาน
- [ ] GitHub Actions รัน lint + typecheck + test
- [ ] ย้าย DB ขึ้น Neon แล้ว deploy Vercel
- [ ] README + screenshot + demo account ทั้ง 2 role

---

## Backlog (ไอเดียที่ยังไม่ถึงคิว — อย่าเพิ่งทำ)

- [ ] Dark mode (ตอนนี้ `globals.css` ทำเฉพาะโหมดสว่าง)
- [ ] หน้าโปรไฟล์บริษัท `/companies/[slug]`
- [ ] บันทึกงานที่สนใจ (saved jobs)
- [ ] แจ้งเตือนทางอีเมลเมื่อสถานะใบสมัครเปลี่ยน
- [ ] หน้า landing จริงที่ `/` (ตอนนี้ redirect ไป `/jobs`)
- [ ] `generateStaticParams` ให้หน้ารายละเอียดงานยอดนิยม
- [ ] i18n ไทย/อังกฤษ

## ปัญหาที่รู้อยู่แล้ว

- ยังไม่มี `error.tsx` — ถ้า DB ล่มจะเห็นหน้า error ดิบของ Next.js
- ยังไม่มีเทสต์อัตโนมัติเลย
- `Company` ยังไม่ผูกกับ `User` (รอ Phase 2)

---

## บันทึกการทำงานแต่ละครั้ง

### 14 ส.ค. 2569 — Phase 1

สร้างโปรเจคจากศูนย์จนหน้าเว็บดึงข้อมูลจาก Postgres ได้

ตัดสินใจอะไรไปบ้าง:
- **Docker แทน Neon** สำหรับตอน dev — ไม่ต้องสมัครอะไร ทำงาน offline ได้ ตอน Phase 6 ค่อยย้ายขึ้น Neon
- **ใช้ port 5433** ไม่ใช่ 5432 กันชนกับ Postgres ที่อาจติดตั้งไว้บนเครื่องอยู่แล้ว
- **ยังไม่สร้าง model `User` / `Application`** ทั้งที่รู้ว่าต้องใช้ — ตั้งใจให้ได้ฝึกเขียน migration
  ตอนที่ตารางมีข้อมูลอยู่แล้วใน Phase 2 ซึ่งเป็นสถานการณ์จริงที่เจอในงาน
- **ใช้ Noto Sans Thai** แทน Geist ที่ create-next-app ให้มา เพราะ Geist ไม่มีตัวอักษรไทย

บั๊กที่เจอและแก้:
- `notFound()` คืน status 200 แทน 404 เพราะ `loading.tsx` ครอบ route ลูก → ย้ายเข้า route group `(list)`
- `/jobs` เป็น static ตอน build ทำให้ข้อมูลค้าง → ใส่ `revalidate = 60`

ตรวจสอบแล้ว: `lint` / `typecheck` / `build` ผ่าน, ยิง request จริงได้ status ถูกทุกเส้นทาง
(`/` 307, `/jobs` 200, ประกาศเผยแพร่ 200, DRAFT 404, CLOSED 404, ไม่มีจริง 404)
