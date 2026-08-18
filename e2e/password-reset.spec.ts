import { expect, test } from "@playwright/test";

/**
 * เทสต์ flow ลืมรหัสผ่าน
 *
 * ทดสอบเฉพาะส่วนที่เห็นจากฝั่งผู้ใช้ ไม่แตะฐานข้อมูลตรง ๆ
 * (การตรวจว่า token ถูกเก็บเป็นแฮชและใช้ได้ครั้งเดียว อยู่ใน Vitest ที่ tests/password-reset.test.ts)
 */

test.describe("ลืมรหัสผ่าน", () => {
  test("มีทางเข้าจากหน้าเข้าสู่ระบบ", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "ลืมรหัสผ่าน?" }).click();
    await expect(page).toHaveURL(/\/forgot-password/);
    await expect(page.getByRole("heading", { name: "ลืมรหัสผ่าน" })).toBeVisible();
  });

  test("อีเมลที่มีบัญชีจริงกับที่ไม่มี ได้คำตอบเหมือนกันเป๊ะ", async ({ page }) => {
    /**
     * ข้อนี้เป็นเรื่องความปลอดภัย ไม่ใช่ความสวยงาม
     *
     * ถ้าข้อความต่างกัน หน้านี้จะกลายเป็นเครื่องมือให้คนไล่เช็คว่าอีเมลไหนมีบัญชีในระบบ
     * ซึ่งเอาไปใช้ต่อได้ (ส่งอีเมลหลอก, ไล่เดารหัสผ่านเฉพาะบัญชีที่มีจริง)
     */
    await page.goto("/forgot-password");
    await page.getByLabel("อีเมลที่ใช้สมัคร").fill("seeker@joblab.dev");
    await page.getByRole("button", { name: "ส่งลิงก์ตั้งรหัสผ่านใหม่" }).click();
    const realAnswer = await page.getByRole("status").innerText();

    await page.goto("/forgot-password");
    /**
     * ต้องใช้อีเมลตัวอักษรอังกฤษ
     * Chrome ปฏิเสธค่าที่มีอักษรไทยใน <input type="email"> ตั้งแต่ก่อนส่งฟอร์ม
     * (ขึ้นข้อความ "A part followed by '@' should not contain the symbol ...")
     * ถ้าใช้อีเมลไทย ฟอร์มจะไม่เคยถูกส่งเลย แล้วเทสต์จะรอ response ที่ไม่มีวันมา
     */
    await page.getByLabel("อีเมลที่ใช้สมัคร").fill("nobody-does-not-exist@example.test");
    await page.getByRole("button", { name: "ส่งลิงก์ตั้งรหัสผ่านใหม่" }).click();
    const fakeAnswer = await page.getByRole("status").innerText();

    expect(fakeAnswer).toBe(realAnswer);
  });

  /**
   * เดิมมีเทสต์ที่พยายามปิด validation ของเบราว์เซอร์ (แก้ type="email" เป็น "text")
   * เพื่อทดสอบว่าฝั่ง server ตรวจอีเมลเองด้วย — **ใช้ไม่ได้**
   * เพราะ React เขียน attribute กลับเป็น email ทันทีที่ re-render เบราว์เซอร์จึงบล็อกอีก
   *
   * ย้ายไปทดสอบที่ชั้นที่ถูกต้องกว่าแล้ว: src/lib/validation/password-reset.test.ts ทดสอบ Zod schema ตรง ๆ
   * ซึ่งเป็นตัวที่ทำงานฝั่ง server จริง — เร็วกว่า ไม่เปราะ และตรงประเด็นกว่า
   */

  test("ลิงก์ที่ไม่ถูกต้องบอกสาเหตุและให้ขอใหม่ได้", async ({ page }) => {
    await page.goto("/reset-password?token=token-ที่ไม่มีจริง");
    await expect(page.getByRole("heading", { name: "ลิงก์นี้ไม่ถูกต้อง" })).toBeVisible();

    await page.getByRole("link", { name: "ขอลิงก์ใหม่" }).click();
    await expect(page).toHaveURL(/\/forgot-password/);
  });

  test("เข้าหน้าตั้งรหัสผ่านโดยไม่มี token เลย ก็ไม่พัง", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(page.getByRole("heading", { name: "ลิงก์นี้ไม่ถูกต้อง" })).toBeVisible();
  });

  test("หน้าตั้งรหัสผ่านสั่งไม่ให้ search engine เก็บ", async ({ page }) => {
    /**
     * URL ของหน้านี้มี token ที่เท่ากับกุญแจบัญชีอยู่ข้างใน
     * ถ้าถูกเก็บเข้า index จะกลายเป็นข้อมูลสาธารณะ
     */
    const response = await page.goto("/reset-password?token=x");
    expect(response?.status()).toBe(200);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/
    );
  });
});
