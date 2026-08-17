import { describe, expect, it } from "vitest";

import { formatRelativeDate, formatSalaryRange } from "@/lib/format";

/**
 * เทสต์ฟังก์ชันแปลงข้อมูลเป็นข้อความ
 *
 * เลือกเทสต์พวกนี้ก่อนเพราะเป็น pure function — ใส่อะไรเข้าไปได้อะไรออกมาแน่นอน
 * ไม่ต้องต่อ DB ไม่ต้องมี session รันเร็วมาก และพังเมื่อไหร่รู้ทันทีว่าผิดตรงไหน
 *
 * สังเกตว่าเทสต์ส่วนใหญ่เน้น "เคสขอบ" ไม่ใช่เคสปกติ
 * เพราะเคสปกติเราเห็นด้วยตาตอนเปิดเว็บอยู่แล้ว ส่วนเคสขอบต่างหากที่หลุดบ่อย
 */

describe("formatSalaryRange", () => {
  it("แสดงเป็นช่วงเมื่อระบุทั้งขั้นต่ำและขั้นสูง", () => {
    const result = formatSalaryRange(45000, 70000);
    expect(result).toContain("45,000");
    expect(result).toContain("70,000");
    expect(result).toContain("/ เดือน");
  });

  it("ระบุแค่ขั้นต่ำ → บอกว่า 'เริ่มต้น'", () => {
    expect(formatSalaryRange(30000, null)).toContain("เริ่มต้น");
  });

  it("ระบุแค่ขั้นสูง → บอกว่า 'สูงสุด'", () => {
    expect(formatSalaryRange(null, 90000)).toContain("สูงสุด");
  });

  it("ไม่ระบุเลย → ต้องไม่ขึ้นเลข 0 หรือค่าว่าง", () => {
    // เคสนี้เคยพลาดง่ายที่สุด: ถ้าเขียน `min || "ไม่ระบุ"` แล้วค่าเป็น 0 จะเพี้ยน
    expect(formatSalaryRange(null, null)).toBe("ไม่ระบุเงินเดือน");
  });

  it("เงินเดือน 0 ต้องไม่ถูกมองว่าเป็น 'ไม่ระบุ'", () => {
    // 0 เป็นค่าที่ falsy ใน JavaScript — เป็นบ่อเกิดของบั๊กคลาสสิก
    const result = formatSalaryRange(0, 15000);
    expect(result).not.toBe("ไม่ระบุเงินเดือน");
  });
});

describe("formatRelativeDate", () => {
  const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  it("ยังไม่เผยแพร่ (null) ต้องไม่พัง", () => {
    expect(formatRelativeDate(null)).toBe("ยังไม่เผยแพร่");
  });

  it("วันนี้", () => {
    expect(formatRelativeDate(new Date())).toBe("วันนี้");
  });

  it("เมื่อวาน", () => {
    expect(formatRelativeDate(daysAgo(1))).toBe("เมื่อวาน");
  });

  it("2-6 วัน นับเป็นวัน", () => {
    expect(formatRelativeDate(daysAgo(3))).toBe("3 วันที่แล้ว");
  });

  it("7 วันขึ้นไป นับเป็นสัปดาห์", () => {
    expect(formatRelativeDate(daysAgo(14))).toBe("2 สัปดาห์ที่แล้ว");
  });

  it("30 วันขึ้นไป นับเป็นเดือน", () => {
    expect(formatRelativeDate(daysAgo(65))).toBe("2 เดือนที่แล้ว");
  });

  it("วันที่ในอนาคตต้องไม่แสดงเป็นค่าติดลบ", () => {
    // เกิดได้จริงถ้านาฬิกาเครื่อง server กับ DB ไม่ตรงกันเล็กน้อย
    const future = new Date(Date.now() + 60 * 60 * 1000);
    expect(formatRelativeDate(future)).toBe("วันนี้");
  });
});
