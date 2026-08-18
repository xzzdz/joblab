import { describe, expect, it } from "vitest";

import { performResetSchema, requestResetSchema } from "@/lib/validation/password-reset";

/**
 * เทสต์ Zod schema ของการตั้งรหัสผ่านใหม่
 *
 * **ย้ายมาจาก E2E** เพราะทดสอบที่ชั้นนั้นไม่ได้จริง:
 * พยายามปิด validation ของเบราว์เซอร์ด้วยการแก้ `type="email"` เป็น `"text"`
 * แต่ React เขียน attribute กลับทันทีที่ re-render เบราว์เซอร์จึงบล็อกฟอร์มอีก
 * ทำให้ไม่มีทางส่งค่าที่ผิดรูปแบบไปถึง server ผ่านเบราว์เซอร์เลย
 *
 * ทดสอบ schema ตรง ๆ ตรงประเด็นกว่า เพราะนี่คือตัวที่ทำงานฝั่ง server จริง
 * — และมันสำคัญ เพราะคนที่ยิง request ตรงเข้ามาไม่ได้ผ่านเบราว์เซอร์
 */

describe("requestResetSchema", () => {
  it("อีเมลที่ถูกต้องผ่าน", () => {
    expect(requestResetSchema.safeParse({ email: "someone@example.com" }).success).toBe(true);
  });

  it("แปลงเป็นตัวพิมพ์เล็กให้", () => {
    const result = requestResetSchema.parse({ email: "Someone@Example.COM" });
    // ถ้าไม่แปลง คนที่สมัครด้วย a@b.com จะขอรีเซ็ตด้วย A@B.com ไม่ได้
    expect(result.email).toBe("someone@example.com");
  });

  it("ค่าที่ไม่ใช่อีเมลถูกปฏิเสธ", () => {
    for (const bad of ["ไม่ใช่อีเมล", "abc", "@example.com", "a@", "", "a b@c.com"]) {
      expect(requestResetSchema.safeParse({ email: bad }).success).toBe(false);
    }
  });

  it("ไม่ส่งค่ามาเลยก็ถูกปฏิเสธ", () => {
    expect(requestResetSchema.safeParse({}).success).toBe(false);
  });
});

describe("performResetSchema", () => {
  const valid = {
    token: "token-สมมติ",
    password: "Password123!",
    confirmPassword: "Password123!",
  };

  it("ข้อมูลถูกต้องผ่าน", () => {
    expect(performResetSchema.safeParse(valid).success).toBe(true);
  });

  it("รหัสผ่านสองช่องไม่ตรงกันถูกปฏิเสธ พร้อมชี้ที่ช่องยืนยัน", () => {
    const result = performResetSchema.safeParse({ ...valid, confirmPassword: "อย่างอื่น" });
    expect(result.success).toBe(false);
    if (!result.success) {
      // error ต้องไปโผล่ใต้ช่องยืนยัน ไม่ใช่ใต้ช่องรหัสผ่าน
      expect(result.error.issues[0].path).toEqual(["confirmPassword"]);
    }
  });

  it("รหัสผ่านสั้นกว่า 8 ตัวถูกปฏิเสธ", () => {
    const short = "Pass1!";
    expect(
      performResetSchema.safeParse({ ...valid, password: short, confirmPassword: short }).success
    ).toBe(false);
  });

  it("รหัสผ่านยาวเกิน 72 ตัวถูกปฏิเสธ", () => {
    /**
     * bcrypt สนใจแค่ 72 ไบต์แรก ส่วนที่เกินถูกตัดทิ้งเงียบ ๆ
     * ถ้าไม่จำกัด ผู้ใช้จะเข้าใจผิดว่ารหัสยาว ๆ ปลอดภัยกว่า ทั้งที่ตัวจริงถูกตัดไปแล้ว
     * (เงื่อนไขต้องตรงกับตอนสมัครสมาชิก ไม่งั้นจะตั้งรหัสที่ล็อกอินไม่ได้)
     */
    const long = "a".repeat(73);
    expect(
      performResetSchema.safeParse({ ...valid, password: long, confirmPassword: long }).success
    ).toBe(false);
  });

  it("ไม่มี token ถูกปฏิเสธ", () => {
    expect(performResetSchema.safeParse({ ...valid, token: "" }).success).toBe(false);
  });
});
