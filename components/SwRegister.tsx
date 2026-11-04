"use client";

import { useEffect } from "react";

/** Service Worker を登録する (本番ビルドのみ。開発中はキャッシュで混乱しないよう登録しない) */
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
    navigator.serviceWorker.register(`${base}/sw.js`, { scope: `${base}/` }).catch(() => {
      /* 登録できなくてもアプリは普通に動く */
    });
  }, []);
  return null;
}
