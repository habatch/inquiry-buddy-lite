"use client";
/**
 * 生徒の記録をサーバと同期する。
 *
 * - 端末への保存が先 (page.tsx)。サーバへは NEXT_PUBLIC_SYNC_INTERVAL_SEC ごと + タブを離れたときに送る
 *   無料版は 60 秒 (D1 の書き込み上限 10 万行/日に収めるため)、有料版に切り替えたら 15 秒程度に下げる
 * - サーバの版 (version) を覚えておき、別の端末で更新されていたら上書きせずにサーバ側を採用する
 *   (この端末の内容は ":conflict" に退避)
 * - 通信できない・上限に達したときは、端末に保存したまま次の機会に送る
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "./api";
import { parseState, type AppState } from "./state";
import { getSyncMeta, setSyncMeta, writeRaw, type SyncMeta } from "./storage";

export type CloudStatus = "off" | "connecting" | "synced" | "pending" | "syncing" | "offline" | "auth";

const INTERVAL_MS = Math.max(10, Number(process.env.NEXT_PUBLIC_SYNC_INTERVAL_SEC) || 60) * 1000;

interface ServerProgress {
  state: unknown;
  version: number;
  updatedAt: number;
}

const hasContent = (s: AppState) =>
  !!s.profile || Object.values(s.answers).some((v) => v.trim()) || s.actions.length > 0;

export function useCloudSync(opts: {
  enabled: boolean;
  storeKey: string;
  hydrated: boolean;
  st: AppState;
  /** サーバの記録で画面を置き換える */
  adopt: (s: AppState) => void;
  notify: (msg: string) => void;
}) {
  const { enabled, storeKey, hydrated, st, adopt, notify } = opts;
  const [status, setStatus] = useState<CloudStatus>(enabled ? "connecting" : "off");
  const [syncedAt, setSyncedAt] = useState<number | null>(null);
  const metaRef = useRef<SyncMeta>({ version: 0, dirty: false, syncedAt: null });
  const stRef = useRef(st);
  stRef.current = st;
  const ready = useRef(false); // 初回の突き合わせが済んだか
  const lastJson = useRef<string | null>(null);
  const inflight = useRef(false);

  const saveMeta = useCallback(
    (m: SyncMeta) => {
      metaRef.current = m;
      setSyncMeta(storeKey, m);
      if (m.syncedAt) setSyncedAt(m.syncedAt);
    },
    [storeKey],
  );

  const adoptServer = useCallback(
    (p: ServerProgress, keepLocalBackup: boolean) => {
      const server = parseState(p.state);
      if (!server) return;
      if (keepLocalBackup && hasContent(stRef.current)) {
        writeRaw(JSON.stringify(stRef.current), storeKey + ":conflict");
        notify("別の端末で書いた記録の方が新しかったので、そちらを表示しています。この端末の内容は救出用に保管しました。");
      }
      lastJson.current = JSON.stringify(server);
      adopt(server);
      saveMeta({ version: p.version, dirty: false, syncedAt: p.updatedAt });
    },
    [adopt, notify, saveMeta, storeKey],
  );

  const push = useCallback(async () => {
    if (!enabled || !ready.current || inflight.current || !metaRef.current.dirty) return;
    inflight.current = true;
    setStatus("syncing");
    const json = JSON.stringify(stRef.current);
    try {
      const r = await api<{ version: number; updatedAt: number }>("/student/state", {
        method: "PUT",
        json: { state: stRef.current, baseVersion: metaRef.current.version },
        timeoutMs: 20000,
      });
      const unchanged = JSON.stringify(stRef.current) === json;
      saveMeta({ version: r.version, dirty: !unchanged, syncedAt: r.updatedAt });
      setStatus(unchanged ? "synced" : "pending");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setStatus("auth");
      else if (e instanceof ApiError && e.status === 409 && e.data.progress) {
        adoptServer(e.data.progress as ServerProgress, true);
        setStatus("synced");
      } else setStatus("offline");
    } finally {
      inflight.current = false;
    }
  }, [enabled, saveMeta, adoptServer]);

  /** サーバの記録と端末の記録を突き合わせる (起動時・再ログイン時) */
  const reconcile = useCallback(async () => {
    if (!enabled) return;
    metaRef.current = getSyncMeta(storeKey);
    setSyncedAt(metaRef.current.syncedAt);
    setStatus("connecting");
    try {
      const r = await api<{ progress: ServerProgress | null }>("/student/state");
      const p = r.progress;
      const m = metaRef.current;
      let adopted = false;
      if (!p) {
        saveMeta({ version: 0, dirty: hasContent(stRef.current), syncedAt: null });
      } else if (p.version > m.version) {
        adoptServer(p, m.dirty); // lastJson はサーバの内容にそろえ済み
        adopted = true;
      } else if (p.version < m.version) {
        // サーバ側が巻き戻った (復元など): 端末の内容を送り直す
        saveMeta({ ...m, version: p.version, dirty: true });
      }
      ready.current = true;
      if (!adopted) lastJson.current = JSON.stringify(stRef.current);
      setStatus(metaRef.current.dirty ? "pending" : "synced");
      if (metaRef.current.dirty) void push();
    } catch (e) {
      ready.current = true;
      lastJson.current = JSON.stringify(stRef.current);
      setStatus(e instanceof ApiError && e.status === 401 ? "auth" : "offline");
    }
  }, [enabled, storeKey, saveMeta, adoptServer, push]);

  // 起動時
  useEffect(() => {
    if (enabled && hydrated) void reconcile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, hydrated, storeKey]);

  // 内容が変わったら「未送信」にする
  useEffect(() => {
    if (!enabled || !ready.current) return;
    const j = JSON.stringify(st);
    if (j === lastJson.current) return;
    lastJson.current = j;
    if (!metaRef.current.dirty) saveMeta({ ...metaRef.current, dirty: true });
    setStatus((s) => (s === "auth" || s === "syncing" ? s : "pending"));
  }, [enabled, st, saveMeta]);

  // 定期送信 + タブを離れたとき
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => void push(), INTERVAL_MS);
    const onVis = () => document.visibilityState === "hidden" && void push();
    const onOnline = () => void push();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onOnline);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onOnline);
    };
  }, [enabled, push]);

  return {
    status,
    syncedAt,
    /** 今すぐ送る (未送信があれば) */
    syncNow: push,
    /** 再ログイン後に呼ぶ */
    reconcile,
    isDirty: () => metaRef.current.dirty,
  };
}
