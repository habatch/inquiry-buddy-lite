"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { RANKS } from "@/lib/ranks";
import { STEPS } from "@/lib/steps";
import { parseState, answerKey, checkKey, stepStatus, type AppState } from "@/lib/state";
import { AGE_OPTIONS, INTEREST_CATEGORIES } from "@/lib/topics";
import { kindMeta, STATUS_META } from "@/lib/actions";
import { RankIcon } from "@/components/RankIcon";
import { saveBlob } from "@/lib/file";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

interface TeacherInfo {
  name: string;
  email: string;
  schoolName: string;
}
interface ClassRow {
  id: string;
  name: string;
  students: number;
  last_activity: number | null;
}
interface ProgressRow {
  id: string;
  number: string;
  name: string;
  score: number | null;
  rank_id: string | null;
  step: number | null;
  steps_ready: number | null;
  actions_total: number | null;
  actions_done: number | null;
  updated_at: number | null;
}
interface NewCode {
  id?: string;
  number: string;
  name: string;
  code: string;
}

// ------------------------------------------------------------------
// 共通の見た目
// ------------------------------------------------------------------
const card = "rounded-xl border border-stone-200 bg-white p-4 shadow-sm";
const input =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200";
const inputSm =
  "w-16 rounded-lg border border-stone-300 px-2 py-2 text-sm text-center focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200";
const btn = "rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-stone-300";
const btnSub = "rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-700 hover:bg-stone-200";

function ago(t: number | null): string {
  if (!t) return "—";
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return "たった今";
  if (m < 60) return `${m} 分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 時間前`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d} 日前` : new Date(t).toLocaleDateString("ja-JP");
}

const rankOf = (id: string | null) => RANKS.find((r) => r.id === id) ?? RANKS[0];
const stepOf = (n: number | null) => STEPS.find((s) => s.id === n);

// hash でいる画面を覚える (再読み込みしても同じ画面に戻る)
type Route = { page: "home" } | { page: "class"; id: string } | { page: "student"; id: string; classId: string };
function readRoute(): Route {
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.get("student") && h.get("class")) return { page: "student", id: h.get("student")!, classId: h.get("class")! };
  if (h.get("class")) return { page: "class", id: h.get("class")! };
  return { page: "home" };
}
function writeRoute(r: Route) {
  const h = r.page === "home" ? "" : r.page === "class" ? `class=${r.id}` : `class=${r.classId}&student=${r.id}`;
  history.pushState(null, "", h ? `#${h}` : location.pathname);
}

// ------------------------------------------------------------------
// ページ
// ------------------------------------------------------------------
export default function TeacherPage() {
  const [me, setMe] = useState<TeacherInfo | null | undefined>(undefined);
  const [route, setRoute] = useState<Route>({ page: "home" });

  useEffect(() => {
    setRoute(readRoute());
    const onPop = () => setRoute(readRoute());
    window.addEventListener("popstate", onPop);
    api<{ teacher: TeacherInfo }>("/teacher/me")
      .then((r) => setMe(r.teacher))
      .catch(() => setMe(null));
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const go = (r: Route) => {
    writeRoute(r);
    setRoute(r);
    window.scrollTo({ top: 0 });
  };

  async function logout() {
    try {
      await api("/teacher/logout", { method: "POST", json: {} });
    } catch {
      /* ignore */
    }
    setMe(null);
    go({ page: "home" });
  }

  if (me === undefined) return <div className="flex h-screen items-center justify-center text-stone-400">読み込み中…</div>;
  if (me === null) return <TeacherAuth onDone={setMe} />;

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="flex items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-3 shadow-sm print:hidden sm:px-6">
        <button onClick={() => go({ page: "home" })} className="flex min-w-0 items-center gap-3 text-left">
          <span className="text-2xl">🌱</span>
          <span className="min-w-0">
            <span className="block text-lg font-bold text-stone-800">探究伴走ノート 先生用</span>
            <span className="block truncate text-xs text-stone-500">
              {me.schoolName} ・ {me.name} 先生
            </span>
          </span>
        </button>
        <button onClick={logout} className={btnSub}>
          ログアウト
        </button>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {route.page === "home" && <ClassList onOpen={(id) => go({ page: "class", id })} />}
        {route.page === "class" && (
          <ClassView
            classId={route.id}
            onBack={() => go({ page: "home" })}
            onStudent={(sid) => go({ page: "student", id: sid, classId: route.id })}
          />
        )}
        {route.page === "student" && (
          <StudentView studentId={route.id} onBack={() => go({ page: "class", id: route.classId })} />
        )}
      </main>
    </div>
  );
}

// ------------------------------------------------------------------
// ログイン / 新規登録
// ------------------------------------------------------------------
function TeacherAuth({ onDone }: { onDone: (t: TeacherInfo) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [f, setF] = useState({ inviteCode: "", email: "", name: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((x) => ({ ...x, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r =
        mode === "login"
          ? await api<{ teacher: TeacherInfo }>("/teacher/login", { method: "POST", json: { email: f.email, password: f.password } })
          : await api<{ teacher: TeacherInfo }>("/teacher/register", { method: "POST", json: f });
      onDone(r.teacher);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "うまくいきませんでした");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-stone-50 to-brand-50 p-4">
      <form onSubmit={submit} className="w-full max-w-md overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl">
        <div className="bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-5 text-white">
          <h1 className="text-xl font-bold">👩‍🏫 探究伴走ノート 先生用</h1>
          <p className="mt-0.5 text-sm text-brand-50/90">クラスの進捗と記録を確認できます</p>
        </div>
        <div className="flex border-b border-stone-200">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 border-b-2 py-3 text-sm font-medium ${mode === m ? "border-brand-600 text-brand-700" : "border-transparent text-stone-500"}`}
            >
              {m === "login" ? "ログイン" : "はじめて使う (登録)"}
            </button>
          ))}
        </div>
        <div className="space-y-3 px-6 py-5">
          {mode === "register" && (
            <>
              <Field label="学校の招待コード" hint="運営者から学校に配られたコードです">
                <input value={f.inviteCode} onChange={set("inviteCode")} required autoComplete="off" className={`${input} font-mono uppercase`} />
              </Field>
              <Field label="お名前">
                <input value={f.name} onChange={set("name")} required autoComplete="name" className={input} />
              </Field>
            </>
          )}
          <Field label="メールアドレス">
            <input type="email" value={f.email} onChange={set("email")} required autoComplete="email" className={input} />
          </Field>
          <Field label="パスワード" hint={mode === "register" ? "10 文字以上" : undefined}>
            <input
              type="password"
              value={f.password}
              onChange={set("password")}
              required
              minLength={mode === "register" ? 10 : undefined}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className={input}
            />
          </Field>
          {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          <button type="submit" disabled={busy} className={`${btn} w-full py-2.5`}>
            {busy ? "確認中…" : mode === "login" ? "ログイン" : "登録してはじめる"}
          </button>
          <p className="text-center text-xs">
            <a href={`${BASE}/`} className="text-stone-500 hover:underline">
              ← 生徒用の画面へ
            </a> ・{" "}
            <a href={`${BASE}/privacy/`} className="text-stone-500 hover:underline">
              データの取り扱い
            </a>
          </p>
        </div>
      </form>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-stone-800">{label}</span>
      {hint && <span className="ml-2 text-xs text-stone-500">{hint}</span>}
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

// ------------------------------------------------------------------
// クラス一覧
// ------------------------------------------------------------------
function ClassList({ onOpen }: { onOpen: (id: string) => void }) {
  const [classes, setClasses] = useState<ClassRow[] | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ classes: ClassRow[] }>("/teacher/classes")
      .then((r) => setClasses(r.classes))
      .catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      const r = await api<{ class: { id: string } }>("/teacher/classes", { method: "POST", json: { name } });
      setName("");
      onOpen(r.class.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "作成できませんでした");
    }
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-stone-800">担当クラス</h2>
      {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      {classes === null ? (
        <p className="text-stone-400">読み込み中…</p>
      ) : classes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-white px-4 py-8 text-center text-sm text-stone-500">
          まだクラスがありません。下からクラスを作り、名簿を登録してください。
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <button key={c.id} onClick={() => onOpen(c.id)} className={`${card} text-left hover:border-brand-300`}>
              <p className="text-base font-semibold text-stone-800">{c.name}</p>
              <p className="mt-1 text-xs text-stone-500">
                {c.students} 人 ・ 最終活動 {ago(c.last_activity)}
              </p>
            </button>
          ))}
        </div>
      )}
      <form onSubmit={create} className={`${card} flex flex-wrap items-end gap-2`}>
        <label className="min-w-[12rem] flex-1">
          <span className="text-sm font-semibold text-stone-800">新しいクラスを作る</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例: 2年3組 探究" className={`${input} mt-1`} required maxLength={50} />
        </label>
        <button className={btn}>作成</button>
      </form>
    </div>
  );
}

// ------------------------------------------------------------------
// クラスの進捗
// ------------------------------------------------------------------
type SortKey = "number" | "step" | "score" | "updated_at";

function ClassView({ classId, onBack, onStudent }: { classId: string; onBack: () => void; onStudent: (id: string) => void }) {
  const [cls, setCls] = useState<{ id: string; name: string } | null>(null);
  const [rows, setRows] = useState<ProgressRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("number");
  const [codes, setCodes] = useState<NewCode[] | null>(null);
  const [loadedAt, setLoadedAt] = useState<number | null>(null);

  const load = useCallback(() => {
    api<{ class: { id: string; name: string }; students: ProgressRow[] }>(`/teacher/progress?class=${encodeURIComponent(classId)}`)
      .then((r) => {
        setCls(r.class);
        setRows(r.students);
        setLoadedAt(Date.now());
        setError(null);
      })
      .catch((e) => setError(e.message));
  }, [classId]);

  // 授業中に開きっぱなしにできるよう、表示中は 60 秒ごとに更新
  useEffect(() => {
    load();
    const t = setInterval(() => document.visibilityState === "visible" && load(), 60_000);
    return () => clearInterval(t);
  }, [load]);

  const sorted = useMemo(() => {
    if (!rows) return [];
    const r = [...rows];
    const num = (x: ProgressRow) => Number(x.number) || 0;
    if (sort === "number") r.sort((a, b) => num(a) - num(b) || a.number.localeCompare(b.number));
    else r.sort((a, b) => (b[sort] ?? -1) - (a[sort] ?? -1));
    return r;
  }, [rows, sort]);

  const stats = useMemo(() => {
    const list = rows ?? [];
    const started = list.filter((r) => r.updated_at);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const byStep = STEPS.map((s) => ({ step: s, n: started.filter((r) => r.step === s.id).length }));
    return {
      total: list.length,
      started: started.length,
      activeToday: started.filter((r) => (r.updated_at ?? 0) >= today.getTime()).length,
      avgReady: started.length ? started.reduce((a, r) => a + (r.steps_ready ?? 0), 0) / started.length : 0,
      byStep,
    };
  }, [rows]);

  function exportCsv() {
    const head = ["出席番号", "名前", "現在のステップ", "達成ステップ数", "ランク", "スコア", "行動(できた)", "行動(全体)", "最終更新"];
    const lines = sorted.map((r) => [
      r.number,
      r.name,
      r.step ? `${r.step}. ${stepOf(r.step)?.name ?? ""}` : "未開始",
      r.steps_ready ?? 0,
      r.updated_at ? rankOf(r.rank_id).nameJa : "",
      r.score ?? 0,
      r.actions_done ?? 0,
      r.actions_total ?? 0,
      r.updated_at ? new Date(r.updated_at).toLocaleString("ja-JP") : "",
    ]);
    const csv = [head, ...lines].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    saveBlob(new Blob(["﻿" + csv], { type: "text/csv" }), `進捗_${cls?.name ?? "クラス"}_${new Date().toISOString().slice(0, 10)}.csv`);
  }

  if (codes) return <CodeSheet className={cls?.name ?? ""} codes={codes} onClose={() => { setCodes(null); load(); }} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <button onClick={onBack} className={btnSub}>
          ← クラス一覧
        </button>
        <h2 className="text-xl font-bold text-stone-800">{cls?.name ?? "…"}</h2>
        <span className="text-xs text-stone-400">{loadedAt && `更新 ${new Date(loadedAt).toLocaleTimeString("ja-JP")} (60 秒ごとに自動更新)`}</span>
        <div className="ml-auto flex gap-2">
          <button onClick={load} className={btnSub}>
            ↻ 更新
          </button>
          <button onClick={exportCsv} disabled={!rows?.length} className={btnSub}>
            CSV 出力
          </button>
        </div>
      </div>
      {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      {rows && rows.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="登録人数" value={`${stats.total} 人`} />
          <Stat label="書き始めた人" value={`${stats.started} 人`} sub={stats.total - stats.started ? `未開始 ${stats.total - stats.started} 人` : "全員"} />
          <Stat label="今日活動した人" value={`${stats.activeToday} 人`} />
          <Stat label="達成ステップ (平均)" value={`${stats.avgReady.toFixed(1)} / ${STEPS.length}`} />
        </div>
      )}

      {rows && stats.started > 0 && (
        <div className={card}>
          <p className="text-sm font-semibold text-stone-800">いま取り組んでいるステップ</p>
          <div className="mt-3 space-y-1.5">
            {stats.byStep.map(({ step, n }) => (
              <div key={step.id} className="flex items-center gap-2 text-xs">
                <span className="w-28 shrink-0 truncate text-stone-600">
                  {step.icon} {step.id}. {step.name}
                </span>
                <div className="h-4 flex-1 rounded bg-stone-100">
                  <div className="h-4 rounded bg-brand-500" style={{ width: `${stats.started ? (n / stats.started) * 100 : 0}%` }} />
                </div>
                <span className="w-10 text-right tabular-nums text-stone-700">{n} 人</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {rows === null ? (
        <p className="text-stone-400">読み込み中…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-white px-4 py-8 text-center text-sm text-stone-500">
          まだ生徒が登録されていません。下の「名簿を登録」から追加してください。
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-stone-50 text-left text-xs text-stone-500">
              <tr>
                {(
                  [
                    ["number", "番号"],
                    [null, "名前"],
                    ["step", "現在のステップ"],
                    [null, "達成"],
                    ["score", "ランク / スコア"],
                    [null, "行動"],
                    ["updated_at", "最終更新"],
                  ] as [SortKey | null, string][]
                ).map(([k, label]) => (
                  <th key={label} className="px-3 py-2 font-medium">
                    {k ? (
                      <button onClick={() => setSort(k)} className={sort === k ? "font-bold text-brand-700" : "hover:text-stone-800"}>
                        {label} {sort === k && "▼"}
                      </button>
                    ) : (
                      label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const rk = rankOf(r.rank_id);
                const st = stepOf(r.step);
                const stale = r.updated_at && Date.now() - r.updated_at > 7 * 86400_000;
                return (
                  <tr key={r.id} onClick={() => onStudent(r.id)} className="cursor-pointer border-t border-stone-100 hover:bg-brand-50/50">
                    <td className="px-3 py-2 tabular-nums text-stone-600">{r.number}</td>
                    <td className="px-3 py-2 font-medium text-stone-800">{r.name || "—"}</td>
                    <td className="px-3 py-2 text-stone-700">{r.updated_at && st ? `${st.icon} ${st.id}. ${st.name}` : <span className="text-stone-400">未開始</span>}</td>
                    <td className="px-3 py-2 tabular-nums text-stone-700">{r.updated_at ? `${r.steps_ready ?? 0}/${STEPS.length}` : "—"}</td>
                    <td className="px-3 py-2">
                      {r.updated_at ? (
                        <span className="inline-flex items-center gap-1.5" style={{ color: rk.color }}>
                          <RankIcon iconKey={rk.iconKey} size={18} />
                          <span className="text-xs font-semibold">{rk.nameJa}</span>
                          <span className="text-xs tabular-nums text-stone-500">{r.score} pt</span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-stone-700">{r.updated_at ? `${r.actions_done ?? 0}/${r.actions_total ?? 0}` : "—"}</td>
                    <td className={`px-3 py-2 text-xs ${stale ? "font-semibold text-amber-700" : "text-stone-500"}`}>{ago(r.updated_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AddStudents classId={classId} onCreated={setCodes} />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className={card}>
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-stone-800">{value}</p>
      {sub && <p className="text-xs text-stone-400">{sub}</p>}
    </div>
  );
}

/** 「1 山田太郎」「1,山田太郎」「1<TAB>山田太郎」「1」のどれでも読めるようにする */
function parseRoster(text: string): { number: string; name: string }[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^([^\s,，\t]+)[\s,，\t]*(.*)$/);
      return { number: (m?.[1] ?? l).normalize("NFKC"), name: (m?.[2] ?? "").trim() };
    });
}

function AddStudents({ classId, onCreated }: { classId: string; onCreated: (c: NewCode[]) => void }) {
  const [text, setText] = useState("");
  const [from, setFrom] = useState("1");
  const [to, setTo] = useState("40");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const list = parseRoster(text);

  async function submit(students: { number: string; name: string }[]) {
    if (!students.length) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await api<{ created: NewCode[]; skipped: string[] }>(`/teacher/students?class=${encodeURIComponent(classId)}`, {
        method: "POST",
        json: { students },
      });
      if (r.skipped.length) alert(`次の番号はすでに登録済みのため飛ばしました: ${r.skipped.join(", ")}`);
      if (r.created.length) onCreated(r.created);
      setText("");
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : "登録できませんでした");
    } finally {
      setBusy(false);
    }
  }

  function range() {
    const a = Number(from), b = Number(to);
    if (!(a >= 0 && b >= a && b - a < 60)) return setMsg("番号の範囲を確認してください (60 人まで)");
    void submit(Array.from({ length: b - a + 1 }, (_, i) => ({ number: String(a + i), name: "" })));
  }

  return (
    <div className={`${card} space-y-4 print:hidden`}>
      <div>
        <h3 className="text-sm font-semibold text-stone-800">👥 名簿を登録してログインコードを発行</h3>
        <p className="mt-1 text-xs text-stone-500">
          1 行に 1 人。「出席番号 名前」の順 (区切りは空白・カンマ・タブ。Excel からの貼り付けも可)。名前は省略できます。
          個人情報を減らしたい場合は、名前を空欄にして番号だけで運用できます。
        </p>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder={"1 青木\n2 井上\n3 上田"}
        className={`${input} font-mono`}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => void submit(list)} disabled={busy || !list.length} className={btn}>
          {busy ? "発行中…" : `${list.length} 人を登録してコード発行`}
        </button>
        <span className="text-xs text-stone-400">または</span>
        <input value={from} onChange={(e) => setFrom(e.target.value)} className={inputSm} inputMode="numeric" aria-label="開始番号" />
        <span className="text-xs">〜</span>
        <input value={to} onChange={(e) => setTo(e.target.value)} className={inputSm} inputMode="numeric" aria-label="終了番号" />
        <button onClick={range} disabled={busy} className={btnSub}>
          番号だけで一括発行
        </button>
      </div>
      {msg && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{msg}</p>}
    </div>
  );
}

// ------------------------------------------------------------------
// 発行したコードの表示・印刷
// ------------------------------------------------------------------
function CodeSheet({ className, codes, onClose }: { className: string; codes: NewCode[]; onClose: () => void }) {
  const site = typeof location !== "undefined" ? `${location.origin}${BASE}/` : "";
  function csv() {
    const body = [["出席番号", "名前", "ログインコード"], ...codes.map((c) => [c.number, c.name, c.code])]
      .map((l) => l.map((v) => `"${v}"`).join(","))
      .join("\r\n");
    saveBlob(new Blob(["﻿" + body], { type: "text/csv" }), `ログインコード_${className}.csv`);
  }
  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 print:hidden">
        <p className="font-bold text-amber-900">⚠ ログインコードはこの画面でしか表示されません</p>
        <p className="text-sm text-amber-900">
          印刷するか CSV で保存してから閉じてください。なくした場合は、生徒の画面から「コード再発行」できます (古いコードは使えなくなります)。
        </p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => window.print()} className={btn}>
            🖨 カードを印刷
          </button>
          <button onClick={csv} className={btnSub}>
            CSV で保存
          </button>
          <button
            onClick={() => confirm("印刷・保存は済みましたか？閉じるとコードは二度と表示されません。") && onClose()}
            className={btnSub}
          >
            閉じる
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 print:grid-cols-3 print:gap-0">
        {codes.map((c) => (
          <div key={c.number} className="break-inside-avoid rounded-lg border-2 border-dashed border-stone-300 bg-white p-3 print:rounded-none print:border">
            <p className="text-xs text-stone-500">
              🌱 探究伴走ノート ・ {className}
            </p>
            <p className="mt-1 text-sm font-semibold text-stone-800">
              {c.number}番 {c.name}
            </p>
            <p className="mt-2 text-center font-mono text-lg font-bold tracking-wider text-stone-900">{c.code}</p>
            <p className="mt-1 break-all text-[10px] leading-tight text-stone-500">{site}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// 生徒 1 人の記録
// ------------------------------------------------------------------
function StudentView({ studentId, onBack }: { studentId: string; onBack: () => void }) {
  const [data, setData] = useState<{ student: Record<string, unknown>; state: AppState | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newCode, setNewCode] = useState<string | null>(null);

  useEffect(() => {
    api<{ student: Record<string, unknown>; state: unknown }>(`/teacher/student?id=${encodeURIComponent(studentId)}`)
      .then((r) => setData({ student: r.student, state: r.state ? parseState(r.state) : null }))
      .catch((e) => setError(e.message));
  }, [studentId]);

  async function resetCode() {
    if (!confirm("ログインコードを再発行しますか？古いコードは使えなくなり、ログイン中の端末もログアウトされます (記録は消えません)。")) return;
    try {
      const r = await api<{ code: string }>(`/teacher/student?id=${encodeURIComponent(studentId)}`, { method: "POST", json: { action: "reset-code" } });
      setNewCode(r.code);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "再発行できませんでした");
    }
  }

  async function remove() {
    if (!confirm("この生徒と、その記録をすべて削除します。元に戻せません。よろしいですか？")) return;
    try {
      await api(`/teacher/student?id=${encodeURIComponent(studentId)}`, { method: "DELETE" });
      onBack();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "削除できませんでした");
    }
  }

  if (error) return <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>;
  if (!data) return <p className="text-stone-400">読み込み中…</p>;
  const s = data.student as { number: string; name: string; class_name: string; score: number | null; rank_id: string | null; updated_at: number | null };
  const st = data.state;
  const rk = rankOf(s.rank_id);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={onBack} className={btnSub}>
          ← {s.class_name}
        </button>
        <h2 className="text-xl font-bold text-stone-800">
          {s.number}番 {s.name}
        </h2>
        {s.updated_at && (
          <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: rk.color }}>
            <RankIcon iconKey={rk.iconKey} size={20} /> {rk.nameJa} ・ {s.score} pt
          </span>
        )}
        <span className="text-xs text-stone-500">最終更新 {ago(s.updated_at)}</span>
        <div className="ml-auto flex gap-2">
          <button onClick={resetCode} className={btnSub}>
            コード再発行
          </button>
          <button onClick={remove} className="rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50">
            削除
          </button>
        </div>
      </div>

      {newCode && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
          <p className="text-sm text-amber-900">新しいログインコード (この画面でしか表示されません):</p>
          <p className="mt-1 font-mono text-2xl font-bold tracking-wider text-stone-900">{newCode}</p>
        </div>
      )}

      {!st ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-white px-4 py-8 text-center text-sm text-stone-500">
          まだ記録がありません (ログインしていないか、書き始めていません)。
        </p>
      ) : (
        <>
          {st.profile && (
            <div className={card}>
              <p className="text-sm font-semibold text-stone-800">プロフィール</p>
              <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-[8rem_1fr]">
                <dt className="text-stone-500">年齢層</dt>
                <dd>{AGE_OPTIONS.find((a) => a.id === st.profile!.age)?.label ?? "—"}</dd>
                <dt className="text-stone-500">興味分野</dt>
                <dd>
                  {st.profile.interests.map((id) => INTEREST_CATEGORIES.find((c) => c.id === id)?.label).filter(Boolean).join(" / ") || "—"}
                  {st.profile.otherInterest && ` / ${st.profile.otherInterest}`}
                </dd>
                {st.profile.customTopic && (
                  <>
                    <dt className="text-stone-500">気になるテーマ</dt>
                    <dd className="whitespace-pre-wrap">{st.profile.customTopic}</dd>
                  </>
                )}
              </dl>
            </div>
          )}

          {STEPS.map((step) => {
            const filled = step.fields.filter((f) => (st.answers[answerKey(step.id, f.id)] ?? "").trim());
            if (!filled.length) return null;
            const status = stepStatus(step, st);
            return (
              <div key={step.id} className={card}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold text-stone-800">
                    {step.icon} ステップ {step.id}: {step.name}
                  </p>
                  {status.ready ? (
                    <span className="rounded bg-brand-100 px-2 py-0.5 text-xs text-brand-800">達成</span>
                  ) : (
                    <span className="rounded bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                      記入 {status.filled}/{status.required} ・ チェック {status.checked}/{status.checkTotal}
                    </span>
                  )}
                  {st.step === step.id && <span className="rounded bg-sky-100 px-2 py-0.5 text-xs text-sky-800">いまここ</span>}
                </div>
                <dl className="mt-3 space-y-3">
                  {filled.map((f) => (
                    <div key={f.id}>
                      <dt className="text-xs font-semibold text-stone-500">{f.label}</dt>
                      <dd className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-stone-800">{st.answers[answerKey(step.id, f.id)]}</dd>
                    </div>
                  ))}
                </dl>
                <ul className="mt-3 space-y-0.5 text-xs text-stone-500">
                  {step.checklist.map((c, i) => (
                    <li key={c}>
                      {st.checks[checkKey(step.id, i)] ? "☑" : "☐"} {c}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {st.actions.length > 0 && (
            <div className={card}>
              <p className="text-base font-semibold text-stone-800">🚀 行動ボード ({st.actions.length} 件)</p>
              <ul className="mt-3 space-y-3">
                {[...st.actions].sort((a, b) => b.createdAt - a.createdAt).map((a) => (
                  <li key={a.id} className="rounded-lg border border-stone-100 bg-stone-50 p-3">
                    <p className="text-sm font-medium text-stone-800">
                      {kindMeta(a.kind).icon} {a.title}{" "}
                      <span className={`ml-1 rounded px-1.5 py-0.5 text-xs ${STATUS_META[a.status].color}`}>{STATUS_META[a.status].label}</span>
                      {a.due && <span className="ml-2 text-xs text-stone-500">予定日 {a.due}</span>}
                    </p>
                    {a.memo.trim() && <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-stone-600">{a.memo}</p>}
                    {a.learned.trim() && (
                      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-stone-800">
                        <span className="text-xs font-semibold text-brand-700">分かったこと: </span>
                        {a.learned}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
