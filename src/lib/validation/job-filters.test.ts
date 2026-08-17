import { describe, expect, it } from "vitest";

import { buildJobsQuery, hasActiveFilters, parseJobFilters } from "@/lib/validation/job-filters";

/**
 * เทสต์การอ่านค่าจาก URL
 *
 * ส่วนนี้สำคัญเพราะ URL คือ input จากผู้ใช้ที่ควบคุมไม่ได้เลย
 * ใครจะพิมพ์อะไรใส่ก็ได้ และหน้าเว็บต้องไม่พังไม่ว่าจะใส่อะไรมา
 */

describe("parseJobFilters — ค่าปกติ", () => {
  it("อ่านค่าที่ถูกต้องได้ครบ", () => {
    const result = parseJobFilters({
      q: "developer",
      location: "กรุงเทพฯ",
      type: "FULL_TIME",
      workMode: "REMOTE",
      salary: "50000",
      page: "3",
    });

    expect(result).toEqual({
      q: "developer",
      location: "กรุงเทพฯ",
      type: "FULL_TIME",
      workMode: "REMOTE",
      salary: 50000,
      page: 3,
    });
  });

  it("ไม่ส่งอะไรมาเลย → หน้า 1 และไม่มีตัวกรอง", () => {
    const result = parseJobFilters({});
    expect(result.page).toBe(1);
    expect(hasActiveFilters(result)).toBe(false);
  });

  it("ตัดช่องว่างหน้า-หลังของคำค้นหา", () => {
    expect(parseJobFilters({ q: "  react  " }).q).toBe("react");
  });

  it("คำค้นหาที่เป็นช่องว่างล้วน ถือว่าไม่ได้กรอง", () => {
    expect(parseJobFilters({ q: "   " }).q).toBeUndefined();
  });
});

describe("parseJobFilters — ค่าที่ผิดรูปหรือเป็นการโจมตี", () => {
  it("enum ที่ไม่มีอยู่จริงถูกทิ้ง ไม่ทำให้พัง", () => {
    const result = parseJobFilters({ type: "DROP TABLE jobs", workMode: "???" });
    expect(result.type).toBeUndefined();
    expect(result.workMode).toBeUndefined();
  });

  it("เงินเดือนที่ไม่ใช่ตัวเลขถูกทิ้ง", () => {
    expect(parseJobFilters({ salary: "abc" }).salary).toBeUndefined();
  });

  it("เงินเดือนติดลบถูกทิ้ง", () => {
    expect(parseJobFilters({ salary: "-5000" }).salary).toBeUndefined();
  });

  it("เลขหน้าติดลบหรือศูนย์ ตกมาเป็นหน้า 1", () => {
    expect(parseJobFilters({ page: "-5" }).page).toBe(1);
    expect(parseJobFilters({ page: "0" }).page).toBe(1);
    expect(parseJobFilters({ page: "ไม่ใช่เลข" }).page).toBe(1);
  });

  it("เลขหน้ามหาศาลถูกจำกัดไว้ที่ 1000", () => {
    // กันคนยิง ?page=999999999 แล้วทำให้ DB ต้องไล่อ่านแล้วทิ้งข้อมูลมหาศาล
    expect(parseJobFilters({ page: "999999999" }).page).toBe(1000);
  });

  it("คำค้นหายาวเกินไปถูกตัด", () => {
    const long = "ก".repeat(500);
    expect(parseJobFilters({ q: long }).q?.length).toBe(100);
  });

  it("พารามิเตอร์ซ้ำ (?type=A&type=B) ใช้ตัวแรก", () => {
    const result = parseJobFilters({ type: ["INTERNSHIP", "FULL_TIME"] });
    expect(result.type).toBe("INTERNSHIP");
  });
});

describe("buildJobsQuery", () => {
  it("ไม่มีตัวกรองเลย → ได้ string ว่าง ไม่ใช่ '?'", () => {
    expect(buildJobsQuery({ page: 1 })).toBe("");
  });

  it("หน้า 1 ไม่ต้องใส่ในลิงก์", () => {
    expect(buildJobsQuery({ page: 1, q: "react" })).toBe("?q=react");
  });

  it("หน้าอื่นใส่เลขหน้าด้วย", () => {
    expect(buildJobsQuery({ page: 2, q: "react" })).toContain("page=2");
  });

  it("override ด้วย undefined = ลบตัวกรองนั้นออก", () => {
    const filters = { page: 3, q: "react", workMode: "REMOTE" as const };
    const result = buildJobsQuery(filters, { q: undefined, page: 1 });
    expect(result).toBe("?workMode=REMOTE");
  });

  it("เก็บตัวกรองอื่นไว้ครบตอนเปลี่ยนหน้า", () => {
    const filters = { page: 1, q: "react", workMode: "REMOTE" as const, salary: 50000 };
    const result = buildJobsQuery(filters, { page: 2 });
    expect(result).toContain("q=react");
    expect(result).toContain("workMode=REMOTE");
    expect(result).toContain("salary=50000");
    expect(result).toContain("page=2");
  });
});
