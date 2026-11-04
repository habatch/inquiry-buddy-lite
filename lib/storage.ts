/**
 * 記録の保存まわり (端末のブラウザ内のみ)。
 *
 * 授業で一斉に使うときの事故を減らすための工夫:
 *  - 保存できない環境 (プライベートモード・容量不足など) を検知して画面に出す
 *  - navigator.storage.persist() で、ブラウザに自動削除されにくくする
 *  - 最後にバックアップした日時を記録して表示する
 */
import { STORAGE_KEY } from "./state";

export const BACKUP_AT_KEY = "inquiry-buddy-lite-backup-at";

/** localStorage に実際に書けるか確かめる */
export function storageWritable(): boolean {
  try {
    const k = "__ibl_probe__";
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

/** ログイン中の生徒ごとに保存場所を分ける (共用 PC で他の生徒の記録が混ざらないように) */
export function stateKey(studentId?: string | null): string {
  return studentId ? `${STORAGE_KEY}:${studentId}` : STORAGE_KEY;
}

export function readRaw(key: string = STORAGE_KEY): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** 保存に成功したら true */
export function writeRaw(json: string, key: string = STORAGE_KEY): boolean {
  try {
    localStorage.setItem(key, json);
    return true;
  } catch {
    return false;
  }
}

export function removeRaw(key: string = STORAGE_KEY) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** ブラウザに「このサイトのデータは消さないで」と頼む (対応ブラウザのみ) */
export async function requestPersist(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted?.()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export function getBackupAt(): number | null {
  try {
    const v = Number(localStorage.getItem(BACKUP_AT_KEY));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

export function setBackupAt(t: number) {
  try {
    localStorage.setItem(BACKUP_AT_KEY, String(t));
  } catch {
    /* ignore */
  }
}

export function formatAgo(t: number | null): string {
  if (!t) return "まだ一度もしていません";
  const min = Math.floor((Date.now() - t) / 60000);
  if (min < 1) return "たった今";
  if (min < 60) return `${min} 分前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} 時間前`;
  return `${Math.floor(h / 24)} 日前`;
}

/** この端末にある記録をすべて (ゲスト + ログインした生徒ぶん) 集める。救出用 */
export function readAllRaw(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_KEY)) out[k] = localStorage.getItem(k) ?? "";
    }
  } catch {
    /* ignore */
  }
  return out;
}

// ------------------------------------------------------------------
// ログイン情報のヒント (秘密ではない。本物の認証は HttpOnly Cookie)
// ------------------------------------------------------------------
export interface StudentInfo {
  id: string;
  number: string;
  name: string;
  className: string;
}
export type AuthHint = { mode: "guest" } | { mode: "student"; student: StudentInfo };
const AUTH_KEY = "inquiry-buddy-lite-auth";

export function getAuthHint(): AuthHint | null {
  try {
    const v = JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
    if (v?.mode === "guest") return { mode: "guest" };
    if (v?.mode === "student" && typeof v.student?.id === "string") return v;
  } catch {
    /* ignore */
  }
  return null;
}

export function setAuthHint(h: AuthHint | null) {
  try {
    if (h) localStorage.setItem(AUTH_KEY, JSON.stringify(h));
    else localStorage.removeItem(AUTH_KEY);
  } catch {
    /* ignore */
  }
}

// ------------------------------------------------------------------
// サーバ同期の状態 (生徒ごと): サーバの版と、まだ送っていない変更があるか
// ------------------------------------------------------------------
export interface SyncMeta {
  version: number;
  dirty: boolean;
  syncedAt: number | null;
}

export function getSyncMeta(key: string): SyncMeta {
  try {
    const v = JSON.parse(localStorage.getItem(key + ":sync") || "null");
    if (v && typeof v.version === "number") return { version: v.version, dirty: !!v.dirty, syncedAt: v.syncedAt ?? null };
  } catch {
    /* ignore */
  }
  return { version: 0, dirty: false, syncedAt: null };
}

export function setSyncMeta(key: string, m: SyncMeta) {
  try {
    localStorage.setItem(key + ":sync", JSON.stringify(m));
  } catch {
    /* ignore */
  }
}
