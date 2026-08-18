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

## เปิดใช้ล็อกอินด้วย Google (ไม่บังคับ)

โค้ดพร้อมแล้ว เหลือแค่ขอ credential จาก Google แล้วใส่ค่า 2 ตัว
**ถ้าไม่ทำ เว็บก็ยังใช้งานได้ปกติ** แค่ไม่มีปุ่ม "เข้าสู่ระบบด้วย Google"

> Google เปลี่ยนหน้าตาเมนูบ่อยมาก ชื่อเมนูอาจไม่ตรงเป๊ะกับที่เขียนไว้
> ให้มองหา **คำสำคัญ** แทน เช่น "OAuth", "Credentials", "Client ID"

### ขั้นที่ 1 — สร้างโปรเจคใน Google Cloud

1. เข้า https://console.cloud.google.com
2. มุมบนซ้ายข้าง ๆ โลโก้ มีปุ่มเลือกโปรเจค → กด → **New Project**
3. ตั้งชื่อ `joblab` → **Create** → รอสักครู่แล้วเลือกโปรเจคนี้ให้เป็นโปรเจคปัจจุบัน

### ขั้นที่ 2 — ตั้งค่าหน้าขออนุญาต (OAuth consent screen)

เมนูซ้าย → **APIs & Services** → **OAuth consent screen**
(บางบัญชีจะเห็นเป็น **Google Auth Platform** → **Branding**)

1. **User Type / Audience** เลือก **External** → Create
2. กรอกเท่าที่บังคับ:
   - App name: `JobLab`
   - User support email: อีเมลของคุณ
   - Developer contact email: อีเมลของคุณ
3. หน้า **Scopes** ไม่ต้องเพิ่มอะไร กด Save and Continue ผ่านไป
   (เราขอแค่ `openid email profile` ซึ่งเป็นค่าพื้นฐานอยู่แล้ว)
4. หน้า **Test users** → **Add users** → ใส่อีเมล Google ของคุณเอง

> ⚠️ **ข้อนี้สำคัญและคนพลาดบ่อยที่สุด**
> ตอนแรกแอปจะอยู่สถานะ **Testing** ซึ่ง **เฉพาะอีเมลที่อยู่ในรายการ Test users เท่านั้นที่ล็อกอินได้**
> คนอื่นจะเจอหน้า "Access blocked" ทันที
>
> ถ้าอยากให้ใครก็ล็อกอินได้ ต้องกด **Publish app** (สำหรับ scope พื้นฐานแบบเรา
> ไม่ต้องผ่านการตรวจสอบของ Google) — แต่ถ้าใช้เป็นผลงานให้คนดูเฉย ๆ
> ปล่อยเป็น Testing แล้วเพิ่มอีเมลตัวเองก็พอ

### ขั้นที่ 3 — สร้าง OAuth Client ID

เมนูซ้าย → **APIs & Services** → **Credentials**

1. ปุ่มด้านบน **+ Create Credentials** → **OAuth client ID**
2. **Application type** เลือก **Web application**
3. Name: `JobLab Web`
4. **Authorized JavaScript origins** → Add URI ทีละอัน:
   ```
   http://localhost:3000
   https://joblab.vercel.app
   ```
5. **Authorized redirect URIs** → Add URI ทีละอัน:
   ```
   http://localhost:3000/api/auth/callback/google
   https://joblab.vercel.app/api/auth/callback/google
   ```

> ⚠️ **redirect URI ต้องตรงกันทุกตัวอักษร** — Google เทียบแบบเป๊ะ ๆ
> ผิดแม้แต่ `/` ท้ายสุด หรือ `http` กับ `https` ก็จะขึ้น `redirect_uri_mismatch`
>
> เส้นทาง `/api/auth/callback/google` มาจากไหน:
> `/api/auth/` คือ route handler ของ Auth.js · `callback` คือขั้นตอนรับผลกลับ ·
> `google` คือชื่อ provider ที่เราลงทะเบียนไว้ใน `src/lib/auth.ts`
> ถ้าเปลี่ยนชื่อ provider ต้องมาแก้ตรงนี้ด้วย

6. กด **Create** → จะมีกล่องเด้งขึ้นมาแสดง **Client ID** และ **Client secret**
   **คัดลอกเก็บไว้ทั้งสองค่า** (secret กดดูย้อนหลังได้จากหน้า Credentials)

### ขั้นที่ 4 — ใส่ค่าใน Vercel

1. เข้า https://vercel.com → เลือกโปรเจค **joblab**
2. แท็บ **Settings** → เมนูซ้าย **Environment Variables**
3. เพิ่มทีละตัว (กด **Add** / **Save** หลังใส่แต่ละอัน):

   | Key | Value |
   |---|---|
   | `AUTH_GOOGLE_ID` | Client ID ที่ได้มา (ลงท้ายด้วย `.apps.googleusercontent.com`) |
   | `AUTH_GOOGLE_SECRET` | Client secret ที่ได้มา |

   ให้ติ๊กครบทั้ง **Production**, **Preview**, **Development**

4. **ต้อง deploy ใหม่ถึงจะมีผล** — env ถูกอ่านตอน build
   ไปแท็บ **Deployments** → กดจุดสามจุดของ deployment ล่าสุด → **Redeploy**

### ขั้นที่ 5 — ทดสอบบนเครื่องตัวเองด้วย (ไม่บังคับ)

เปิดไฟล์ `.env` แล้วเติม 2 บรรทัด:

```bash
AUTH_GOOGLE_ID="ค่าที่ได้มา.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="ค่าที่ได้มา"
```

แล้ว **รีสตาร์ต dev server** (Ctrl+C แล้ว `npm run dev` ใหม่ — env อ่านตอนเริ่มเท่านั้น)
เปิด http://localhost:3000/login จะเห็นปุ่ม "เข้าสู่ระบบด้วย Google" โผล่มา

### ตรวจว่าสำเร็จไหม

- [ ] หน้า `/login` มีปุ่ม "เข้าสู่ระบบด้วย Google"
- [ ] กดแล้วเด้งไปหน้าเลือกบัญชีของ Google
- [ ] เลือกบัญชีแล้วกลับมาที่ `/jobs` โดยล็อกอินอยู่
- [ ] เปิด `/account` เห็นชื่อและอีเมลจากบัญชี Google

### ปัญหาที่มักเจอ

| ข้อความที่เห็น | สาเหตุ | วิธีแก้ |
|---|---|---|
| `redirect_uri_mismatch` | URI ใน Google ไม่ตรงกับที่แอปส่งไป | คัดลอก URI จากข้อความ error ไปวางใน Authorized redirect URIs ตรง ๆ |
| `Access blocked: JobLab has not completed verification` | แอปอยู่สถานะ Testing และอีเมลนี้ไม่อยู่ใน Test users | เพิ่มอีเมลใน Test users หรือกด Publish app |
| ปุ่มไม่โผล่เลย | env ยังไม่มีค่า หรือยังไม่ได้ deploy/restart ใหม่ | ตรวจว่าใส่ครบ 2 ตัว แล้ว Redeploy |
| `invalid_client` | คัดลอก Client ID/secret มาไม่ครบหรือมีช่องว่างติดมา | คัดลอกใหม่ ระวังช่องว่างหัว-ท้าย |
| ล็อกอินแล้วเด้งกลับหน้า login | `AUTH_SECRET` ไม่ตรงกันหรือหาย | ตรวจ Environment Variables แล้ว Redeploy |

---

## ข้อจำกัดที่ยังเหลืออยู่ (บันทึกไว้ให้รู้ตัว)

1. **ไฟล์ resume เก็บใน Postgres** เหมาะกับไฟล์เล็กและจำนวนไม่มาก
   ถ้าโตขึ้นจริงต้องย้ายไป object storage — แก้แค่ `src/lib/storage.ts`
2. **rate limit เก็บใน memory ของแต่ละ instance** บน Vercel ที่รันหลาย instance
   คนโจมตีจะได้โควตาเท่ากับ จำนวน instance × เพดานที่ตั้งไว้
   ของจริงต้องย้ายไปเก็บที่ Redis ที่ทุก instance เห็นร่วมกัน
3. **ยังไม่มีระบบรวบรวม error** — ตอนนี้ `error.tsx` แค่ `console.error`
   ควรต่อกับบริการอย่าง Sentry เพื่อให้รู้ว่ามีอะไรพังบน production
