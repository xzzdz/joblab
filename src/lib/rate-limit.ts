import "server-only";

import { headers } from "next/headers";

/**
 * จำกัดจำนวนครั้งที่ทำอะไรบางอย่างได้ในช่วงเวลาหนึ่ง
 *
 * ทำไมต้องมี: ถ้าไม่จำกัด คนโจมตีเขียนสคริปต์ยิงหน้า login วินาทีละร้อยครั้ง
 * เพื่อไล่เดารหัสผ่านได้เรื่อย ๆ — bcrypt ทำให้แต่ละครั้งช้าลงก็จริง
 * แต่ช้าฝั่งเราด้วย กลายเป็นว่าเราเปลืองเครื่องเองแทน
 *
 * ⚠️ ข้อจำกัดที่ต้องรู้ของวิธีนี้:
 *   - เก็บใน memory ของ process → รีสตาร์ตเซิร์ฟเวอร์ที ตัวนับหายหมด
 *   - ถ้ารันหลาย instance (เช่นบน Vercel) แต่ละตัวนับแยกกัน คนโจมตีจะได้โควตา × จำนวน instance
 * ของจริงบน production ต้องเก็บใน Redis ที่ทุก instance เห็นร่วมกัน
 *
 * แต่จงใจเขียนเองก่อน เพราะกลไกมันแค่นี้จริง ๆ — พอเข้าใจแล้วค่อยเปลี่ยนที่เก็บ
 * ก็เป็นเรื่องง่าย และจะรู้ว่าตอนเลือก service ต้องดูอะไร
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * เก็บกวาดรายการที่หมดอายุแล้ว
 *
 * ถ้าไม่ทำ Map จะโตขึ้นเรื่อย ๆ ตามจำนวน IP ที่เคยเข้ามา จนกินหน่วยความจำหมด
 * — คนโจมตีเปลี่ยน IP ไปเรื่อย ๆ ก็ทำให้เราหน่วยความจำเต็มได้ ทั้งที่ตั้งใจจะกันเขา
 */
function sweep(now: number) {
  if (buckets.size < 1000) return; // ยังไม่ต้องเสียเวลาเก็บกวาดตอนรายการยังน้อย
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  /** เหลือโควตากี่ครั้ง */
  remaining: number;
  /** ต้องรออีกกี่วินาทีถึงจะลองใหม่ได้ */
  retryAfterSeconds: number;
};

/**
 * ดูสถานะโควตาโดย **ไม่นับเพิ่ม**
 *
 * มีไว้เพื่อให้แสดงข้อความดี ๆ ("รออีก 3 นาที") ได้ในหน้าฟอร์ม
 * โดยไม่ไปกินโควตาซ้ำกับที่ `authorize()` นับไปแล้ว
 * — ถ้าทั้งสองที่ต่างคนต่างนับ ผู้ใช้จะโดนบล็อกเร็วกว่าเพดานที่เราตั้งไว้ครึ่งหนึ่ง
 */
export function peekRateLimit(key: string, limit: number): RateLimitResult {
  const bucket = buckets.get(key);
  const now = Date.now();

  if (!bucket || bucket.resetAt <= now) {
    return { allowed: true, remaining: limit, retryAfterSeconds: 0 };
  }

  const allowed = bucket.count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSeconds: allowed ? 0 : Math.ceil((bucket.resetAt - now) / 1000),
  };
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);

  // ยังไม่เคยนับ หรือหน้าต่างเวลาเดิมหมดอายุแล้ว → เริ่มนับใหม่
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  bucket.count += 1;

  if (bucket.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  return { allowed: true, remaining: limit - bucket.count, retryAfterSeconds: 0 };
}

/**
 * หา IP ของผู้ใช้จาก header
 *
 * `x-forwarded-for` เป็น header ที่ proxy/CDN ใส่มาให้ ผู้ใช้ปลอมเองได้ถ้ายิงตรงเข้าเซิร์ฟเวอร์
 * แต่บนโครงสร้างจริงที่มี proxy อยู่หน้าเสมอ (เช่น Vercel) proxy จะเขียนทับให้
 * ค่าแรกในรายการคือ IP ต้นทางจริง ที่เหลือคือ proxy ที่ผ่านมา
 *
 * ถ้าหาไม่ได้จริง ๆ คืน "unknown" ซึ่งแปลว่าคนที่หา IP ไม่ได้ทั้งหมดจะแชร์โควตาก้อนเดียวกัน
 * — เข้มเกินไปดีกว่าหลวมเกินไปสำหรับหน้า login
 */
export async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headerList.get("x-real-ip") ?? "unknown";
}

/** แปลงวินาทีเป็นข้อความที่คนอ่านเข้าใจ */
export function formatRetryAfter(seconds: number): string {
  if (seconds < 60) return `${seconds} วินาที`;
  return `${Math.ceil(seconds / 60)} นาที`;
}
