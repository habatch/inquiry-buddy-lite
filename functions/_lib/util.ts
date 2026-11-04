/** Pages Functions 共通の道具 (暗号・セッション・レスポンス) */

export interface Env {
  DB: D1Database;
  PBKDF2_ITERATIONS?: string;
  STUDENT_SESSION_DAYS?: string;
  TEACHER_SESSION_DAYS?: string;
}

export type Ctx = EventContext<Env, string, Record<string, unknown>>;

// ------------------------------------------------------------------
// レスポンス
// ------------------------------------------------------------------
export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
  });
}

export function fail(status: number, message: string): Response {
  return json({ error: message }, status);
}

export async function readJson<T>(req: Request, maxBytes = 512 * 1024): Promise<T | null> {
  const len = Number(req.headers.get("Content-Length") || 0);
  if (len > maxBytes) return null;
  const text = await req.text();
  if (text.length > maxBytes) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------
// 乱数・ハッシュ
// ------------------------------------------------------------------
const enc = new TextEncoder();

export function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function randomId(bytes = 16): string {
  return b64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function sha256(text: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return b64url(new Uint8Array(d));
}

/** 紛らわしい文字 (0 O 1 I L) を除いた 31 文字 */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** 生徒ログインコード: 12 文字 (約 59 ビット)、XXXX-XXXX-XXXX 形式 */
export function newLoginCode(): string {
  const out: string[] = [];
  const buf = crypto.getRandomValues(new Uint8Array(32));
  for (const b of buf) {
    if (b >= 248) continue; // 248 = 31 * 8、偏りをなくす
    out.push(CODE_ALPHABET[b % 31]);
    if (out.length === 12) break;
  }
  if (out.length < 12) return newLoginCode();
  return `${out.slice(0, 4).join("")}-${out.slice(4, 8).join("")}-${out.slice(8).join("")}`;
}

/** 入力ゆれ (小文字・全角・空白・ハイフン) を吸収する */
export function normalizeCode(input: string): string {
  return input
    .normalize("NFKC") // 全角英数を半角に
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export const hashCode = (code: string) => sha256("code:" + normalizeCode(code));

// ------------------------------------------------------------------
// 教員パスワード (PBKDF2-SHA256)
// ------------------------------------------------------------------
export function pbkdf2Iterations(env: Env): number {
  const n = Number(env.PBKDF2_ITERATIONS);
  return Number.isFinite(n) && n >= 10000 ? Math.floor(n) : 50000;
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

export async function hashPassword(password: string, iterations: number): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const h = await pbkdf2(password, salt, iterations);
  return `pbkdf2$${iterations}$${b64url(salt)}$${b64url(h)}`;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** 照合結果と、保存されている反復回数 (再ハッシュ判定用) */
export async function verifyPassword(password: string, stored: string): Promise<{ ok: boolean; iterations: number }> {
  const [alg, it, saltS, hashS] = stored.split("$");
  const iterations = Number(it);
  if (alg !== "pbkdf2" || !iterations || !saltS || !hashS) return { ok: false, iterations: 0 };
  const h = await pbkdf2(password, fromB64url(saltS), iterations);
  return { ok: timingSafeEqual(h, fromB64url(hashS)), iterations };
}

// ------------------------------------------------------------------
// セッション (HttpOnly Cookie。生徒と教員で別の Cookie)
// ------------------------------------------------------------------
export type Kind = "student" | "teacher";
const COOKIE: Record<Kind, string> = { student: "tn_s", teacher: "tn_t" };

function cookieValue(req: Request, name: string): string | null {
  const raw = req.headers.get("Cookie") || "";
  for (const part of raw.split(/;\s*/)) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i) === name) return part.slice(i + 1);
  }
  return null;
}

export async function createSession(env: Env, kind: Kind, subjectId: string): Promise<string> {
  const days = Number(kind === "student" ? env.STUDENT_SESSION_DAYS : env.TEACHER_SESSION_DAYS) || (kind === "student" ? 14 : 7);
  const token = randomId(32);
  const now = Date.now();
  const expires = now + days * 86400_000;
  await env.DB.prepare("INSERT INTO sessions (token_hash, kind, subject_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(await sha256(token), kind, subjectId, expires, now)
    .run();
  return `${COOKIE[kind]}=${token}; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=${days * 86400}`;
}

export async function getSession(env: Env, req: Request, kind: Kind): Promise<string | null> {
  const token = cookieValue(req, COOKIE[kind]);
  if (!token || token.length > 100) return null;
  const row = await env.DB.prepare("SELECT subject_id, expires_at FROM sessions WHERE token_hash = ? AND kind = ?")
    .bind(await sha256(token), kind)
    .first<{ subject_id: string; expires_at: number }>();
  if (!row || row.expires_at < Date.now()) return null;
  return row.subject_id;
}

export async function destroySession(env: Env, req: Request, kind: Kind): Promise<string> {
  const token = cookieValue(req, COOKIE[kind]);
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  return `${COOKIE[kind]}=; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

// ------------------------------------------------------------------
// 総当たり対策: キーごとの失敗回数 (時間窓つき)
// 学校は全員が同じ IP なので、IP 単位の上限は高めにし、主にアカウント単位で絞る
// ------------------------------------------------------------------
export async function tooManyFailures(env: Env, key: string, limit: number, windowMs: number): Promise<boolean> {
  const row = await env.DB.prepare("SELECT count, window_start FROM login_failures WHERE key = ?")
    .bind(key)
    .first<{ count: number; window_start: number }>();
  return !!row && Date.now() - row.window_start < windowMs && row.count >= limit;
}

export async function recordFailure(env: Env, key: string, windowMs: number): Promise<void> {
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO login_failures (key, count, window_start) VALUES (?1, 1, ?2)
     ON CONFLICT(key) DO UPDATE SET
       count = CASE WHEN ?2 - window_start >= ?3 THEN 1 ELSE count + 1 END,
       window_start = CASE WHEN ?2 - window_start >= ?3 THEN ?2 ELSE window_start END`,
  )
    .bind(key, now, windowMs)
    .run();
}

export const clientIp = (req: Request) => req.headers.get("CF-Connecting-IP") || "unknown";
