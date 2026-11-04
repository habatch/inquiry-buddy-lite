"use client";

import { useEffect, useRef, useState } from "react";
import { QUESTION_BANK } from "@/lib/steps";
import { newsSearchUrl, topicsForInterests } from "@/lib/topicBank";

const card = "rounded-xl border border-stone-200 bg-white p-4 shadow-sm";
const linkBtn =
  "inline-flex items-center gap-1 rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800";

/** Step 1: 話題カード */
export function TopicsWidget({
  interests,
  otherInterest,
  customTopic,
}: {
  interests: string[];
  otherInterest?: string;
  customTopic?: string;
}) {
  const topics = topicsForInterests(interests);
  return (
    <div className={card}>
      <h3 className="text-sm font-semibold text-stone-800">📰 考えるきっかけの話題</h3>
      <p className="mt-1 text-xs text-stone-500">
        読んでみて「これ気になる」「これは別に」と感じるだけで OK。🔎 から最新のニュースを探せるよ。
      </p>
      {otherInterest && (
        <p className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-900">
          ほかに興味がある分野: <span className="font-semibold">{otherInterest}</span>
          <a
            href={newsSearchUrl(otherInterest)}
            target="_blank"
            rel="noopener noreferrer"
            className={`${linkBtn} ml-2`}
          >
            🔎 この分野のニュースを探す
          </a>
        </p>
      )}
      {customTopic && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          最初に書いてくれたテーマ: <span className="font-semibold">{customTopic}</span>
          <br />
          これも「気になること」の 1 つとして使えるよ。
        </p>
      )}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {topics.map((t) => (
          <div key={t.title} className="rounded-lg border border-stone-100 bg-stone-50 p-3">
            <p className="text-sm font-semibold text-stone-800">{t.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-stone-600">{t.body}</p>
            <a
              href={newsSearchUrl(t.query)}
              target="_blank"
              rel="noopener noreferrer"
              className={`${linkBtn} mt-2`}
            >
              🔎 ニュースを探す
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Step 4: 学術データベース検索リンク */
export function SearchWidget({ keywords }: { keywords: string }) {
  const q = keywords.trim();
  const enc = encodeURIComponent(q);
  const sites = [
    { name: "Google Scholar", desc: "論文全般", url: `https://scholar.google.com/scholar?q=${enc}` },
    { name: "CiNii Research", desc: "日本の論文・本", url: `https://cir.nii.ac.jp/all?q=${enc}` },
    {
      name: "J-STAGE",
      desc: "日本の学会誌",
      url: `https://www.jstage.jst.go.jp/result/global/-char/ja?globalSearchKey=${enc}`,
    },
    { name: "Google ニュース", desc: "最近の記事", url: newsSearchUrl(q) },
  ];
  return (
    <div className={card}>
      <h3 className="text-sm font-semibold text-stone-800">📄 文献を探す</h3>
      <p className="mt-1 text-xs text-stone-500">
        下の「検索キーワード」欄に書いた言葉で、各データベースを開けるよ。
      </p>
      {q ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {sites.map((s) => (
            <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer" className={linkBtn}>
              🔎 {s.name}
              <span className="text-stone-400">({s.desc})</span>
            </a>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-500">
          キーワードを入れると検索ボタンが出てくるよ。
        </p>
      )}
    </div>
  );
}

function charStats(text: string) {
  const len = text.replace(/\s/g, "").length;
  // 日本語の発表は 1 分あたり 300 字前後が目安
  const sec = Math.round((len / 300) * 60);
  return { len, sec };
}

function LengthMeter({ text }: { text: string }) {
  const { len, sec } = charStats(text);
  const tone =
    len === 0
      ? "text-stone-400"
      : len < 250
        ? "text-sky-700"
        : len <= 350
          ? "text-brand-700"
          : "text-rose-700";
  const msg =
    len === 0
      ? "まだ書かれていないよ"
      : len < 250
        ? "1 分には少し短め"
        : len <= 350
          ? "1 分にちょうどいい長さ"
          : "1 分には少し長め";
  return (
    <p className={`text-xs font-medium ${tone}`}>
      {len} 字 ・ 読むと約 {sec} 秒 ・ {msg}
    </p>
  );
}

/** Step 8: A〜D を連結 */
export function ComposeWidget({
  parts,
  finalText,
  onCompose,
}: {
  parts: string[];
  finalText: string;
  onCompose: (text: string) => void;
}) {
  const filled = parts.filter((p) => p.trim()).length;
  function compose() {
    const draft = parts.map((p) => p.trim()).filter(Boolean).join("");
    if (finalText.trim() && !confirm("完成版の欄を、A〜D をつなげた下書きで上書きしますか？")) return;
    onCompose(draft);
  }
  return (
    <div className={card}>
      <h3 className="text-sm font-semibold text-stone-800">🧩 A〜D を 1 つの文章に</h3>
      <p className="mt-1 text-xs text-stone-500">
        A〜D を書いたら、ボタンで「完成版の発表文」に下書きを作れるよ。つなぎの言葉は自分で足してね。
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          onClick={compose}
          disabled={filled === 0}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-stone-300"
        >
          A〜D をつなげる ({filled}/4)
        </button>
        <LengthMeter text={finalText} />
      </div>
    </div>
  );
}

/** Step 9: タイマー + 字数 + 想定質問集 */
export function RehearsalWidget({ text }: { text: string }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    startRef.current = Date.now() - elapsed * 1000;
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 200);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const over = elapsed > 60;
  return (
    <div className={`${card} space-y-4`}>
      <div>
        <h3 className="text-sm font-semibold text-stone-800">⏱️ 1 分タイマー</h3>
        <p className="mt-1 text-xs text-stone-500">
          スタートを押して、発表文を声に出して読んでみよう。
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span
            className={`font-mono text-3xl font-bold tabular-nums ${over ? "text-rose-600" : "text-stone-800"}`}
          >
            {String(Math.floor(elapsed / 60)).padStart(1, "0")}:{String(elapsed % 60).padStart(2, "0")}
          </span>
          <button
            onClick={() => setRunning((r) => !r)}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            {running ? "ストップ" : elapsed ? "再開" : "スタート"}
          </button>
          <button
            onClick={() => {
              setRunning(false);
              setElapsed(0);
            }}
            className="rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-700 hover:bg-stone-200"
          >
            リセット
          </button>
          {over && <span className="text-xs font-semibold text-rose-600">1 分を超えたよ</span>}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-stone-800">📏 ステップ 8 の発表文の長さ</h3>
        <div className="mt-1">
          <LengthMeter text={text} />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-stone-800">🙋 想定質問集</h3>
        <p className="mt-1 text-xs text-stone-500">
          聞き手からよく出る質問だよ。2 つ選んで、下の欄に自分の言葉で答えを書こう。
        </p>
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {QUESTION_BANK.map((q) => (
            <li key={q} className="rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-700">
              Q. {q}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Step 10: 学校の外へ */
export function OutreachWidget() {
  const g = (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;
  const paths = [
    {
      icon: "🏆",
      title: "A) コンテスト・大会に応募",
      body: "高校生向けの研究コンテストはたくさんある。分野や締め切りで探してみよう。",
      links: [
        { label: "高校生 研究 コンテスト", url: g("高校生 研究 コンテスト 募集") },
        { label: "高校生 探究 発表会", url: g("高校生 探究 発表会 募集") },
      ],
    },
    {
      icon: "📝",
      title: "B) Web で発信",
      body: "探究を記事にして残すと、同じことに興味がある人とつながれるかも。公開する前に先生や家族に読んでもらおう。",
      links: [
        { label: "note", url: "https://note.com/" },
        { label: "探究 記事 書き方", url: g("探究 レポート 書き方 高校生") },
      ],
    },
    {
      icon: "🏛",
      title: "C) 大学・研究室に聞く",
      body: "気になる研究室に質問のメールを送ってみよう。答えてくれる先生は意外と多いよ。送る前に先生に相談しよう。",
      links: [
        { label: "キーワード + 研究室", url: g("研究室 高校生 質問") },
        { label: "オープンキャンパス", url: g("オープンキャンパス 研究室 見学") },
      ],
    },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {paths.map((p) => (
        <div key={p.title} className={card}>
          <p className="text-sm font-semibold text-stone-800">
            {p.icon} {p.title}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-stone-600">{p.body}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {p.links.map((l) => (
              <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" className={linkBtn}>
                🔎 {l.label}
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
