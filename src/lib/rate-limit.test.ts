import { describe, expect, it, vi } from "vitest";

import { formatRetryAfter, rateLimit } from "@/lib/rate-limit";

/**
 * เทสต์ตัวจำกัดจำนวนครั้ง
 *
 * ใช้ key ที่ไม่ซ้ำกันในแต่ละเทสต์ เพราะตัวนับเก็บใน Map ระดับโมดูล
 * ถ้าใช้ key เดียวกัน เทสต์จะรบกวนกันเอง — ปัญหาคลาสสิกของการเทสต์ของที่มี state
 */

let counter = 0;
const uniqueKey = () => `test-key-${counter++}-${Math.random()}`;

describe("rateLimit", () => {
  it("ยอมให้ทำได้จนครบโควตา", () => {
    const key = uniqueKey();
    expect(rateLimit(key, 3, 60_000).allowed).toBe(true);
    expect(rateLimit(key, 3, 60_000).allowed).toBe(true);
    expect(rateLimit(key, 3, 60_000).allowed).toBe(true);
  });

  it("ครั้งที่เกินโควตาถูกปฏิเสธ", () => {
    const key = uniqueKey();
    for (let i = 0; i < 3; i++) rateLimit(key, 3, 60_000);

    const blocked = rateLimit(key, 3, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("นับแยกกันตาม key", () => {
    const a = uniqueKey();
    const b = uniqueKey();

    rateLimit(a, 1, 60_000);
    expect(rateLimit(a, 1, 60_000).allowed).toBe(false);
    // key อื่นต้องไม่ได้รับผลกระทบ ไม่งั้นคนหนึ่งยิงรัว ๆ จะทำให้คนอื่นล็อกอินไม่ได้ด้วย
    expect(rateLimit(b, 1, 60_000).allowed).toBe(true);
  });

  it("โควตาคืนเมื่อหมดช่วงเวลา", () => {
    const key = uniqueKey();
    vi.useFakeTimers();

    try {
      rateLimit(key, 1, 60_000);
      expect(rateLimit(key, 1, 60_000).allowed).toBe(false);

      // เดินนาฬิกาไปข้างหน้าเกินช่วงเวลาที่ตั้งไว้
      vi.advanceTimersByTime(61_000);

      expect(rateLimit(key, 1, 60_000).allowed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("บอกจำนวนครั้งที่เหลือได้ถูกต้อง", () => {
    const key = uniqueKey();
    expect(rateLimit(key, 5, 60_000).remaining).toBe(4);
    expect(rateLimit(key, 5, 60_000).remaining).toBe(3);
  });
});

describe("formatRetryAfter", () => {
  it("น้อยกว่า 1 นาที บอกเป็นวินาที", () => {
    expect(formatRetryAfter(45)).toBe("45 วินาที");
  });

  it("ตั้งแต่ 1 นาทีขึ้นไป บอกเป็นนาที", () => {
    expect(formatRetryAfter(120)).toBe("2 นาที");
  });

  it("ปัดขึ้นเสมอ เพื่อไม่ให้ผู้ใช้ลองเร็วกว่าที่ควร", () => {
    expect(formatRetryAfter(61)).toBe("2 นาที");
  });
});
