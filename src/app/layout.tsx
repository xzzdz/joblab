import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans_Thai } from "next/font/google";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { themeInitScript } from "@/components/theme-toggle";

import "./globals.css";

/**
 * ฟอนต์คู่ของธีมนี้
 *
 * ทำไมเลือก IBM Plex: เว็บไทยส่วนใหญ่ใช้ Kanit / Prompt / Sarabun ซึ่งพอเห็นแล้วรู้สึก "เคยเห็นที่ไหนสักแห่ง"
 * ส่วน Plex ถูกออกแบบมาเป็นครอบครัวเดียวกันทั้ง sans / mono และมีชุดตัวอักษรไทยจริง (ตรวจแล้วว่ามี U+0E01–0E5B)
 * ทำให้หน้าเว็บดูเป็นระบบเดียวกันโดยไม่ต้องผสมฟอนต์จากคนละที่
 *
 * `display: "swap"` = แสดงฟอนต์สำรองไปก่อนระหว่างรอโหลด ผู้ใช้จะได้อ่านได้ทันที
 * ไม่ต้องนั่งมองหน้าว่าง ๆ (ปัญหาที่เรียกว่า flash of invisible text)
 */
const plexThai = IBM_Plex_Sans_Thai({
  variable: "--font-plex-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const SITE_URL = "https://joblab.vercel.app";
const SITE_DESCRIPTION =
  "ค้นหาตำแหน่งงานจากบริษัทไทย สมัครพร้อมแนบ resume แล้วติดตามสถานะใบสมัครได้ทุกใบ";

export const metadata: Metadata = {
  /**
   * metadataBase ทำให้ Next แปลง path สัมพัทธ์ใน og:image / canonical เป็น URL เต็มให้เอง
   * ถ้าไม่ตั้ง Facebook/LINE จะอ่าน og:image ที่เป็น path สัมพัทธ์ไม่ได้ แล้ว preview จะไม่ขึ้นรูป
   */
  metadataBase: new URL(SITE_URL),
  title: {
    default: "JobLab — หางานสายไอทีในไทย",
    template: "%s | JobLab",
  },
  description: SITE_DESCRIPTION,

  /** ข้อมูลที่ Facebook / LINE / Slack ใช้ทำ preview ตอนมีคนแชร์ลิงก์ */
  openGraph: {
    type: "website",
    locale: "th_TH",
    siteName: "JobLab",
    title: "JobLab — หางานสายไอทีในไทย",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "JobLab — หางานสายไอทีในไทย",
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      // ตั้งค่าเริ่มต้นไว้ก่อน แล้วสคริปต์ข้างล่างจะเขียนทับตามค่าที่ผู้ใช้เลือกไว้
      data-theme="light"
      className={`${plexThai.variable} ${plexMono.variable} h-full antialiased`}
      // สคริปต์เปลี่ยนธีมทำให้ค่า attribute ต่างจากที่ server ส่งมา ซึ่งเป็นสิ่งที่ตั้งใจ
      suppressHydrationWarning
    >
      <head>
        {/* ต้องรันก่อนเบราว์เซอร์วาดหน้า ไม่งั้นจะเห็นหน้าขาวแวบก่อนเปลี่ยนเป็นโหมดมืด */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-full flex-col bg-paper font-sans text-ink">
        <SiteHeader />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
