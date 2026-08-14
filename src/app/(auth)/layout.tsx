/**
 * Layout ร่วมของหน้า login และ register
 *
 * `(auth)` เป็น route group — ไม่มีผลกับ URL (ยังเป็น /login และ /register)
 * แต่ทำให้สองหน้านี้ใช้ layout เดียวกันได้ โดยไม่กระทบหน้าอื่น
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return <div className="mx-auto max-w-md py-8">{children}</div>;
}
