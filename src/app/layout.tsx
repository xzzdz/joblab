import type { Metadata } from "next";
import { Geist_Mono, Noto_Sans_Thai } from "next/font/google";

import { SiteHeader } from "@/components/site-header";

import "./globals.css";

// Geist (ฟอนต์ default ของ create-next-app) ไม่มีตัวอักษรไทย เลยเปลี่ยนมาใช้ Noto Sans Thai
const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["thai", "latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "JobLab — หางานสายไอทีในไทย",
    // %s จะถูกแทนด้วย title ของแต่ละหน้า เช่น "Frontend Developer | JobLab"
    template: "%s | JobLab",
  },
  description: "เว็บประกาศงานและติดตามใบสมัคร สร้างด้วย Next.js, TypeScript และ PostgreSQL",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${notoSansThai.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <SiteHeader />

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>

        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-slate-500">
            JobLab — โปรเจคฝึกฝน Next.js + TypeScript + PostgreSQL
          </div>
        </footer>
      </body>
    </html>
  );
}
