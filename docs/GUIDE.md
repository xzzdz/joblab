# คู่มือ JobLab — อ่านครั้งเดียวเข้าใจทั้งโปรเจค

> ไฟล์นี้อธิบาย **"ทำไม"** โค้ดถึงเป็นแบบนี้ ไม่ใช่แค่ "มีอะไรบ้าง"
> ทำถึงไหนแล้ว → [PROGRESS.md](PROGRESS.md) · กฎการเขียน → [../CLAUDE.md](../CLAUDE.md) · ขึ้น production → [DEPLOY.md](DEPLOY.md)

---

## 1. เริ่มใช้งานใน 3 คำสั่ง

```bash
npm run db:up     # เปิด PostgreSQL (ต้องเปิด Docker Desktop ก่อน)
npm run dev       # เปิดเว็บ → http://localhost:3000
npm run db:studio # เปิดหน้าดูข้อมูลใน DB → http://localhost:5555
```

**บัญชีทดสอบ** (รหัสผ่านเหมือนกันหมด: `Password123!`)

| อีเมล | เป็นใคร | เห็นอะไร |
|---|---|---|
| `seeker@joblab.dev` | ผู้สมัครงาน | สมัครงานได้ · เมนู "ใบสมัครของฉัน" |
| `employer@joblab.dev` | บริษัท Siam Digital | ลงประกาศได้ · บอร์ดผู้สมัคร |

---

## 2. คำสั่งทั้งหมด

### ใช้ทุกวัน

| คำสั่ง | ทำอะไร | ใช้ตอนไหน |
|---|---|---|
| `npm run dev` | เปิดเว็บโหมดพัฒนา | ทุกครั้งที่เขียนโค้ด |
| `npm run db:up` | เปิด Postgres ใน Docker | ตอนเปิดเครื่องมาใหม่ |
| `npm run db:down` | ปิด Postgres | ตอนเลิกใช้ อยากคืน RAM |
| `npm run db:studio` | หน้าเว็บดู/แก้ข้อมูลใน DB | อยากเห็นว่าข้อมูลจริงหน้าตายังไง |

### ก่อนบอกว่า "เสร็จแล้ว" — ต้องผ่านทั้ง 4 อัน

| คำสั่ง | จับอะไร |
|---|---|
| `npm run lint` | โค้ดผิดแบบแผน ตัวแปรไม่ได้ใช้ |
| `npm run typecheck` | ชนิดข้อมูลไม่ตรงกัน |
| `npm run test` | logic เพี้ยน + ด่านกันสิทธิ์ยังทำงานอยู่ไหม |
| `npm run build` | build จริงพังไหม + **ดูตาราง Route ท้ายผลลัพธ์ด้วย** |

ทั้ง 4 อันนี้ถูกรันอัตโนมัติทุกครั้งที่ push ด้วย [GitHub Actions](../.github/workflows/ci.yml)
ใช้ `npm run test:watch` ตอนกำลังเขียนเทสต์ (รันใหม่อัตโนมัติเมื่อไฟล์เปลี่ยน)

### ตอนแก้ฐานข้อมูล

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run db:migrate` | สร้าง migration หลังแก้ `schema.prisma` |
| `npm run db:seed` | ใส่ข้อมูลตัวอย่าง (รันซ้ำได้ ไม่พัง) |
| `npm run db:reset` | ล้าง DB แล้ว migrate + seed ใหม่ทั้งหมด |

> ⚠️ `prisma migrate dev` เป็นคำสั่งแบบโต้ตอบ ถ้ารันแล้วค้าง ดูวิธีเลี่ยงใน [CLAUDE.md](../CLAUDE.md)

---

## 3. โครงสร้างไฟล์ — อะไรอยู่ตรงไหน

```
prisma/
  schema.prisma      ← แหล่งความจริงเดียวของโครงสร้าง DB
  migrations/        ← ประวัติการเปลี่ยน DB ทีละขั้น (ห้ามแก้ของเก่า)
  seed.ts            ← ข้อมูลตัวอย่าง

src/
  app/               ← หน้าเว็บ (1 โฟลเดอร์ = 1 URL)
  components/        ← ชิ้นส่วน UI ที่ใช้ซ้ำ
  lib/               ← ตรรกะทั้งหมด ไม่มี UI ปนเลย
  proxy.ts           ← ด่านแรกก่อนเข้าทุกหน้า (Next 16 เปลี่ยนชื่อจาก middleware)
  generated/prisma/  ← Prisma สร้างให้ ห้ามแก้มือ ไม่ commit
```

### `src/lib/` — หัวใจของโปรเจค

| ไฟล์ | หน้าที่ | กฎ |
|---|---|---|
| `prisma.ts` | ตัวเชื่อม DB ตัวเดียวของทั้งแอป | **ห้ามสร้าง `new PrismaClient()` ที่อื่น** |
| `auth.ts` | ตั้งค่า Auth.js | |
| `dal.ts` | `requireUser()` / `requireRole()` | **ด่านตรวจสิทธิ์จริง** |
| `jobs.ts` | query งานสำหรับคนทั่วไป | กรอง `PUBLISHED` เสมอ |
| `employer.ts` | query งานสำหรับเจ้าของ | ฝัง `ownerId` ใน where เสมอ |
| `applications.ts` | query ใบสมัคร | ฝังเงื่อนไขผู้มีสิทธิ์ดูใน where เสมอ |
| `storage.ts` | เก็บ/อ่านไฟล์ resume | ตรวจไฟล์ 3 ชั้น |
| `format.ts` | แปลงข้อมูลเป็นข้อความไทย | |
| `rate-limit.ts` | จำกัดจำนวนครั้งที่ลองล็อกอิน | |
| `actions/` | Server Actions (เขียนข้อมูล) | ขึ้นต้นด้วย `requireUser` เสมอ |
| `validation/` | Zod schema | |

ไฟล์ `*.test.ts` วางไว้ข้าง ๆ ไฟล์ที่มันเทสต์ ส่วนเทสต์ที่ต่อ DB จริงอยู่ใน `tests/`

**กฎเหล็ก: ห้ามเขียน `prisma.job.findMany()` ในไฟล์ `page.tsx`** — query อยู่ใน `lib/` เท่านั้น
เพราะถ้ากระจายอยู่ทุกหน้า วันหนึ่งจะมีสักหน้าที่ลืมกรอง `PUBLISHED` แล้วประกาศลับหลุด

---

## 4. 6 เรื่องที่ต้องเข้าใจ ถึงจะแก้โค้ดนี้ได้

### 4.1 Server Component เป็นค่าเริ่มต้น

ไฟล์ใน `app/` รันบน **server** ทั้งหมด เว้นแต่จะเขียน `"use client"` ไว้บรรทัดแรก

```tsx
// ไม่มี "use client" → รันบน server → เรียก DB ได้เลย
export default async function JobsPage() {
  const jobs = await getPublishedJobs();   // ← ไม่ต้องมี API route
  return <ul>{jobs.map(...)}</ul>;
}
```

**ทำไมถึงดี:** ไม่ต้องเขียน API, ไม่ต้อง `useEffect`, ไม่ต้องจัดการ loading เอง
และรหัสผ่าน DB ไม่มีทางหลุดไปฝั่ง browser เพราะโค้ดนี้ไม่เคยถูกส่งไป

**ใส่ `"use client"` เมื่อไหร่:** ต้องใช้ `useState` / `onClick` / `useActionState` เท่านั้น
ตัวอย่างในโปรเจคนี้: `apply-form.tsx`, `application-board.tsx`

---

### 4.2 `params` และ `searchParams` เป็น Promise

Next 15 ขึ้นไปเปลี่ยนแล้ว บทความเก่าในเน็ตส่วนใหญ่ยังเขียนแบบเดิม

```tsx
export default async function Page(props: PageProps<"/jobs/[slug]">) {
  const { slug } = await props.params;          // ← ต้อง await
  const { q } = await props.searchParams;       // ← ต้อง await
}
```

`PageProps<'/path'>` เป็น type ที่ Next สร้างให้อัตโนมัติ ไม่ต้อง import

> **กับดักที่เจอจริง:** `params` ในหน้า Page ยังเป็น percent-encoded อยู่
> slug ภาษาไทยจะมาเป็น `%E0%B8%99...` ต้องผ่าน `decodeRouteParam()` ก่อนเอาไปค้น DB
> (Route Handler ได้ค่าที่ decode แล้ว — ไม่เหมือนกัน)

---

### 4.3 Server Actions = ฟอร์มที่ไม่ต้องเขียน API

```tsx
// lib/actions/job.ts
"use server";
export async function createJob(prevState, formData) { ... }

// component
<form action={createJob}>
```

**ข้อดี:** ฟอร์มทำงานได้แม้ JavaScript ยังโหลดไม่เสร็จ

**⚠️ อันตรายที่ต้องจำ:** ฟังก์ชันที่ export จากไฟล์ `"use server"` คือ **endpoint สาธารณะ**
ใครก็ยิง HTTP เข้ามาตรง ๆ ได้โดยไม่ผ่านหน้าเว็บของเรา ดังนั้นทุก action ต้อง:

1. เช็คสิทธิ์เอง (`requireUser` / `requireRole`) — **ห้ามคิดว่า "หน้าเว็บซ่อนปุ่มไว้แล้ว"**
2. validate ข้อมูลด้วย Zod ทุกครั้ง

---

### 4.4 ความปลอดภัย 2 ชั้น และทำไมต้องมีทั้งคู่

```
คนกดเข้า /employer/jobs
        ↓
[ชั้น 1] src/proxy.ts     ← เร็ว แต่เชื่อไม่ได้ 100%
        ↓                    เช็คแค่ว่ามี cookie ไหม
[ชั้น 2] requireRole()    ← ด่านจริง อยู่ติดกับข้อมูล
        ↓                    อ่าน role จาก DB
[ชั้น 3] where: { ownerId } ← ฝังในตัว query
```

**ทำไม proxy อย่างเดียวไม่พอ:** ถ้าเพิ่มหน้าใหม่แล้วลืมใส่ path ใน `matcher`
หน้านั้นจะเปิดโล่งทันทีโดยไม่มีอะไรเตือน — เอกสาร Next.js เองก็บอกว่าห้ามใช้เป็นด่านเดียว

**ชั้น 3 คือชั้นที่ดีที่สุด** เพราะเป็นการ "ออกแบบให้พลาดไม่ได้":

```ts
// ❌ แบบที่ลืมได้
const job = await prisma.job.findUnique({ where: { id } });
if (job.company.ownerId !== user.id) throw new Error();  // ← ลืมบรรทัดนี้ = ข้อมูลหลุด

// ✅ แบบที่ลืมไม่ได้ — เงื่อนไขอยู่ในตัว query
const job = await prisma.job.findFirst({
  where: { id, company: { ownerId: user.id } },
});
// ลืมเช็ค = ได้ null ไม่ใช่ข้อมูลคนอื่น
```

**เวลาจะแก้ข้อมูล ใช้ `updateMany` ไม่ใช่ `update`:**
`update` รับ where ได้แค่ฟิลด์ unique จึงต้องดึงมาเช็คก่อนแล้วค่อยสั่งแก้ (2 จังหวะ มีช่องว่าง)
ส่วน `updateMany` ยัดเงื่อนไขเจ้าของลงไปได้เลย ถ้าไม่ใช่ของเขา `count` จะเป็น 0

---

### 4.5 ตอบ 404 ไม่ใช่ 403

ทั้งโปรเจคนี้ เมื่อผู้ใช้ไม่มีสิทธิ์ดูของบางอย่าง เราตอบ **404 เหมือนไม่มีอยู่จริง**

เพราะ 403 แปลว่า *"มีอยู่จริงแต่คุณดูไม่ได้"* ซึ่งเท่ากับยืนยันให้คนนอกรู้ว่าข้อมูลนั้นมีอยู่
ไล่ยิง id ไปเรื่อย ๆ ก็นับได้ว่าระบบมีประกาศ/ใบสมัครกี่รายการ

หลักเดียวกันใช้กับข้อความ error ตอนล็อกอิน — ตอบ *"อีเมลหรือรหัสผ่านไม่ถูกต้อง"* เสมอ
ไม่แยกว่าผิดตรงไหน เพราะการแยกคือการบอกว่าอีเมลไหนมีบัญชีอยู่จริง

---

### 4.6 อ่านผลลัพธ์ `npm run build` ให้เป็น

```
┌ ○ /jobs        ← Static: อบ HTML ไว้ตอน build ข้อมูลจะค้าง
└ ƒ /jobs/[slug] ← Dynamic: สร้างใหม่ทุก request
```

**บั๊กที่มองไม่เห็นถ้าไม่อ่านตารางนี้:** ตอน Phase 1 หน้า `/jobs` เป็น `○ Static`
แปลว่า deploy ไปแล้วบริษัทลงประกาศใหม่ ผู้ใช้จะไม่เห็นเลยจนกว่าจะ build ใหม่

**สิ่งที่ทำให้กลายเป็น Dynamic:** อ่าน `cookies()`, `headers()`, หรือ `searchParams`

---

## 5. เดินตามโค้ด 1 รอบ: "กดสมัครงาน" เกิดอะไรขึ้นบ้าง

```
1. ผู้ใช้เปิด /jobs/nextjs-developer-...
   └─ app/jobs/[slug]/page.tsx
      └─ getPublishedJobBySlug()  ← where: { slug, status: PUBLISHED }
                                     ประกาศ DRAFT จะได้ null → notFound() → 404

2. ท้ายหน้าแสดง <ApplySection>
   └─ ถามว่าคนดูเป็นใคร แล้วเลือกแสดง 1 ใน 4 แบบ
      ยังไม่ล็อกอิน → ปุ่มเข้าสู่ระบบ
      บัญชีบริษัท   → บอกว่าสมัครไม่ได้
      สมัครไปแล้ว   → แสดงสถานะ
      ผู้สมัครทั่วไป → <ApplyForm>

3. ผู้ใช้เลือกไฟล์ → checkSize() เช็คขนาดทันที (UX เท่านั้น)

4. กดส่ง → applyToJobAction()
   ├─ requireRole(SEEKER)        ← บริษัทยิงตรงเข้ามาก็ไม่ผ่าน
   ├─ applySchema.safeParse()    ← ข้อมูลผิดรูปตกที่นี่
   ├─ เช็คว่างานยัง PUBLISHED    ← กันคนแก้ jobId เป็นประกาศลับ
   ├─ saveResume()               ← ตรวจ 3 ชั้น: ขนาด / นามสกุล / ไบต์แรกของไฟล์
   ├─ prisma.application.create()
   │   └─ ถ้าซ้ำ → P2002 → ลบไฟล์ที่เพิ่งเขียนทิ้ง แล้วบอก "สมัครไปแล้ว"
   └─ revalidatePath()           ← สั่งให้หน้าที่เกี่ยวข้องดึงข้อมูลใหม่

5. บริษัทเปิดบอร์ด → /employer/jobs/[id]/applications
   ├─ requireRole(EMPLOYER)
   ├─ getMyJob(ownerId, id)      ← บริษัทอื่นเดา id ถูกก็ได้ null → 404
   └─ <ApplicationBoard>         ← กดปุ่ม → ย้ายทันที (useOptimistic)
                                    server ปฏิเสธเมื่อไหร่ React ย้อนกลับให้เอง

6. กด "เปิด resume" → /api/resumes/[applicationId]
   └─ ตรวจว่าเป็นเจ้าของใบสมัคร หรือบริษัทที่รับสมัคร
      ไม่ใช่ทั้งคู่ → 404
```

**จุดที่อยากให้สังเกต:** ทุกด่านตรวจซ้ำ ไม่มีด่านไหนเชื่อว่า "ด่านก่อนหน้าเช็คไปแล้ว"

---

## 6. ไฟล์ resume เก็บยังไง และทำไม

**resume คือข้อมูลส่วนบุคคล** มีเบอร์โทร ที่อยู่ ประวัติการทำงาน จึงห้ามอยู่ใน `public/`
เพราะโฟลเดอร์นั้นใครก็เปิดได้โดยไม่ต้องล็อกอิน และ Google เก็บเข้า index ได้ด้วย

เข้าถึงได้ทางเดียวคือผ่าน [`/api/resumes/[applicationId]`](../src/app/api/resumes/%5BapplicationId%5D/route.ts)
ซึ่งตรวจทุกครั้งว่าคนขอเป็นเจ้าของใบสมัคร หรือเป็นบริษัทที่รับสมัครงานนั้น

### เรื่องที่เกิดขึ้นจริงระหว่างทาง — ควรอ่าน

Phase 5 เก็บไฟล์ลงดิสก์ที่ `.uploads/` ซึ่งทำงานได้ดีมากตอน dev
พอถึง Phase 6 ที่จะ deploy จริงถึงรู้ว่า **ใช้บน Vercel ไม่ได้เลย** — serverless มี filesystem
ที่หายทุกครั้งที่ deploy และแต่ละ instance ไม่เห็นไฟล์ของกัน
ผู้ใช้อัปโหลดวันนี้ พรุ่งนี้ deploy ใหม่ ไฟล์หายหมด

**แต่การแก้ใช้เวลาไม่นานเลย เพราะทั้งโปรเจคเรียกไฟล์ผ่าน `storage.ts` เท่านั้น**
ไม่มีที่ไหนเรียก `fs` ตรง ๆ ย้ายมาเก็บใน Postgres (ตาราง `ResumeFile`) จบในไฟล์เดียว
— นี่คือเหตุผลที่ควรซ่อนรายละเอียดพวกนี้ไว้หลังฟังก์ชันตั้งแต่แรก แม้ตอนนั้นจะดูเหมือนเขียนเกินจำเป็น

### ทำไมแยกตาราง ไม่ใส่ฟิลด์ Bytes ใน Application เลย

ถ้าอยู่ตารางเดียวกัน วันหนึ่งจะมีคนเขียน `findMany` โดยไม่ใส่ `select`
แล้วลากไฟล์หลายเมกะไบต์ออกมาทั้งตารางโดยไม่รู้ตัว
แยกตารางทำให้ต้องตั้งใจ join ถึงจะได้ไฟล์ — **เผลอไม่ได้**

และ `onDelete: Cascade` ทำให้ลบใบสมัครแล้วไฟล์หายตามเอง ไม่ต้องเขียนโค้ดเก็บกวาด

> ข้อจำกัด: เหมาะกับไฟล์เล็ก (จำกัดไว้ 2 MB) และจำนวนไม่มาก
> ถ้าโตขึ้นจริงต้องย้ายไป object storage — ก็แก้แค่ `storage.ts` เหมือนเดิม

---

## 7. เจอปัญหาบ่อย ๆ แก้ยังไง

| อาการ | สาเหตุ | วิธีแก้ |
|---|---|---|
| `Can't reach database server` | Docker ไม่ได้เปิด | เปิด Docker Desktop แล้ว `npm run db:up` |
| `Another next dev server is already running` | มี dev server ค้างอยู่ | `taskkill /PID <เลข> /F` ตามที่ error บอก |
| แก้ `schema.prisma` แล้วโค้ดไม่รู้จักฟิลด์ใหม่ | ยังไม่ generate client | `npm run db:migrate` |
| typecheck ฟ้อง path ที่ลบไปแล้ว | type เก่าค้าง | `npm run typecheck` (มี `next typegen` ให้แล้ว) |
| แก้ `next.config.ts` แล้วไม่มีผล | dev server ต้องรีสตาร์ต | Ctrl+C แล้ว `npm run dev` ใหม่ |
| ข้อมูลใน DB มั่ว | — | `npm run db:seed` (หรือ `db:reset` ถ้าอยากล้างหมด) |

---

## 8. เวอร์ชันที่ใช้ — ต่างจากบทความเก่าเยอะ

| ของ | เวอร์ชัน | สิ่งที่ต่าง |
|---|---|---|
| Next.js | 16.3.1 | `params`/`searchParams` เป็น Promise · middleware → **`proxy.ts`** |
| React | 19.2.8 | `useActionState` (เดิมชื่อ `useFormState`) · `useOptimistic` |
| Prisma | 7.9.1 | ต้องใช้ **driver adapter** · ตั้งค่าใน `prisma.config.ts` |
| Auth.js | 5.0.0-beta | augment type ที่ `@auth/core/jwt` ไม่ใช่ `next-auth/jwt` |
| Zod | v4 | `z.email()` ไม่ใช่ `z.string().email()` · `z.flattenError()` |
| Tailwind | v4 | ตั้งค่าใน CSS ด้วย `@theme` ไม่มี `tailwind.config.js` |

**ก่อนเขียนโค้ดที่เกี่ยวกับ Next หรือ Prisma ให้เปิดเอกสารในเครื่องก่อน อย่าเขียนจากความจำ**

- Next.js: `node_modules/next/dist/docs/01-app/`
- Prisma: `.agents/skills/prisma-*/SKILL.md`

---

## 9. เทสต์ — เทสต์อะไร และทำไมเทสต์แบบนั้น

```bash
npm run test         # รันครั้งเดียว
npm run test:watch   # รันใหม่อัตโนมัติตอนแก้โค้ด
```

แบ่งเป็น 2 กลุ่มด้วยเหตุผลต่างกัน:

**กลุ่มที่ 1 — pure function** (`src/**/*.test.ts`)
`format.ts`, `job-filters.ts`, `rate-limit.ts` — ใส่อะไรเข้าไปได้อะไรออกมาแน่นอน
เทสต์เน้น **เคสขอบ** ไม่ใช่เคสปกติ เช่น เงินเดือน `0` (ค่า falsy ที่ทำให้ `||` พัง),
วันที่ในอนาคต, `?page=-5`, `?type=DROP TABLE`

**กลุ่มที่ 2 — ด่านกันสิทธิ์ ต่อ DB จริง** (`tests/authorization.test.ts`)
เทสต์ว่าเงื่อนไข `where` กันข้อมูลได้จริงไหม เช่น "บริษัทอื่นแก้ประกาศเราได้ไหม"

> **ทำไมไม่ mock Prisma:** สิ่งที่กำลังเทสต์คือตัว `where` เอง
> ถ้า mock ทิ้งก็เท่ากับเทสต์ mock ของตัวเอง ไม่ได้พิสูจน์อะไรเลย
> — เทสต์ที่ผ่านแต่ไม่ได้พิสูจน์อะไร แย่กว่าไม่มีเทสต์ เพราะให้ความมั่นใจผิด ๆ

เทสต์กลุ่มนี้สร้างข้อมูลของตัวเองด้วย prefix `authz-test-` แล้วลบทิ้งเมื่อจบ
จึงไม่แตะข้อมูล seed และรันซ้ำได้เรื่อย ๆ

---

## 10. อยากเพิ่มฟีเจอร์ใหม่ ทำตามลำดับนี้

1. **แก้ `schema.prisma`** ถ้าต้องเก็บข้อมูลใหม่ → `npm run db:migrate`
2. **เขียน query ใน `src/lib/`** — ฝังเงื่อนไขสิทธิ์ไว้ใน `where` ตั้งแต่ต้น
3. **เขียน Zod schema ใน `src/lib/validation/`** ถ้ามีข้อมูลเข้าจากผู้ใช้
4. **เขียน Server Action ใน `src/lib/actions/`** — ขึ้นต้นด้วย `requireUser`/`requireRole`
5. **เขียนหน้าใน `src/app/`** — ให้ `page.tsx` บางที่สุด เรียกของจาก `lib/` มาแสดง
6. **เขียนเทสต์** ถ้าเป็น logic ที่มีเคสขอบ หรือเป็นด่านกันสิทธิ์
7. **ตรวจ** `lint` → `typecheck` → `test` → `build` → **ยิง request จริงดู status code**
8. **อัปเดต [PROGRESS.md](PROGRESS.md)** แล้ว commit

> ข้อ 6 สำคัญกว่าที่คิด — บั๊กที่เจอในโปรเจคนี้เกือบทั้งหมด
> (404 ที่ตอบ status 200, หน้าที่ถูกอบเป็น static, ไฟล์ใหญ่ที่โดนตัดก่อนถึงโค้ดเรา)
> **มองด้วยตาเปล่าจากหน้าเว็บไม่เห็นเลยสักอัน**
