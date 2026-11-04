import type { Metadata } from "next";

export const metadata: Metadata = { title: "データの取り扱い | 探究伴走ノート" };

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

/**
 * 学校・保護者向けの説明 (下書き)。
 * 導入前に、各学校の個人情報保護の方針と照らして内容を確認してもらうこと。
 */
export default function Privacy() {
  const h2 = "mt-8 text-lg font-bold text-stone-800";
  const p = "mt-2 text-sm leading-relaxed text-stone-700";
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <a href={`${BASE}/`} className="text-sm text-brand-700 hover:underline">
        ← 探究伴走ノートへ
      </a>
      <h1 className="mt-4 text-2xl font-bold text-stone-900">データの取り扱いについて</h1>
      <p className={p}>探究伴走ノートで扱うデータと、その使われ方をまとめています。</p>

      <h2 className={h2}>保存するデータ</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-stone-700">
        <li>
          <strong>生徒:</strong> 出席番号、名前 (先生が登録した場合のみ。番号だけでも使えます)、所属クラス、
          年齢層・興味分野、各ステップに書いた内容、行動ボードの内容、スコア・ランク、最終更新日時
        </li>
        <li>
          <strong>先生:</strong> 名前、メールアドレス、パスワード (復元できない形に変換して保存)、所属学校
        </li>
        <li>ログイン状態を保つための情報 (ブラウザの Cookie。中身はランダムな文字列で、個人情報は含みません)</li>
      </ul>
      <p className={p}>
        生徒のログインコードと先生のパスワードは、元に戻せない形 (ハッシュ) でのみ保存しており、運営者も読み取れません。
        広告・行動追跡のためのデータ収集は行いません。
      </p>

      <h2 className={h2}>見られる人</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-stone-700">
        <li>生徒本人</li>
        <li>そのクラスを担当する先生 (他のクラス・他の学校の先生は見られません)</li>
        <li>運営者 (障害対応など、システムの維持に必要な場合に限ります)</li>
      </ul>

      <h2 className={h2}>保存場所</h2>
      <p className={p}>
        Cloudflare 社のクラウド (Cloudflare Pages / D1) に保存し、通信はすべて暗号化 (HTTPS) されます。
        また、書いた内容は通信が切れても失われないよう、使っている端末のブラウザにも保存されます。
        ログアウトすると、サーバに送信済みの記録は端末から消去されます (共用 PC 対策)。
      </p>

      <h2 className={h2}>ログインせずに使う場合</h2>
      <p className={p}>記録はその端末のブラウザの中だけに保存され、サーバには送信されません。先生にも共有されません。</p>

      <h2 className={h2}>削除</h2>
      <p className={p}>
        担当の先生が生徒を削除すると、その生徒の記録はサーバから削除されます。学校単位での削除は運営者が対応します。
      </p>

      <p className="mt-10 text-xs text-stone-400">この説明は下書きです。導入する学校の個人情報保護の方針に合わせて確認・調整してください。</p>
    </main>
  );
}
