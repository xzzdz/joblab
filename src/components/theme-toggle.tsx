"use client";

/**
 * สคริปต์ที่ต้องรันก่อนหน้าเว็บถูกวาด
 *
 * ทำไมต้องเป็นสคริปต์ดิบ ๆ ที่ฝังในหน้า ไม่ใช่ useEffect:
 * useEffect ทำงานหลังเบราว์เซอร์วาดหน้าไปแล้วรอบหนึ่ง คนที่ตั้งค่าโหมดมืดไว้
 * จะเห็นหน้าขาวแวบหนึ่งก่อนแล้วค่อยเปลี่ยนเป็นดำ (flash of wrong theme)
 * แสบตามากเวลาเปิดเว็บตอนกลางคืน
 *
 * export ออกไปให้ layout ฝังไว้ใน <head>
 */
export const themeInitScript = `
(function () {
  try {
    var saved = localStorage.getItem('joblab-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', saved || (prefersDark ? 'dark' : 'light'));
  } catch (e) {
    // localStorage ถูกปิดในบางเบราว์เซอร์/โหมดส่วนตัว — ปล่อยเป็นโหมดสว่างไป ไม่ต้องทำให้หน้าพัง
  }
})();
`;

/**
 * ปุ่มสลับโหมดสว่าง/มืด
 *
 * **ตั้งใจไม่เก็บธีมไว้ใน state ของ React เลย** แหล่งความจริงเดียวคือ attribute
 * `data-theme` บน <html> ซึ่งสคริปต์ข้างบนตั้งไว้ก่อนหน้าถูกวาด
 *
 * เหตุผล: ถ้าเก็บใน state ต้องอ่านค่าจาก DOM ใน useEffect เพื่อให้ตรงกับของจริง
 * ซึ่งทำให้เกิด render รอบที่สองทุกครั้งที่โหลดหน้า (ESLint ของ React จับข้อนี้ได้ด้วย)
 * และเสี่ยง hydration mismatch เพราะ server ไม่รู้ว่าผู้ใช้เลือกโหมดอะไรไว้
 *
 * วิธีนี้แสดงไอคอนทั้งสองอันไว้เลย แล้วให้ **CSS** เลือกว่าจะโชว์อันไหน
 * ตาม `data-theme` — ไม่มี state ไม่มี effect ไม่มีการ render ซ้ำ
 */
export function ThemeToggle() {
  function toggle() {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";

    document.documentElement.setAttribute("data-theme", next);

    try {
      localStorage.setItem("joblab-theme", next);
    } catch {
      // จำค่าไม่ได้ก็ไม่เป็นไร โหมดยังเปลี่ยนได้ในหน้านี้
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      // ปุ่มที่มีแต่ไอคอนต้องมีชื่อกำกับ ไม่งั้น screen reader อ่านว่า "ปุ่ม" เฉย ๆ
      // ใช้ข้อความคงที่เพราะปุ่มนี้ทำหน้าที่ "สลับ" ไม่ว่าจะอยู่โหมดไหน
      aria-label="สลับโหมดสว่างและโหมดมืด"
      title="สลับโหมดสว่าง/มืด"
      className="grid h-11 w-11 cursor-pointer place-items-center border border-line text-ink-muted transition-colors duration-200 hover:border-line-strong hover:text-ink"
    >
      {/* ไอคอนเป็น SVG ไม่ใช่ emoji — emoji หน้าตาต่างกันในแต่ละระบบและเปลี่ยนสีตามธีมไม่ได้ */}
      <SunIcon className="hidden dark:block" />
      <MoonIcon className="block dark:hidden" />
    </button>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      // ไอคอนที่มีข้อความอธิบายอยู่แล้วต้องซ่อนจาก screen reader ไม่งั้นจะถูกอ่านซ้ำ
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}
