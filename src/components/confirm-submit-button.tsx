"use client";

/**
 * ปุ่ม submit ที่ถามยืนยันก่อนส่งฟอร์ม
 *
 * ต้องเป็น Client Component เพราะ `window.confirm` มีอยู่แค่ในเบราว์เซอร์
 * และต้องดัก event ตอนคลิก ซึ่งเป็นสิ่งที่ทำได้เฉพาะฝั่ง client
 *
 * นี่คือตัวอย่างของ "ทำให้ขอบเขต client เล็กที่สุด" — หน้ารายการประกาศทั้งหน้า
 * ยังเป็น Server Component มีแค่ปุ่มนี้ปุ่มเดียวที่ส่ง JavaScript ไปให้ browser
 *
 * ⚠️ การยืนยันนี้เป็นแค่ UX กันพลาด ไม่ใช่ความปลอดภัย
 * คนที่ตั้งใจจะยิง action ตรง ๆ ข้ามปุ่มนี้ได้ ด่านจริงอยู่ใน action เสมอ
 */
export function ConfirmSubmitButton({
  message,
  className,
  children,
}: {
  message: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
