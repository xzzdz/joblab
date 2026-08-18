import { defineConfig, devices } from "@playwright/test";

/**
 * ตั้งค่า Playwright — เทสต์แบบ "กดปุ่มจริงในเบราว์เซอร์จริง"
 *
 * **ทำไมต้องมี ทั้งที่มี Vitest 58 ข้อแล้ว:**
 * Vitest ทดสอบตรรกะและเงื่อนไข `where` ได้ดี แต่มีสิ่งที่มันแตะไม่ถึงเลย —
 * ปุ่มที่เป็น Client Component เรียก Server Action ผ่าน `useTransition`
 * ไม่ใช่ `<form>` จึงไม่มีอะไรให้ยิง HTTP ใส่ตรง ๆ ได้
 *
 * ตอนแรกพยายาม replay ผ่าน HTTP แล้วพบว่าเทสต์ที่เขียนไว้ "ผ่าน" ทั้งที่ไม่ได้ทดสอบอะไรเลย
 * (ไปยิงใส่ action ของปุ่มออกจากระบบที่อยู่บนหน้าเดียวกันแทน แล้วจำนวนแถวเป็น 0 ทั้งก่อนและหลัง)
 * — **เทสต์ที่ผ่านแบบผิด ๆ แย่กว่าไม่มีเทสต์** เพราะให้ความมั่นใจที่ไม่มีอยู่จริง
 */
export default defineConfig({
  testDir: "./e2e",
  // ทดสอบกับฐานข้อมูลจริงเครื่องเดียว จึงรันทีละไฟล์กันแย่งข้อมูลกันเอง
  fullyParallel: false,
  workers: 1,
  // ล้มแล้วลองใหม่ 1 ครั้งบน CI (เครื่อง CI ช้ากว่า บางทีแค่รอไม่ทัน)
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "line" : "list",

  use: {
    baseURL: "http://localhost:3000",
    // เก็บร่องรอยไว้เฉพาะตอนล้ม เพื่อเปิดดูย้อนหลังได้ว่าเกิดอะไรขึ้น
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  /**
   * ให้ Playwright เปิด dev server ให้เอง
   * `reuseExistingServer` = ถ้ามี server รันอยู่แล้วก็ใช้ตัวนั้น ไม่ต้องเปิดซ้อน
   */
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/jobs",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
