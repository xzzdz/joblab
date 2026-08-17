"use client";

/**
 * ด่านสุดท้าย — ใช้เมื่อ error เกิดใน root layout เอง
 *
 * ตอนนั้น layout พังไปแล้ว ไฟล์นี้จึงต้องมี <html> และ <body> ของตัวเอง
 * เพราะมันไปแทนที่ root layout ทั้งอัน
 *
 * ด้วยเหตุผลเดียวกัน ห้ามพึ่งอะไรจาก layout เลย — ไม่มีฟอนต์ ไม่มี header
 * และเขียน style แบบ inline ไว้ เผื่อกรณีที่ CSS โหลดไม่สำเร็จด้วย
 *
 * ไฟล์นี้แทบไม่ถูกใช้เลยถ้าทุกอย่างปกติ แต่ต้องมี ไม่งั้นผู้ใช้จะเจอหน้าขาวเปล่า ๆ
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="th">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          background: "#f8fafc",
          color: "#0f172a",
        }}
      >
        <div style={{ maxWidth: 420, padding: 32, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>ระบบขัดข้อง</h1>
          <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.6 }}>
            เกิดข้อผิดพลาดร้ายแรงจนหน้าเว็บทำงานต่อไม่ได้ กรุณาลองใหม่อีกครั้ง
          </p>
          {error.digest && (
            <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 16 }}>
              รหัสอ้างอิง: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={retry}
            style={{
              marginTop: 24,
              padding: "8px 16px",
              fontSize: 14,
              color: "#fff",
              background: "#4f46e5",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            ลองใหม่
          </button>
        </div>
      </body>
    </html>
  );
}
