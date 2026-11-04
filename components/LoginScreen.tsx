"use client";

import { useState } from "react";
import { api, ApiError, formatCode } from "@/lib/api";
import type { StudentInfo } from "@/lib/storage";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

interface Props {
  onStudent: (s: StudentInfo) => void;
  onGuest: () => void;
  /** ログイン切れで再ログインするとき (ゲストの選択肢を出さない) */
  relogin?: StudentInfo | null;
  onCancel?: () => void;
}

export function LoginScreen({ onStudent, onGuest, relogin, onCancel }: Props) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = code.replace(/-/g, "").length === 12;

  async function login() {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ student: StudentInfo }>("/student/login", { method: "POST", json: { code } });
      if (relogin && r.student.id !== relogin.id) {
        setError("別の生徒のコードです。自分のカードのコードを入れてね。");
        return;
      }
      onStudent(r.student);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "ログインできませんでした");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-stone-50 to-brand-50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl">
        <div className="bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🌱</span>
            <div>
              <h1 className="text-xl font-bold">探究伴走ノート</h1>
              <p className="mt-0.5 text-sm text-brand-50/90">
                {relogin ? "ログインの期限が切れました。もう一度コードを入れてね" : "先生からもらったログインコードを入れてね"}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-6">
          <div>
            <label htmlFor="login-code" className="text-sm font-semibold text-stone-800">
              ログインコード
            </label>
            <input
              id="login-code"
              value={code}
              onChange={(e) => setCode(formatCode(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && login()}
              placeholder="ABCD-EFGH-JKMN"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              inputMode="text"
              className="mt-2 w-full rounded-lg border-2 border-stone-300 px-4 py-3 text-center font-mono text-xl tracking-widest focus:border-brand-500 focus:outline-none"
            />
            <p className="mt-1.5 text-xs text-stone-500">ハイフンは自動で入るよ。小文字で打っても大丈夫。</p>
          </div>
          {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          <button
            onClick={login}
            disabled={!ready || busy}
            className="w-full rounded-lg bg-brand-600 px-4 py-3 text-base font-bold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            {busy ? "確認中…" : "ログイン"}
          </button>

          {relogin ? (
            onCancel && (
              <button onClick={onCancel} className="w-full text-sm text-stone-500 hover:underline">
                あとで (この端末には保存され続けます)
              </button>
            )
          ) : (
            <div className="space-y-2 border-t border-stone-100 pt-4 text-center text-sm">
              <button onClick={onGuest} className="text-stone-600 hover:underline">
                ログインせずに使う (この端末だけに保存・先生には共有されません)
              </button>
              <p>
                <a href={`${BASE}/teacher/`} className="font-medium text-brand-700 hover:underline">
                  👩‍🏫 先生はこちら
                </a>
              </p>
              <p>
                <a href={`${BASE}/privacy/`} className="text-xs text-stone-400 hover:underline">
                  データの取り扱いについて
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
