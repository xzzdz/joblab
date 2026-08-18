import "server-only";

/**
 * ชั้นส่งอีเมล
 *
 * ออกแบบให้ทำงานได้ทั้งตอนที่มีและไม่มีบริการส่งอีเมล ด้วยเหตุผลเดียวกับ `storage.ts`:
 * ที่เหลือของโปรเจคเรียกผ่านฟังก์ชันนี้เท่านั้น วันที่เปลี่ยนผู้ให้บริการจะแก้แค่ไฟล์นี้
 *
 * ตอน dev ที่ไม่มี `RESEND_API_KEY` จะพิมพ์อีเมลลง console แทนการส่งจริง
 * **นี่ไม่ใช่การทำครึ่ง ๆ กลาง ๆ** — เป็นสิ่งที่ต้องมีอยู่แล้ว เพราะ:
 *   1. ทดสอบ flow ลืมรหัสผ่านบนเครื่องตัวเองได้โดยไม่ต้องสมัครบริการอะไร
 *   2. ไม่มีความเสี่ยงที่จะยิงอีเมลจริงไปหาคนจริงตอนกำลังทดสอบ
 */

export type EmailMessage = {
  to: string;
  subject: string;
  /** เนื้อหาแบบข้อความล้วน — ตั้งใจไม่ทำ HTML เพราะอีเมลระบบไม่จำเป็นต้องมี */
  text: string;
};

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "JobLab <onboarding@resend.dev>";

export const isEmailConfigured = Boolean(RESEND_API_KEY);

export async function sendEmail(message: EmailMessage): Promise<void> {
  if (!RESEND_API_KEY) {
    /**
     * โหมด dev — พิมพ์ลง console
     *
     * ใช้ console.info ไม่ใช่ console.log เพื่อให้แยกออกจาก log ทั่วไป
     * และคั่นด้วยเส้นเพื่อให้หาเจอง่ายท่ามกลาง log ของ Prisma ที่เยอะมาก
     */
    console.info(
      [
        "",
        "─".repeat(70),
        "อีเมลที่จะถูกส่ง (โหมด dev — ไม่ได้ส่งจริงเพราะยังไม่ตั้ง RESEND_API_KEY)",
        `ถึง:      ${message.to}`,
        `หัวเรื่อง: ${message.subject}`,
        "",
        message.text,
        "─".repeat(70),
        "",
      ].join("\n")
    );
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: message.to,
      subject: message.subject,
      text: message.text,
    }),
  });

  if (!response.ok) {
    /**
     * โยน error ออกไปให้คนเรียกจัดการ แต่ **ห้ามเอาข้อความ error ไปแสดงให้ผู้ใช้**
     *
     * ข้อความจากผู้ให้บริการอาจบอกว่าอีเมลปลายทางมีอยู่จริงหรือไม่ (bounce/invalid)
     * ซึ่งเป็นการยืนยันให้คนโจมตีรู้ว่าอีเมลไหนมีบัญชีในระบบ
     */
    const detail = await response.text();
    throw new Error(`ส่งอีเมลไม่สำเร็จ (${response.status}): ${detail}`);
  }
}
