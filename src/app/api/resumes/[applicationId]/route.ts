import { getResumeForViewer } from "@/lib/applications";
import { getCurrentUser } from "@/lib/dal";

/**
 * ดาวน์โหลดไฟล์ resume
 *
 * ทำไมต้องมี route นี้แทนที่จะให้โหลดไฟล์ตรง ๆ:
 * resume คือข้อมูลส่วนบุคคล มีเบอร์โทร ที่อยู่ ประวัติการทำงาน
 * ถ้าเข้าถึงได้โดยไม่ผ่านการตรวจสิทธิ์ ใครที่ได้ URL ไป (หรือเดาถูก) ก็เปิดได้
 * และ search engine ก็เก็บเข้า index ได้ด้วย
 *
 * ทุก request ที่เข้ามาจึงต้องผ่าน 2 ด่าน:
 *   1. ล็อกอินแล้วหรือยัง
 *   2. เป็นเจ้าของใบสมัคร หรือเป็นบริษัทที่รับสมัครงานนั้น (เช็คใน getResumeForViewer)
 *
 * สังเกตว่า URL อ้างถึง "ใบสมัคร" ไม่ใช่ "ไฟล์" โดยตรง
 * เพราะสิทธิ์การเข้าถึงผูกกับใบสมัคร ไม่ได้ผูกกับตัวไฟล์
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  const { applicationId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    // ไม่ redirect ไปหน้า login เพราะนี่คือ API ไม่ใช่หน้าเว็บ
    return new Response("ต้องเข้าสู่ระบบก่อน", { status: 401 });
  }

  const resume = await getResumeForViewer(user.id, applicationId);

  /**
   * ตอบ 404 ไม่ใช่ 403 เมื่อไม่มีสิทธิ์
   *
   * 403 แปลว่า "มีอยู่จริงแต่คุณดูไม่ได้" ซึ่งเป็นการยืนยันให้คนนอกรู้ว่า
   * ใบสมัคร id นี้มีอยู่ในระบบ — ไล่ยิงไปเรื่อย ๆ ก็นับได้ว่ามีใบสมัครกี่ใบ
   * ตอบ 404 เหมือนกันทั้งกรณี "ไม่มี" และ "ไม่ใช่ของคุณ" จึงบอกอะไรไม่ได้เลย
   */
  if (!resume) {
    return new Response("ไม่พบไฟล์", { status: 404 });
  }

  return new Response(new Uint8Array(resume.data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(resume.size),
      // inline = เปิดดูในเบราว์เซอร์ได้เลย ไม่ต้องโหลดลงเครื่องก่อน
      // filename* ใช้รูปแบบ RFC 5987 เพื่อให้ชื่อไฟล์ภาษาไทยไม่เพี้ยน
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(resume.fileName)}`,
      // ห้าม CDN หรือ proxy สาธารณะเก็บไฟล์นี้ไว้ เพราะเป็นข้อมูลเฉพาะบุคคล
      "Cache-Control": "private, no-store",
      // กันเบราว์เซอร์เดาชนิดไฟล์เอง (ถ้าเดาผิดเป็น HTML จะรันสคริปต์ในไฟล์ได้)
      "X-Content-Type-Options": "nosniff",
    },
  });
}
