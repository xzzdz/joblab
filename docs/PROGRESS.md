# ความคืบหน้าโปรเจค JobLab

> **เปิดโปรเจคใหม่ อ่านไฟล์นี้ก่อน** แล้วดูหัวข้อ "ทำต่อจากตรงไหน" ด้านล่างสุด
> อัปเดตล่าสุด: 14 ส.ค. 2569

---

## สถานะตอนนี้

**Phase 2 เสร็จแล้ว** — สมัครสมาชิก/ล็อกอินได้จริง แยก role ผู้สมัคร–บริษัท และมีด่านกันหน้าที่ต้องล็อกอิน

| Phase | เรื่อง | สถานะ |
|---|---|---|
| 1 | วางฐาน + หน้าอ่านข้อมูล | ✅ เสร็จ |
| 2 | ระบบสมาชิก + แยก role | ✅ เสร็จ |
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

## Phase 2 — ระบบสมาชิก + role ✅

**เป้าหมาย:** ล็อกอินได้ และแยกได้ว่าใครเป็นผู้สมัคร ใครเป็นบริษัท

- [x] เพิ่ม model `User` (+ `role: SEEKER | EMPLOYER`) และผูก `Company.ownerId` กับ `User`
- [x] migration ที่ 2 — เพิ่มฟิลด์แบบไม่ทำข้อมูลเดิมหาย
- [x] Auth.js v5 (Credentials + JWT) พร้อมใส่ `id` และ `role` ลง session
- [x] hash รหัสผ่านด้วย bcrypt (cost 12 ตอนสมัคร, 10 ตอน seed)
- [x] `src/proxy.ts` กันหน้าที่ต้องล็อกอิน + เด้งคนที่ล็อกอินแล้วออกจาก `/login`
- [x] `src/lib/dal.ts` — `requireUser()` / `requireRole()` ด่านจริงที่อยู่ติดข้อมูล
- [x] หน้า `/login`, `/register` (Server Actions + Zod)
- [x] หน้า `/account` แสดงข้อมูลบัญชี + บริษัทที่ตัวเองเป็นเจ้าของ
- [x] header แสดงชื่อผู้ใช้ + ปุ่มออกจากระบบ
- [x] บัญชีทดสอบใน seed

### บัญชีทดสอบ

| อีเมล | role | รหัสผ่าน |
|---|---|---|
| `seeker@joblab.dev` | ผู้สมัครงาน | `Password123!` |
| `employer@joblab.dev` | บริษัท (Siam Digital) | `Password123!` |

### สิ่งที่ได้เรียนรู้ใน Phase นี้

1. **ทำไมต้องมีด่าน 2 ชั้น** — `proxy.ts` เช็คจาก cookie เร็วแต่ไม่ปลอดภัยพอ เพราะถ้าเพิ่มหน้าใหม่
   แล้วลืมแก้ `matcher` หน้านั้นจะเปิดโล่งทันที ส่วน `requireUser()` ใน DAL อยู่ติดกับข้อมูล
   ลืมเรียกแล้วผลคือ "ไม่มีข้อมูลแสดง" ไม่ใช่ "ข้อมูลหลุด" — เอกสาร Next.js ก็ระบุชัดว่า
   proxy ไม่ควรเป็นด่านเดียว
2. **JWT session ไม่อัปเดตตาม DB** — ข้อมูลใน token คือภาพ ณ ตอนล็อกอิน ถ้าเปลี่ยน role ของใครใน DB
   token เดิมยังถือ role เก่าจนหมดอายุ เลยต้องอ่าน role จาก DB ซ้ำใน `requireRole()`
3. **ตอบ error ให้เหมือนกันหมด** — ล็อกอินพลาดตอบว่า "อีเมลหรือรหัสผ่านไม่ถูกต้อง" เสมอ
   ไม่แยกว่าผิดตรงไหน เพราะการแยกคือการยืนยันให้คนโจมตีรู้ว่าอีเมลไหนมีบัญชีอยู่จริง
4. **timing attack** — ถ้าไม่เจอผู้ใช้แล้ว return ทันที จะเร็วกว่ากรณีเจอราว 20 เท่า
   คนโจมตีจับเวลาก็รู้ได้ว่าอีเมลไหนมีอยู่ เลยต้องเทียบกับแฮชหลอกให้เสียเวลาพอ ๆ กัน
5. **race condition ตอนสมัคร** — เช็คอีเมลซ้ำด้วย `findUnique` ก่อน `create` ปิดช่องไม่ได้จริง
   เพราะอาจมี request แทรกระหว่างนั้น ต้องให้ unique constraint ของ DB เป็นคนตัดสิน แล้วดักโค้ด `P2002`
6. **การอ่าน cookie ทำให้ทั้ง route กลายเป็น dynamic** — พอใส่ header ที่รู้จักผู้ใช้ใน root layout
   `/jobs` เปลี่ยนจาก `○ Static` เป็น `ƒ Dynamic` ทันที `revalidate = 60` เลยไม่มีผลอีกต่อไป
   (บันทึกไว้ในโค้ดแล้ว วิธีแก้อยู่ใน Backlog)
7. **`declare module` ต้องชี้ให้ถูกโมดูล** — เขียน `declare module "next-auth/jwt"` แล้วไม่มีผล
   เพราะไฟล์นั้นเป็นแค่ `export * from "@auth/core/jwt"` ต้อง augment ที่ต้นทาง

---

## Phase 3 — ลงประกาศงาน (CRUD) ⬜ (ทำต่อจากตรงนี้)

- [ ] หน้า `/employer` สร้าง/แก้ข้อมูลบริษัทของตัวเอง (ตอนนี้มีแต่ที่มาจาก seed)
- [ ] หน้า `/employer/jobs` รายการประกาศของบริษัทตัวเอง — ใช้ `requireRole(EMPLOYER)` ที่เขียนไว้แล้ว
- [ ] ฟอร์มสร้าง/แก้ไขประกาศ ด้วย Server Actions + Zod
- [ ] **เช็ค ownership ก่อนแก้/ลบทุกครั้ง** (สำคัญที่สุดใน Phase นี้)
      ล็อกอินแล้วไม่พอ ต้องเช็คว่าประกาศนั้นเป็นของบริษัทที่ผู้ใช้คนนี้เป็นเจ้าของจริง
- [ ] เปลี่ยนสถานะ DRAFT → PUBLISHED → CLOSED
- [ ] `revalidatePath` ให้หน้า list อัปเดตทันทีหลังแก้ข้อมูล
- [ ] เพิ่ม `/employer` เข้า `PROTECTED_PREFIXES` ใน `src/proxy.ts` (ใส่ไว้ล่วงหน้าแล้ว)

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

- [ ] **ทำให้ `/jobs` กลับมาเป็น static** — ย้ายส่วนที่อ่าน cookie ใน `SiteHeader` ไปไว้ใน
      `<Suspense>` แล้วเปิด Cache Components เพื่อให้ `revalidate = 60` กลับมามีผล
- [ ] **บังคับ `Company.ownerId` เป็น required** — ตอนนี้ยัง optional เพื่อให้ migration
      ไม่ทำข้อมูลเดิมพัง (ขั้นที่ 3 ของ add nullable → backfill → make required)
- [ ] ล็อกอินด้วย Google (OAuth) — ต้องเพิ่มตาราง Account/Session + `@auth/prisma-adapter`
- [ ] จำกัดจำนวนครั้งที่ล็อกอินผิด (กัน brute force)
- [ ] ยืนยันอีเมลก่อนใช้งาน + ลืมรหัสผ่าน
- [ ] Dark mode (ตอนนี้ `globals.css` ทำเฉพาะโหมดสว่าง)
- [ ] หน้าโปรไฟล์บริษัท `/companies/[slug]`
- [ ] บันทึกงานที่สนใจ (saved jobs)
- [ ] แจ้งเตือนทางอีเมลเมื่อสถานะใบสมัครเปลี่ยน
- [ ] หน้า landing จริงที่ `/` (ตอนนี้ redirect ไป `/jobs`)
- [ ] `generateStaticParams` ให้หน้ารายละเอียดงานยอดนิยม
- [ ] i18n ไทย/อังกฤษ

## ปัญหาที่รู้อยู่แล้ว

- ยังไม่มี `error.tsx` — ถ้า DB ล่มจะเห็นหน้า error ดิบของ Next.js
- ยังไม่มีเทสต์อัตโนมัติเลย (ทดสอบด้วยการยิง HTTP มือทุกครั้ง)
- `revalidate = 60` ที่ `/jobs` ยังไม่มีผลจริง (ดู Backlog ข้อแรก)
- `requireRole()` เขียนไว้แล้วแต่ยังไม่มีหน้าไหนเรียกใช้ — จะได้ใช้จริงใน Phase 3
- ยังไม่จำกัดจำนวนครั้งที่ล็อกอินผิด

---

## บันทึกการทำงานแต่ละครั้ง

### 14 ส.ค. 2569 — Phase 2

ทำระบบสมาชิกจนล็อกอินได้จริง

ตัดสินใจอะไรไปบ้าง:
- **JWT session ไม่ใช่ database session** — ไม่ได้เลือกเอง แต่ Auth.js รองรับ Credentials
  ได้เฉพาะ strategy นี้ ผลข้างเคียงคือต้องอ่าน role จาก DB ซ้ำใน DAL
- **`Company.ownerId` เป็น optional ก่อน** — เพื่อให้ migration ไม่ทำข้อมูล seed เดิมพัง
  แล้ว backfill ผ่าน seed (วิธีเดียวกับที่ต้องทำบน production)
- **ยังไม่ทำ OAuth** — จะได้ไม่ต้องเพิ่มตาราง Account/Session ตอนนี้ ย้ายไป Backlog
- **สร้าง migration ด้วย `migrate diff` + `migrate deploy`** เพราะ `migrate dev` เป็นคำสั่ง
  แบบโต้ตอบที่รันใน terminal ของ agent ไม่ได้ (วิธีบันทึกไว้ใน CLAUDE.md แล้ว)

บั๊กที่เจอและแก้:
- `declare module "next-auth/jwt"` ไม่มีผล ทำให้ `token.id` เป็น `unknown` → ต้อง augment
  `@auth/core/jwt` แทน เพราะ next-auth/jwt เป็นแค่ re-export
- `token.id = user.id` typecheck ไม่ผ่านเพราะ Auth.js ประกาศ `User.id` เป็น optional → เพิ่ม guard
- dev server ตัวเก่ายังค้างอยู่ใน background หลัง Phase 1 และมันถูกสตาร์ตก่อนที่ `.env`
  จะมี `AUTH_SECRET` ทำให้ `/api/auth/csrf` ตอบผิด → ต้อง kill process แล้วเริ่มใหม่

อุบัติเหตุ (บันทึกไว้เตือนความจำ):
- ตอนลบผู้ใช้ทดสอบใช้เงื่อนไข `email contains "example.com"` ซึ่งไปแมตช์อีเมลเจ้าของบริษัท
  ใน seed ด้วย พอ `onDelete: Cascade` ทำงาน บริษัทกับประกาศงานหายไป 4 ชุด
  กู้คืนด้วย `npm run db:seed` ได้ครบเพราะ seed เขียนแบบ idempotent
  → เพิ่มกฎใน CLAUDE.md แล้ว: ก่อน `deleteMany` ต้อง `count` ด้วยเงื่อนไขเดียวกันดูก่อนเสมอ

ตรวจสอบแล้ว (ยิง HTTP จริงทั้งหมด):
- `/account` ไม่ล็อกอิน → 307 ไป `/login?callbackUrl=%2Faccount`; ล็อกอินแล้ว → 200
- ล็อกอินรหัสผิด → ไม่ได้ session cookie, redirect กลับพร้อม `error=CredentialsSignin`
- ล็อกอินถูก → ได้ cookie ที่เป็น `HttpOnly` + `SameSite=Lax` และ token ถูกเข้ารหัส (JWE)
- `/login` ตอนล็อกอินอยู่ → 307 ไป `/jobs`
- สมัครสมาชิกใหม่ → 303 ไป `/jobs` พร้อม session; อีเมลซ้ำ / รหัสไม่ตรงกัน / รหัสสั้นเกิน → ขึ้น error ถูกต้อง
- ข้อมูลใน DB: อีเมลถูกแปลงเป็นตัวพิมพ์เล็ก, เก็บเฉพาะ bcrypt hash ไม่มี plain text
- `lint` / `typecheck` / `build` ผ่าน

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
