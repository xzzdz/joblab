/**
 * ไฟล์ loading.tsx จะถูกแสดงอัตโนมัติระหว่างที่ page.tsx ในโฟลเดอร์เดียวกันรอข้อมูล
 * Next.js ห่อ page ด้วย <Suspense> ให้เอง เราแค่วางไฟล์ชื่อนี้ไว้
 *
 * ใช้ skeleton ที่หน้าตาใกล้เคียงของจริง ผู้ใช้จะรู้สึกว่าเว็บเร็วกว่า spinner หมุน ๆ
 *
 * ทำไมไฟล์นี้ต้องอยู่ในโฟลเดอร์ (list):
 * ชื่อโฟลเดอร์ในวงเล็บคือ "route group" — ไม่มีผลกับ URL (หน้านี้ยังเป็น /jobs เหมือนเดิม)
 * แต่ถ้าวาง loading.tsx ไว้ที่ app/jobs/ ตรง ๆ มันจะครอบหน้า /jobs/[slug] ไปด้วย
 * ทำให้ Next เริ่ม stream response ทันที แล้ว "ล็อก" HTTP status ไว้ที่ 200
 * พอ notFound() ทำงานทีหลัง หน้าตาเป็น 404 แต่ status จริงยังเป็น 200
 * ซึ่งทำให้ Google เก็บหน้า 404 เข้า index — บั๊กที่มองด้วยตาไม่เห็น
 */
export default function JobsLoading() {
  return (
    <div>
      <div className="mb-6">
        <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-4 w-40 animate-pulse rounded bg-slate-200" />
      </div>

      <ul className="grid gap-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <li key={index} className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200" />
            <div className="mt-2 h-4 w-1/3 animate-pulse rounded bg-slate-200" />
            <div className="mt-3 flex gap-2">
              <div className="h-6 w-24 animate-pulse rounded-full bg-slate-100" />
              <div className="h-6 w-20 animate-pulse rounded-full bg-slate-100" />
              <div className="h-6 w-20 animate-pulse rounded-full bg-slate-100" />
            </div>
            <div className="mt-3 h-4 w-48 animate-pulse rounded bg-slate-200" />
          </li>
        ))}
      </ul>
    </div>
  );
}
