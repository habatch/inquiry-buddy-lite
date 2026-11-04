/**
 * 行動を起こすための機能 (行動ボード / 行動キット / 情報ハブ)
 *
 * 探究のステップとは独立に、生徒が「調べる・聞く・行く・試す・作る・発信する」
 * を自分で計画→実行→振り返りできるようにする。AI は使わず、
 * テンプレートと信頼できる情報源へのリンクで行動のハードルを下げる。
 */
import { scoreFromUserMessage } from "./ranks";

// ------------------------------------------------------------------
// 行動の種類
// ------------------------------------------------------------------
export type ActionKind = "research" | "ask" | "visit" | "try" | "make" | "share";

export const ACTION_KINDS: { id: ActionKind; label: string; icon: string }[] = [
  { id: "research", label: "調べる", icon: "📚" },
  { id: "ask", label: "聞く", icon: "🗣️" },
  { id: "visit", label: "行く・見る", icon: "🚶" },
  { id: "try", label: "試す", icon: "🧪" },
  { id: "make", label: "作る", icon: "🛠️" },
  { id: "share", label: "発信する", icon: "📣" },
];

export const kindMeta = (k: ActionKind) =>
  ACTION_KINDS.find((x) => x.id === k) ?? ACTION_KINDS[0];

export type ActionStatus = "todo" | "doing" | "done";

export const STATUS_META: Record<ActionStatus, { label: string; color: string }> = {
  todo: { label: "やる", color: "bg-stone-100 text-stone-700" },
  doing: { label: "やってる", color: "bg-sky-100 text-sky-800" },
  done: { label: "できた", color: "bg-brand-100 text-brand-800" },
};

export interface Action {
  id: string;
  title: string;
  kind: ActionKind;
  status: ActionStatus;
  /** 予定日 (YYYY-MM-DD) */
  due?: string;
  /** 準備メモ・下書き (キットのテンプレートもここに入る) */
  memo: string;
  /** やってみて分かったこと (振り返り) */
  learned: string;
  /** 関連するステップ (任意) */
  step?: number;
  createdAt: number;
}

// ------------------------------------------------------------------
// スコア: 「できた」+ 振り返りが書けた行動だけ加点 (水増し防止で 20 件まで)
// ------------------------------------------------------------------
export const SCORE_ACTION_DONE = 10;
export const ACTION_SCORE_LIMIT = 20;
export const LEARNED_MIN_CHARS = 10;

export function actionScore(a: Action): number {
  if (a.status !== "done" || a.learned.trim().length < LEARNED_MIN_CHARS) return 0;
  return SCORE_ACTION_DONE + scoreFromUserMessage(a.learned);
}

export function actionsScore(actions: Action[]): number {
  return actions
    .map(actionScore)
    .filter((s) => s > 0)
    .sort((a, b) => b - a)
    .slice(0, ACTION_SCORE_LIMIT)
    .reduce((a, b) => a + b, 0);
}

export function newActionId(): string {
  return `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// ------------------------------------------------------------------
// 行動キット: よくある行動を「手順 + 下書きテンプレート + 情報源」で用意
// テンプレートの {{問い}} などは、生徒がステップで書いた内容で置き換える
// ------------------------------------------------------------------
export interface ActionKit {
  id: string;
  kind: ActionKind;
  title: string;
  summary: string;
  /** おすすめのステップ */
  steps: number[];
  howTo: string[];
  /** 外部の人と関わる・外出するなど、事前に大人へ相談すべきもの */
  caution?: string;
  template?: string;
  links?: { label: string; url: string }[];
}

export const ACTION_KITS: ActionKit[] = [
  {
    id: "desk-research",
    kind: "research",
    title: "本・論文・統計で調べる",
    summary: "すでに分かっていることを確かめる。探究の土台になる行動。",
    steps: [1, 2, 3, 4, 6],
    howTo: [
      "情報ハブでキーワードを入れて、ニュース → 百科事典 → 論文・統計 の順に広げる",
      "読んだものはタイトル・書いた人・年・URL をメモする",
      "「誰が書いた？」「元のデータは？」を毎回確かめる",
    ],
    template:
      "調べること: {{問い}}\nキーワード: {{キーワード}}\n\n読んだもの (タイトル / 書いた人 / 年 / URL):\n1. \n2. \n3. \n\n分かったこと:\n",
  },
  {
    id: "interview",
    kind: "ask",
    title: "身近な人にインタビュー",
    summary: "家族・友達・先生・地域の人に、体験や考えを聞く。",
    steps: [1, 2, 3, 5, 6],
    howTo: [
      "誰に聞くと面白い答えが返ってきそうか、3 人候補を出す",
      "質問は 5 個まで。「はい/いいえ」で終わらない聞き方にする",
      "聞いた内容は、その日のうちにメモに起こす",
    ],
    caution: "学校の外の人に話を聞くときは、先に先生か家族に伝えよう。",
    template:
      "【インタビューのお願い】\n〇〇さん、こんにちは。〇〇高校の〇〇です。\n学校の探究の時間で「{{問い}}」について調べています。\n〇〇さんの経験を 10 分ほど聞かせてもらえませんか？\n\n【質問リスト】\n1. 〜について、ふだんどう感じていますか？\n2. それはどんなときですか？\n3. 〜したことはありますか？ そのときどうでしたか？\n4. \n5. 最後に、ほかに知っておくといいことはありますか？\n",
  },
  {
    id: "survey",
    kind: "ask",
    title: "アンケートを取る",
    summary: "たくさんの人の傾向を数字でつかむ。",
    steps: [4, 5],
    howTo: [
      "Google フォームなどで作る (学校のアカウントがあれば使う)",
      "質問は 10 問以内。答えを誘導する聞き方をしない",
      "選択肢には「その他」「わからない」を入れる",
      "配る前に友達 2 人に試しに答えてもらう",
    ],
    caution: "クラスや学年全体に配るときは、先生に確認してからにしよう。名前など個人が分かる情報は集めない。",
    template:
      "アンケートのタイトル: {{問い}} についてのアンケート\n対象: \n人数の目標: \n\nQ1 (選択): \nQ2 (選択): \nQ3 (5 段階: 全くそう思わない〜とてもそう思う): \nQ4 (自由記述): \n\n集計で見たいこと: {{仮説}} が当たっているか",
    links: [{ label: "Google フォーム", url: "https://docs.google.com/forms/" }],
  },
  {
    id: "expert-mail",
    kind: "ask",
    title: "研究者・専門家に質問する",
    summary: "本では分からないことを、その道の人に直接聞く。",
    steps: [4, 6, 9, 10],
    howTo: [
      "情報ハブの「専門家を探す」で、キーワードに近い研究をしている人を探す",
      "大学や研究室のページにある問い合わせ先を確認する",
      "質問は 1〜2 個にしぼり、自分で調べたことも書く",
      "返事がなくても大丈夫。1〜2 週間待とう",
    ],
    caution: "メールを送る前に、必ず先生に文面を見てもらおう。",
    template:
      "件名: 高校生の探究学習についてのご質問\n\n〇〇大学 〇〇先生\n\n突然のご連絡失礼いたします。〇〇高校 〇年の〇〇と申します。\n総合的な探究の時間で「{{問い}}」について調べています。\n\n自分では「{{仮説}}」と考え、〜を調べてみました。\nその中で、〜という点が分からず、先生の研究を拝見してご連絡しました。\n\n【質問】\n1. \n\nお忙しいところ恐縮ですが、ご回答いただけると大変うれしいです。\n\n〇〇高校 〇年 〇〇\n(担当教員: 〇〇先生)",
    links: [
      { label: "researchmap (研究者を探す)", url: "https://researchmap.jp/" },
      { label: "KAKEN (研究テーマを探す)", url: "https://kaken.nii.ac.jp/" },
    ],
  },
  {
    id: "field",
    kind: "visit",
    title: "現地に行って観察する",
    summary: "実際の場所・もの・人の動きを自分の目で見る。",
    steps: [1, 4, 5],
    howTo: [
      "何を・いつ・どこで見るかを先に決める",
      "写真を撮る場合は、人の顔や家が写らないように気をつける",
      "見たこと (事実) と思ったこと (感想) を分けてメモする",
    ],
    caution: "知らない場所へ行くときは、家族に行き先と帰る時間を伝えよう。",
    template:
      "観察すること: \n場所: \n日時: \n天気・気温: \n\n【見たこと (事実)】\n- \n- \n\n【思ったこと (感想・疑問)】\n- \n",
    links: [{ label: "地理院地図", url: "https://maps.gsi.go.jp/" }],
  },
  {
    id: "experiment",
    kind: "try",
    title: "小さく試す (実験)",
    summary: "家や学校でできる規模で、予想が当たるか確かめる。",
    steps: [3, 4, 5],
    howTo: [
      "変える条件を 1 つだけにする。ほかの条件はそろえる",
      "同じ条件で 3 回以上くり返す",
      "結果は表にして、数字で記録する",
    ],
    caution: "火・薬品・刃物・電気を使うときは、必ず先生と一緒にやろう。",
    template:
      "確かめたいこと: {{仮説}}\n\n変える条件: \nそろえる条件: \n測るもの (単位も): \nくり返す回数: \n必要なもの: \n\n| 条件 | 1回目 | 2回目 | 3回目 | 平均 |\n|---|---|---|---|---|\n|  |  |  |  |  |\n",
  },
  {
    id: "prototype",
    kind: "make",
    title: "作って見せる",
    summary: "ポスター・模型・試作品・提案書など、形にして人に見てもらう。",
    steps: [7, 8, 9],
    howTo: [
      "見せたい相手を 1 人決める",
      "完成度より、早く見せて感想をもらうことを優先する",
      "もらった感想は、良かった点と直したい点に分けてメモする",
    ],
    template:
      "作るもの: \n見せる相手: \nいつまでに: \n\n伝えたいこと (1 文): \n\n【もらった感想】\n良かった点: \n直したい点: \n",
  },
  {
    id: "publish",
    kind: "share",
    title: "学校の外へ発信する",
    summary: "コンテスト応募・記事・発表会で、知らない人にも届ける。",
    steps: [8, 9, 10],
    howTo: [
      "どこに出すか (コンテスト / Web 記事 / 地域の発表会) を決める",
      "締め切りと応募の条件を確認する",
      "公開する前に、個人情報が入っていないか見直す",
    ],
    caution: "Web に公開するときやコンテストに応募するときは、先生と家族に相談しよう。",
    template:
      "発信する場所: \n締め切り: \n\nタイトル案:\n1. \n2. \n3. \n\n一番伝えたいこと: {{分かったこと}}\n",
    links: [
      { label: "高校生 研究 コンテスト を探す", url: "https://www.google.com/search?q=" + encodeURIComponent("高校生 研究 コンテスト 募集") },
    ],
  },
];

/** テンプレートの {{…}} を生徒の回答で埋める。未記入なら 〇〇 のまま残す */
export function fillTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(.+?)\}\}/g, (_, k: string) => vars[k]?.trim() || "〇〇");
}

// ------------------------------------------------------------------
// 情報ハブ: 信頼できる情報源をキーワード付きで開く
// ------------------------------------------------------------------
export interface Source {
  name: string;
  desc: string;
  /** キーワード入りの URL。null ならトップページを開く */
  url: (q: string) => string;
}

const enc = encodeURIComponent;
const siteSearch = (site: string) => (q: string) =>
  `https://www.google.com/search?q=${enc(`site:${site} ${q}`)}`;

export const SOURCE_GROUPS: { id: string; title: string; icon: string; hint: string; sources: Source[] }[] = [
  {
    id: "basic",
    title: "まず基本を知る",
    icon: "🔤",
    hint: "言葉の意味や全体像をつかむ。ここだけで終わらせず、元の情報もたどろう。",
    sources: [
      { name: "コトバンク", desc: "辞書・事典をまとめて検索", url: (q) => `https://kotobank.jp/search?q=${enc(q)}` },
      { name: "Wikipedia", desc: "全体像をつかむ (出典をたどる)", url: (q) => `https://ja.wikipedia.org/w/index.php?search=${enc(q)}` },
    ],
  },
  {
    id: "news",
    title: "ニュース・最近の話題",
    icon: "📰",
    hint: "今、社会でどう話題になっているか。日付を必ず確認しよう。",
    sources: [
      { name: "Google ニュース", desc: "複数の新聞社・テレビ局", url: (q) => `https://www.google.com/search?q=${enc(q + " ニュース")}&tbm=nws` },
      { name: "NHK", desc: "NHK のニュース記事", url: siteSearch("www3.nhk.or.jp/news") },
    ],
  },
  {
    id: "papers",
    title: "本・論文",
    icon: "📚",
    hint: "研究者が確かめたこと。タイトルと要旨 (最初の数行) だけ読めば十分。",
    sources: [
      { name: "CiNii Research", desc: "日本の論文・本", url: (q) => `https://cir.nii.ac.jp/all?q=${enc(q)}` },
      { name: "J-STAGE", desc: "日本の学会誌 (無料で読めるものが多い)", url: (q) => `https://www.jstage.jst.go.jp/result/global/-char/ja?globalSearchKey=${enc(q)}` },
      { name: "Google Scholar", desc: "世界中の論文", url: (q) => `https://scholar.google.com/scholar?q=${enc(q)}` },
      { name: "国立国会図書館サーチ", desc: "日本の本・雑誌", url: (q) => `https://ndlsearch.ndl.go.jp/search?cs=bib&keyword=${enc(q)}` },
    ],
  },
  {
    id: "data",
    title: "統計・データ",
    icon: "📊",
    hint: "国や自治体が公開している数字。自分の地域のデータを探すと探究が深まる。",
    sources: [
      { name: "e-Stat", desc: "日本の政府統計", url: siteSearch("e-stat.go.jp") },
      { name: "なるほど統計学園", desc: "統計の読み方 (中高生向け)", url: () => "https://www.stat.go.jp/naruhodo/" },
      { name: "気象庁 過去の気象データ", desc: "気温・雨量など", url: () => "https://www.data.jma.go.jp/stats/etrn/index.php" },
      { name: "地理院地図", desc: "地形・土地の様子", url: () => "https://maps.gsi.go.jp/" },
    ],
  },
  {
    id: "experts",
    title: "専門家を探す",
    icon: "🧑‍🔬",
    hint: "そのテーマを研究している人を見つける。質問するときは「行動キット」を使おう。",
    sources: [
      { name: "researchmap", desc: "日本の研究者データベース", url: siteSearch("researchmap.jp") },
      { name: "KAKEN", desc: "国の研究費で行われた研究", url: (q) => `https://kaken.nii.ac.jp/ja/search/?kw=${enc(q)}` },
      { name: "大学の研究室", desc: "研究室のページを探す", url: (q) => `https://www.google.com/search?q=${enc(q + " 研究室 大学")}` },
    ],
  },
  {
    id: "places",
    title: "行ける場所・資料",
    icon: "🏛",
    hint: "博物館・科学館・資料館は、本物を見られる場所。",
    sources: [
      { name: "ジャパンサーチ", desc: "博物館・図書館の資料を横断", url: siteSearch("jpsearch.go.jp") },
      { name: "近くの博物館・科学館", desc: "テーマに合う施設を探す", url: (q) => `https://www.google.com/search?q=${enc(q + " 博物館 OR 科学館 OR 資料館")}` },
    ],
  },
];

/** 興味分野ごとの、公的機関の情報源 (サイト内検索) */
export const INTEREST_SOURCES: Record<string, Source[]> = {
  nature: [
    { name: "環境省", desc: "環境の政策・データ", url: siteSearch("env.go.jp") },
    { name: "国立環境研究所", desc: "環境の研究", url: siteSearch("nies.go.jp") },
  ],
  science_tech: [
    { name: "サイエンスポータル", desc: "科学技術のニュース (JST)", url: siteSearch("scienceportal.jst.go.jp") },
    { name: "JAXA", desc: "宇宙・航空", url: siteSearch("jaxa.jp") },
  ],
  society: [
    { name: "総務省統計局", desc: "人口・暮らしの統計", url: siteSearch("stat.go.jp") },
    { name: "内閣府", desc: "白書・世論調査", url: siteSearch("cao.go.jp") },
  ],
  language_lit: [
    { name: "国立国語研究所", desc: "日本語の研究", url: siteSearch("ninjal.ac.jp") },
    { name: "青空文庫", desc: "著作権の切れた文学作品", url: siteSearch("aozora.gr.jp") },
  ],
  art_design: [
    { name: "文化庁", desc: "文化・芸術の政策", url: siteSearch("bunka.go.jp") },
    { name: "文化遺産オンライン", desc: "日本の文化財", url: siteSearch("bunka.nii.ac.jp") },
  ],
  sports_health: [
    { name: "厚生労働省", desc: "健康・医療のデータ", url: siteSearch("mhlw.go.jp") },
    { name: "スポーツ庁", desc: "体力・運動の調査", url: siteSearch("mext.go.jp/sports") },
  ],
  career: [
    { name: "job tag", desc: "職業情報 (厚生労働省)", url: siteSearch("shigoto.mhlw.go.jp") },
    { name: "経済産業省", desc: "産業・企業の動き", url: siteSearch("meti.go.jp") },
  ],
  media_ai: [
    { name: "情報通信白書", desc: "ネット・SNS の利用状況 (総務省)", url: siteSearch("soumu.go.jp/johotsusintokei") },
    { name: "総務省", desc: "情報通信の政策", url: siteSearch("soumu.go.jp") },
  ],
  food_living: [
    { name: "農林水産省", desc: "農業・食料のデータ", url: siteSearch("maff.go.jp") },
    { name: "消費者庁", desc: "食品・暮らしの安全", url: siteSearch("caa.go.jp") },
  ],
};

/** 情報の確かさを見分けるチェック (情報ハブに常時表示) */
export const SOURCE_CHECKS = [
  "誰が書いた？ (国・大学・新聞社・個人…)",
  "いつ書かれた？ (古すぎない？)",
  "元のデータや出典は書いてある？",
  "ほかの情報源でも同じことが言われている？",
  "広告や、何かを売るための記事ではない？",
];
