import { defineConfig } from "vitest/config";

/**
 * ตั้งค่า Vitest
 *
 * นามสกุลเป็น `.mts` เพราะไฟล์นี้เขียนด้วย ESM แต่ package.json ไม่ได้ตั้ง `"type": "module"`
 * ถ้าใช้ `.ts` เฉย ๆ Vite รุ่นใหม่จะเตือนว่าโหลดไฟล์ ESM แบบ CommonJS
 */
export default defineConfig({
  resolve: {
    // อ่าน path alias (`@/...`) จาก tsconfig.json ที่มีอยู่แล้ว ไม่ต้องตั้งซ้ำสองที่
    // Vite รองรับเองแล้ว จึงไม่ต้องลง plugin เพิ่ม
    tsconfigPaths: true,

    alias: {
      /**
       * `server-only` เป็นแพ็กเกจที่ตั้งใจ throw เมื่อถูก import จากฝั่ง client
       * เพื่อกันเราเผลอเอาโค้ดฝั่ง server ไปไว้ใน bundle ของ browser
       *
       * แต่ตอนรันเทสต์เราอยู่นอก Next.js ตัว resolver เลยเลือก entry ฝั่ง client มาให้
       * แล้ว throw ทันทีตั้งแต่ import — ทั้งที่โค้ดของเราไม่ได้ทำอะไรผิด
       *
       * แก้โดยชี้ให้เป็นโมดูลว่างตอนเทสต์ ซึ่งไม่ได้ลดความปลอดภัยลง
       * เพราะด่านจริงคือตอน `next build` ที่ยังตรวจให้เหมือนเดิม
       */
      "server-only": new URL("./tests/stubs/server-only.ts", import.meta.url).pathname,
    },
  },
  test: {
    // ใช้ environment ของ Node เพราะเทสต์ทั้งหมดเป็น logic ฝั่ง server
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    // ไฟล์เทสต์ที่ต่อฐานข้อมูลจริงต้องรันทีละไฟล์ ไม่งั้นจะแย่งข้อมูลกันเอง
    fileParallelism: false,
  },
});
