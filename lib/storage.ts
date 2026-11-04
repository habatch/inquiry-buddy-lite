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

export function readRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** 保存に成功したら true */
export function writeRaw(json: string): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, json);
    return true;
  } catch {
    return false;
  }
}

export function removeRaw() {
  try {
    localStorage.removeItem(STORAGE_KEY);
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
