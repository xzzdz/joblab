/**
 * รูปร่างของค่าที่ Server Action ส่งกลับให้ฟอร์ม
 *
 * แยกมาไว้ไฟล์นี้ (ไม่ใส่ในไฟล์ที่มี "use server") เพราะไฟล์ "use server"
 * อนุญาตให้ export ได้แค่ async function เท่านั้น
 */
export type FormState = {
  /** ข้อความรวม ใช้กับ error ที่ไม่ผูกกับช่องใดช่องหนึ่ง เช่น "ไม่มีสิทธิ์แก้ประกาศนี้" */
  message?: string;
  /** ข้อความแจ้งว่าสำเร็จ ใช้กับฟอร์มที่บันทึกแล้วอยู่หน้าเดิม ไม่ได้ redirect ไปไหน */
  success?: string;
  /** error ราย field สำหรับแสดงใต้ช่องกรอก — key ตรงกับชื่อ field ใน Zod schema */
  fieldErrors?: Record<string, string[] | undefined>;
};

export const EMPTY_FORM_STATE: FormState = {};
