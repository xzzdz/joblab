# JobLab — กฎการทำงานในโปรเจคนี้

> ไฟล์นี้ถูกอ่านอัตโนมัติทุกครั้งที่เปิด Claude Code ในโปรเจคนี้
> ถ้าเปิดโปรเจคใหม่แล้วอยากรู้ว่า "ทำถึงไหนแล้ว" → อ่าน [docs/PROGRESS.md](docs/PROGRESS.md)

@AGENTS.md

## โปรเจคนี้คืออะไร

เว็บประกาศงาน + ระบบติดตามใบสมัคร (job board + application tracker)
สร้างเพื่อ **ฝึก Next.js / TypeScript / PostgreSQL ให้ใช้งานได้จริง และเก็บเป็นผลงาน**

ผู้เขียนพื้นฐาน: เคยเขียนโปรแกรมมาบ้าง แต่ **ยังไม่เคยเขียน TypeScript และ Next.js มาก่อน**

## กฎข้อที่ 1 — อธิบายเสมอ ไม่ใช่แค่ส่งโค้ด

โปรเจคนี้มีเป้าหมายคือ "เข้าใจ" ไม่ใช่ "เสร็จ" เพราะฉะนั้น:

- เขียนโค้ดเสร็จแล้ว **ต้องอธิบายว่าทำไมถึงเขียนแบบนั้น** ไม่ใช่แค่บอกว่าทำอะไรไป
- ถ้ามีวิธีทำหลายแบบ ให้บอกว่าเลือกแบบไหนเพราะอะไร และแบบอื่นเสียตรงไหน
- ใส่ comment ในโค้ดตรงจุดที่ "อ่านแล้วไม่รู้ว่าทำไมต้องมี" — โดยเฉพาะเรื่องความปลอดภัยและ performance
- comment เขียนเป็นภาษาไทยได้ ตอบเป็นภาษาไทย
- **ห้ามข้ามขั้นด้วยการติดตั้ง library มาแก้ปัญหาที่ยังไม่เข้าใจ** — ให้ทำมือให้เข้าใจก่อน แล้วค่อยบอกว่ามี library อะไรที่ทำแทนได้

## กฎข้อที่ 2 — ทำทีละ Phase อย่าล้ำหน้า

Phase ทั้งหมดและสถานะปัจจุบันอยู่ใน [docs/PROGRESS.md](docs/PROGRESS.md)

- ทำ Phase ปัจจุบันให้จบและใช้งานได้จริงก่อน ค่อยขึ้น Phase ถัดไป
- ถ้าเจอไอเดียดี ๆ ที่ยังไม่ถึงคิว → เขียนลงหัวข้อ "Backlog" ใน PROGRESS.md อย่าเพิ่งทำ
- **ทุกครั้งที่ทำงานเสร็จ ต้องอัปเดต docs/PROGRESS.md** (สถานะ Phase, บันทึกสิ่งที่ทำ, สิ่งที่ต้องทำต่อ)

## กฎข้อที่ 3 — ยืนยันว่ามันทำงานจริง

ห้ามบอกว่า "เสร็จแล้ว" ถ้ายังไม่ได้ตรวจ อย่างน้อยต้องผ่าน:

```bash
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm run build        # build ผ่านจริง
```

แล้วเปิดดูหน้าเว็บ/ยิง request จริงเพื่อดูผลลัพธ์ ไม่ใช่เดาจากโค้ด
โดยเฉพาะ **HTTP status code** — หน้าตาเป็น 404 แต่ status เป็น 200 คือบั๊ก

### ข้อควรระวังตอนทดสอบด้วย curl บน Windows

**Git Bash ทำตัวอักษรไทยใน command-line argument พังเป็น `?`**
เช่น `curl -F 'title=นักพัฒนา'` จะส่ง `?????????` ไปจริง ๆ

ถ้าต้องทดสอบข้อมูลภาษาไทย ให้เลี่ยงการใส่ผ่าน argument:

```bash
# ❌ ค่าจะเพี้ยนเป็น ?
curl -F 'title=นักพัฒนาเว็บ' http://localhost:3000/...

# ✅ อ่านจากไฟล์ UTF-8 แทน
curl -F 'title=<./thai-title.txt' http://localhost:3000/...
```

หรือเขียนสคริปต์ `.ts` แล้วรันด้วย `npx tsx` (ค่าอยู่ในไฟล์ ไม่ผ่าน shell)
เคยเสียเวลาไล่หาบั๊กที่ไม่มีอยู่จริงเพราะเรื่องนี้มาแล้ว — **เห็น `????` ให้สงสัยเครื่องมือก่อน สงสัยแอปทีหลัง**

## กฎข้อที่ 4 — ความปลอดภัยคิดตั้งแต่เขียน ไม่ใช่ตามแก้ทีหลัง

- Query ที่ผู้ใช้ทั่วไปเรียกได้ **ต้องกรอง `status = PUBLISHED` เสมอ** (ดู `src/lib/jobs.ts`)
- ก่อนแก้/ลบข้อมูลใด ๆ ต้องเช็คว่า **ผู้ใช้คนนั้นเป็นเจ้าของข้อมูลจริง** ไม่ใช่แค่เช็คว่าล็อกอินแล้ว
- ข้อมูลจากผู้ใช้ต้อง validate ด้วย Zod **ที่ฝั่ง server เสมอ** validate ฝั่ง client เป็นแค่ UX ไม่ใช่ security
- ห้าม commit `.env` — ถ้าเพิ่มตัวแปรใหม่ ต้องเพิ่มใน `.env.example` ด้วย
- ไม่บอกใบ้ข้อมูลภายในผ่านข้อความ error (เช่น "มีอยู่แต่ยังไม่เผยแพร่" → ให้ตอบ 404 เหมือนไม่มี)
- **ก่อนรัน `deleteMany` / `updateMany` ต้อง `count` หรือ `findMany` ด้วยเงื่อนไขเดียวกันดูก่อนเสมอ**
  ว่าจะโดนกี่แถวและแถวไหนบ้าง — เคยพลาดมาแล้วจริง: ใช้ `contains: "example.com"` ตั้งใจลบผู้ใช้ทดสอบ
  แต่ไปแมตช์อีเมลเจ้าของบริษัทใน seed ด้วย แล้ว `onDelete: Cascade` ลบบริษัทกับประกาศงานตามไปอีก 4 ชุด
  (กู้คืนได้เพราะ seed เขียนแบบ idempotent — อีกเหตุผลที่ seed ต้องรันซ้ำได้)

## กฎข้อที่ 5 — โครงสร้างโค้ด

```
prisma/schema.prisma      แหล่งความจริงเดียวของโครงสร้าง DB — แก้แล้วต้อง migrate
prisma/seed.ts            ข้อมูลตัวอย่างสำหรับ dev
src/app/                  หน้าเว็บ (App Router) — ไฟล์ page.tsx ควรบางที่สุด
src/components/           React component ที่ใช้ซ้ำได้
src/lib/prisma.ts         Prisma Client singleton — ห้ามสร้าง new PrismaClient() ที่อื่น
src/lib/jobs.ts           query ทั้งหมดที่เกี่ยวกับงาน
src/lib/format.ts         ฟังก์ชันแปลงข้อมูลเป็นข้อความ
src/generated/prisma/     โค้ดที่ Prisma สร้างให้ — ห้ามแก้มือ, ไม่ commit
```

หลักการ:

- **Server Component เป็นค่าเริ่มต้น** ใส่ `"use client"` เฉพาะไฟล์ที่ต้องใช้ state / event / browser API จริง ๆ
- **query DB อยู่ใน `src/lib/` เท่านั้น** ไม่เขียน `prisma.job.findMany()` กระจายในไฟล์ page
- ให้ TypeScript สรุปชนิดข้อมูลจาก query เอง (`Awaited<ReturnType<typeof fn>>`) ไม่เขียน interface ซ้ำกับ schema
- ใช้ `Record<EnumType, string>` เวลาแมปค่า enum เป็นข้อความ เพื่อให้ลืมเพิ่มค่าใหม่แล้ว build พัง

## กฎข้อที่ 6 — Git

**หนึ่ง Phase = หนึ่ง branch** แล้ว merge เข้า `main` เมื่อทำเสร็จและตรวจผ่าน

```bash
# เริ่ม Phase ใหม่ (แตกจาก main เสมอ)
git checkout main
git checkout -b phase-3-job-crud

# ...ทำงาน แล้ว commit ระหว่างทางได้หลายครั้ง...

# จบ Phase: ตรวจให้ผ่านก่อน แล้วค่อย merge
npm run lint && npm run typecheck && npm run build
git checkout main
git merge --no-ff phase-3-job-crud
```

- ใช้ `--no-ff` เสมอ เพื่อให้เห็นใน history ว่างานก้อนไหนคือ Phase ไหน
- ไม่ลบ branch เก่าทิ้ง — เก็บไว้เป็นร่องรอยว่าทำอะไรไปบ้าง
- commit ทีละเรื่อง ข้อความบอก **"ทำไม"** ไม่ใช่แค่ "แก้ไฟล์อะไร"
- จบแต่ละ Phase ให้เขียนสรุปไว้ใน `docs/PROGRESS.md` ก่อน commit
- ห้าม commit `.env`, `node_modules`, `src/generated`

branch ที่มีอยู่ตอนนี้: `main`, `phase-1-foundation`, `phase-2-auth`

## เวอร์ชันที่ใช้ (สำคัญ — ต่างจากบทความเก่าในเน็ตเยอะ)

| ของ | เวอร์ชัน | สิ่งที่ต่างจากที่เคยเห็นในบทความเก่า |
|---|---|---|
| Next.js | 16.3.1 | `params` / `searchParams` เป็น **Promise** ต้อง `await` ก่อนใช้ |
| | | มี global type `PageProps<'/path'>` และ `LayoutProps<'/path'>` ใช้ได้เลยไม่ต้อง import |
| | | **middleware เปลี่ยนชื่อเป็น `proxy`** — ไฟล์คือ `src/proxy.ts` ไม่ใช่ `middleware.ts` |
| | | **`params` ใน Page ยังเป็น percent-encoded** ต้องผ่าน `decodeRouteParam()` ก่อนใช้ค้น DB เสมอ (Route Handler ได้ค่าที่ decode แล้ว — ไม่เหมือนกัน) |
| React | 19.2.8 | ฟอร์มใช้ `useActionState` (ของเดิมชื่อ `useFormState`) |
| Prisma | 7.9.1 | ต้องต่อ DB ผ่าน **driver adapter** (`@prisma/adapter-pg`) ไม่ใช่ใส่ url ตรง ๆ |
| | | ตั้งค่าใน `prisma.config.ts` ไม่ใช่ใน `schema.prisma` |
| | | client ถูก generate เป็น TypeScript ไปที่ `src/generated/prisma` |
| | | `prisma migrate dev` **รันใน terminal นี้ไม่ได้** (ต้องตอบ prompt) — ดูวิธีแทนด้านล่าง |
| Auth.js | 5.0.0-beta.32 | augment type ต้องเขียน `declare module "@auth/core/jwt"` ไม่ใช่ `"next-auth/jwt"` |
| Zod | v4 | ใช้ `z.email()` ไม่ใช่ `z.string().email()`, แตก error ด้วย `z.flattenError(err)` |
| Tailwind | v4 | ตั้งค่าใน CSS ด้วย `@theme` ไม่มี `tailwind.config.js` |

### วิธีสร้าง migration เมื่อ `prisma migrate dev` ใช้ไม่ได้

`prisma migrate dev` เป็นคำสั่งแบบโต้ตอบ พอมี warning มันจะขอให้ยืนยัน แล้วล้มเหลวใน terminal นี้
ให้สร้าง SQL เองแล้ว apply แทน (เป็นวิธีเดียวกับที่ใช้บน production อยู่แล้ว):

```bash
# 1. ดู SQL ที่จะถูกสร้างก่อน — อ่านให้เข้าใจว่าจะเกิดอะไรขึ้นกับข้อมูลเดิม
npx prisma migrate diff --from-config-datasource --to-schema ./prisma/schema.prisma --script

# 2. เขียนลงโฟลเดอร์ migration (ตั้งชื่อ <timestamp>_<คำอธิบาย>)
mkdir -p prisma/migrations/<timestamp>_<ชื่อ>
npx prisma migrate diff --from-config-datasource --to-schema ./prisma/schema.prisma --script \
  -o prisma/migrations/<timestamp>_<ชื่อ>/migration.sql

# 3. apply แล้ว generate client ใหม่
npx prisma migrate deploy
npx prisma generate
```

**ก่อนเขียนโค้ดที่เกี่ยวกับ Next.js หรือ Prisma ให้เปิดเอกสารในเครื่องก่อนเสมอ อย่าเขียนจากความจำ:**

- Next.js: `node_modules/next/dist/docs/01-app/`
- Prisma: `.agents/skills/prisma-*/SKILL.md`

## คำสั่งที่ใช้บ่อย

```bash
npm run db:up        # เปิด Postgres (ต้องเปิด Docker Desktop ก่อน)
npm run dev          # เปิดเว็บที่ http://localhost:3000
npm run db:studio    # เปิดหน้าเว็บดู/แก้ข้อมูลใน DB
npm run db:migrate   # หลังแก้ schema.prisma ทุกครั้ง
npm run db:seed      # ใส่ข้อมูลตัวอย่าง (รันซ้ำได้ ไม่พัง)
npm run db:reset     # ล้าง DB แล้ว migrate + seed ใหม่ทั้งหมด
npm run db:down      # ปิด Postgres
```
