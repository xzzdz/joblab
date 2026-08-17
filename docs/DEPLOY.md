# ขึ้น production — ทำตามนี้ทีละขั้น

> ใช้ Neon (ฐานข้อมูล) + Vercel (เว็บ) ทั้งคู่มีแพ็กเกจฟรีที่พอสำหรับโปรเจคนี้

---

## ก่อนเริ่ม — ตรวจว่าพร้อมจริง

```bash
npm run lint && npm run typecheck && npm run test && npm run build
```

ทั้ง 4 ต้องผ่าน ถ้าอันไหนพังให้แก้ก่อน อย่าเพิ่ง deploy

---

## ขั้นที่ 1 — สร้างฐานข้อมูลบน Neon

1. สมัครที่ https://neon.com (ล็อกอินด้วย GitHub ได้)
2. สร้าง project ชื่อ `joblab` เลือก region ที่ใกล้ไทยที่สุด (Singapore)
3. คัดลอก **connection string** แบบ pooled มาเก็บไว้ หน้าตาประมาณ:
   ```
   postgresql://user:password@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```

> ใช้ตัวที่มีคำว่า `-pooler` เสมอ เพราะ serverless เปิด-ปิด connection ถี่มาก
> ถ้าต่อตรงไม่ผ่าน pooler จะชน connection limit เร็วกว่าที่คิด

### ตรวจว่า extension ที่เราใช้เปิดได้

โปรเจคนี้ใช้ `pg_trgm` สำหรับ index การค้นหา (ดู migration `..._add_job_title_trigram_index`)
Neon เปิดให้ใช้อยู่แล้ว แต่ควรยืนยันก่อน — ถ้า extension เปิดไม่ได้ migration จะล้มกลางทาง:

```sql
-- รันใน SQL Editor ของ Neon
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

---

## ขั้นที่ 2 — เตรียมค่าลับ

สร้าง `AUTH_SECRET` ตัวใหม่สำหรับ production (**ห้ามใช้ตัวเดียวกับตอน dev**):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## ขั้นที่ 3 — deploy บน Vercel

1. สมัครที่ https://vercel.com ด้วยบัญชี GitHub เดียวกับที่เก็บ repo
2. **Add New → Project** แล้วเลือก repo `joblab`
3. ในหน้า config ก่อนกด Deploy ให้ใส่ **Environment Variables**:

   | ชื่อ | ค่า |
   |---|---|
   | `DATABASE_URL` | connection string จาก Neon (ตัว pooler) |
   | `AUTH_SECRET` | ค่าที่เพิ่งสร้างในขั้นที่ 2 |

4. กด **Deploy**

### สิ่งที่เกิดขึ้นตอน build

`package.json` มี script ชื่อ `vercel-build` ซึ่ง Vercel จะเรียกแทน `build`:

```json
"vercel-build": "prisma migrate deploy && next build"
```

แปลว่าทุกครั้งที่ deploy ระบบจะ **รัน migration ที่ยังไม่เคยรันให้อัตโนมัติ** ก่อนค่อย build
จึงไม่ต้องเข้าไปรัน migration เองด้วยมือ

> ใช้ `migrate deploy` ไม่ใช่ `migrate dev` เพราะ `deploy` ไม่โต้ตอบ ไม่สร้าง migration ใหม่
> และไม่มีทางรีเซ็ตฐานข้อมูลทิ้ง — สามข้อนี้จำเป็นทั้งหมดสำหรับ production

---

## ขั้นที่ 4 — ใส่ข้อมูลตัวอย่าง (ถ้าจะใช้เป็นผลงานให้คนเข้ามาลอง)

รันจากเครื่องตัวเอง โดยชี้ `DATABASE_URL` ไปที่ Neon ชั่วคราว:

```bash
# Git Bash / macOS / Linux
DATABASE_URL="<connection string ของ Neon>" npm run db:seed
```

```powershell
# PowerShell
$env:DATABASE_URL="<connection string ของ Neon>"; npm run db:seed
```

seed เขียนแบบ idempotent จึงรันซ้ำได้โดยไม่เกิดข้อมูลซ้ำ

> ⚠️ ระวังอย่าเผลอรัน `npm run db:reset` ตอนที่ `DATABASE_URL` ชี้ไป production
> คำสั่งนั้นล้างฐานข้อมูลทั้งหมด

---

## ขั้นที่ 5 — ตรวจหลัง deploy

เปิดเว็บที่ได้แล้วไล่เช็ค:

- [ ] หน้า `/jobs` แสดงประกาศงาน
- [ ] กดเข้าไปดูรายละเอียดได้
- [ ] ล็อกอินด้วย `seeker@joblab.dev` / `Password123!` ได้
- [ ] สมัครงานพร้อมแนบ PDF ได้ แล้วเปิดไฟล์กลับมาดูได้
- [ ] ล็อกอินด้วย `employer@joblab.dev` แล้วเปิดบอร์ดผู้สมัครได้
- [ ] เปิด URL มั่ว ๆ แล้วได้หน้า 404 (ไม่ใช่หน้า error ดิบ)

ตรวจ header ด้วย:

```bash
curl -sI https://<โดเมนของคุณ>/jobs | grep -i "x-frame-options\|x-content-type"
```

---

## ปัญหาที่มักเจอ

| อาการ | สาเหตุ | วิธีแก้ |
|---|---|---|
| build ล้มที่ `prisma migrate deploy` | `DATABASE_URL` ผิดหรือยังไม่ได้ใส่ | ตรวจ Environment Variables ใน Vercel |
| `type "gin_trgm_ops" does not exist` | ยังไม่ได้เปิด extension | รัน `CREATE EXTENSION pg_trgm;` ใน Neon |
| ล็อกอินแล้วเด้งกลับหน้า login | `AUTH_SECRET` ไม่ตรงกันระหว่าง build กับ runtime | ตั้งค่าใน Vercel แล้ว redeploy |
| `Too many connections` | ใช้ connection string ที่ไม่ผ่าน pooler | เปลี่ยนไปใช้ตัวที่มี `-pooler` |
| แก้ env แล้วไม่มีผล | Vercel ต้อง build ใหม่ | กด Redeploy |

---

## ข้อจำกัดที่ยังเหลืออยู่ (บันทึกไว้ให้รู้ตัว)

1. **ไฟล์ resume เก็บใน Postgres** เหมาะกับไฟล์เล็กและจำนวนไม่มาก
   ถ้าโตขึ้นจริงต้องย้ายไป object storage — แก้แค่ `src/lib/storage.ts`
2. **rate limit เก็บใน memory ของแต่ละ instance** บน Vercel ที่รันหลาย instance
   คนโจมตีจะได้โควตาเท่ากับ จำนวน instance × เพดานที่ตั้งไว้
   ของจริงต้องย้ายไปเก็บที่ Redis ที่ทุก instance เห็นร่วมกัน
3. **ยังไม่มีระบบรวบรวม error** — ตอนนี้ `error.tsx` แค่ `console.error`
   ควรต่อกับบริการอย่าง Sentry เพื่อให้รู้ว่ามีอะไรพังบน production
