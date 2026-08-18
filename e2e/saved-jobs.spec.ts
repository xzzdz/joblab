import { expect, test } from "@playwright/test";

import { EMPLOYER_EMAIL, SEEKER_EMAIL, clearSavedJobs, login, openFirstJob } from "./helpers";

/**
 * เทสต์ฟีเจอร์บันทึกงาน
 *
 * ปุ่มบันทึกเป็น Client Component ที่เรียก Server Action ผ่าน `useTransition`
 * ไม่ใช่ `<form>` จึงทดสอบด้วยการยิง HTTP ไม่ได้ — ต้องกดจริงในเบราว์เซอร์
 * นี่คือเหตุผลที่โปรเจคนี้ต้องมี Playwright ไม่ใช่มีแค่ Vitest
 */

test.describe("บันทึกงานที่สนใจ", () => {
  test("กดบันทึกแล้วงานไปโผล่ในหน้ารายการที่บันทึกไว้", async ({ page }) => {
    await login(page, SEEKER_EMAIL);

    // เริ่มจากสภาพสะอาด — เอาของที่บันทึกไว้ออกให้หมดก่อน
    await clearSavedJobs(page);

    // ไปหน้ารายละเอียดงานแล้วกดบันทึก
    await openFirstJob(page);
    const jobTitle = await page.locator("h1").innerText();

    const saveButton = page.getByRole("button", { name: "บันทึกงานนี้" });
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    // ปุ่มต้องเปลี่ยนข้อความทันที (optimistic UI)
    await expect(page.getByRole("button", { name: "บันทึกไว้แล้ว" })).toBeVisible();

    // แล้วงานต้องไปโผล่ในหน้ารายการจริง
    await page.goto("/saved");
    await expect(page.getByRole("heading", { name: jobTitle })).toBeVisible();
    await expect(page.getByText("1 รายการ")).toBeVisible();
  });

  test("กดซ้ำแล้วเอาออกจากรายการ", async ({ page }) => {
    await login(page, SEEKER_EMAIL);
    await openFirstJob(page);

    // ให้แน่ใจว่าอยู่ในสถานะ "บันทึกแล้ว" ก่อน
    const save = page.getByRole("button", { name: "บันทึกงานนี้" });
    if (await save.isVisible()) await save.click();
    await expect(page.getByRole("button", { name: "บันทึกไว้แล้ว" })).toBeVisible();

    // กดอีกครั้งเพื่อเอาออก
    await page.getByRole("button", { name: "บันทึกไว้แล้ว" }).click();
    await expect(page.getByRole("button", { name: "บันทึกงานนี้" })).toBeVisible();

    await page.goto("/saved");
    await expect(page.getByText("ยังไม่มีงานที่บันทึกไว้")).toBeVisible();
  });

  test("สถานะปุ่มคงอยู่หลังรีโหลดหน้า", async ({ page }) => {
    await login(page, SEEKER_EMAIL);
    const slug = await openFirstJob(page);

    const save = page.getByRole("button", { name: "บันทึกงานนี้" });
    if (await save.isVisible()) await save.click();
    await expect(page.getByRole("button", { name: "บันทึกไว้แล้ว" })).toBeVisible();

    /**
     * รีโหลดแล้วปุ่มต้องยังบอกว่าบันทึกไว้แล้ว
     *
     * ข้อนี้สำคัญเพราะ optimistic UI เปลี่ยนหน้าตาได้ทันทีโดยที่ข้อมูลอาจไม่ได้ถูกบันทึกจริง
     * การรีโหลดคือการถามฐานข้อมูลใหม่ทั้งหมด — พิสูจน์ว่าข้อมูลลงจริง ไม่ใช่แค่ UI หลอกตา
     */
    await page.goto(`/jobs/${slug}`);
    await expect(page.getByRole("button", { name: "บันทึกไว้แล้ว" })).toBeVisible();

    // เก็บกวาด
    await page.getByRole("button", { name: "บันทึกไว้แล้ว" }).click();
    await expect(page.getByRole("button", { name: "บันทึกงานนี้" })).toBeVisible();
  });

  test("บัญชีบริษัทไม่เห็นปุ่มบันทึกและเข้าหน้ารายการไม่ได้", async ({ page }) => {
    await login(page, EMPLOYER_EMAIL);
    await openFirstJob(page);

    // ปุ่มบันทึกต้องไม่มีเลย ไม่ใช่มีแล้วกดไม่ได้
    await expect(page.getByRole("button", { name: /บันทึกงานนี้|บันทึกไว้แล้ว/ })).toHaveCount(0);

    await page.goto("/saved");
    // ถูกเด้งออกไปหน้าอื่น (requireRole พาไป /jobs)
    await expect(page).not.toHaveURL(/\/saved/);
  });

  test("คนที่ยังไม่ล็อกอินไม่เห็นปุ่มบันทึก", async ({ page }) => {
    await openFirstJob(page);
    await expect(page.getByRole("button", { name: /บันทึกงานนี้|บันทึกไว้แล้ว/ })).toHaveCount(0);

    await page.goto("/saved");
    await expect(page).toHaveURL(/\/login/);
  });
});
