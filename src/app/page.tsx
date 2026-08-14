import { redirect } from "next/navigation";

// ตอนนี้ยังไม่มีหน้า landing — ส่งผู้ใช้ไปหน้ารายการงานเลย
// (Phase หลังค่อยทำหน้าแรกจริงพร้อมช่องค้นหา)
export default function HomePage() {
  redirect("/jobs");
}
