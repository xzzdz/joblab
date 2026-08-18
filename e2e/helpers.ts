import { expect, type Page } from "@playwright/test";

export const DEMO_PASSWORD = "Password123!";
export const SEEKER_EMAIL = "seeker@joblab.dev";
export const EMPLOYER_EMAIL = "employer@joblab.dev";

/**
 * ล็อกอินผ่านหน้าเว็บจริง — กรอกฟอร์มแล้วกดปุ่ม
 *
 * ไม่ยิง API ตรงเพื่อสร้าง session เพราะอยากให้เทสต์เดินผ่านเส้นทางเดียวกับผู้ใช้จริง
 * ถ้าหน้า login พังเมื่อไหร่ เทสต์ทุกอันที่ต้องล็อกอินจะล้มด้วย — ซึ่งถูกต้องแล้ว
 */
export async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("อีเมล").fill(email);
  await page.getByLabel("รหัสผ่าน").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();

  // รอจนออกจากหน้า login จริง ไม่ใช่รอเวลาเปล่า ๆ
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

/** เปิดหน้ารายละเอียดงานแรกในรายการ แล้วคืน slug ที่ได้ */
export async function openFirstJob(page: Page): Promise<string> {
  await page.goto("/jobs");
  const link = page.locator('a[href^="/jobs/"]').first();
  const href = await link.getAttribute("href");
  await link.click();
  await page.waitForURL(/\/jobs\/.+/);
  return href!.replace("/jobs/", "");
}

/**
 * เอางานที่บันทึกไว้ออกให้หมด เพื่อให้เทสต์เริ่มจากสภาพเดียวกันทุกครั้ง
 *
 * วนกดปุ่มแรกซ้ำ ๆ จนไม่มีปุ่มเหลือ — ไม่ใช้ `count()` มาคำนวณจำนวนที่คาดหวัง
 * เพราะ optimistic UI ทำให้จำนวนเปลี่ยนระหว่างที่เราอ่านค่า แล้วเงื่อนไขจะเพี้ยน
 * (เคยเขียนแบบนั้นแล้วเทสต์ล้มด้วยข้อความ "expected -1")
 */
export async function clearSavedJobs(page: Page) {
  await page.goto("/saved");
  const removeButton = page.getByRole("button", { name: /เอาออกจากรายการที่บันทึก/ });

  // จำกัดจำนวนรอบไว้ กันวนไม่จบถ้ามีอะไรผิดปกติ
  for (let i = 0; i < 30; i += 1) {
    if ((await removeButton.count()) === 0) break;
    await removeButton.first().click();
    await page.waitForTimeout(150);
  }

  await page.reload();
  await expect(page.getByText("ยังไม่มีงานที่บันทึกไว้")).toBeVisible();
}
