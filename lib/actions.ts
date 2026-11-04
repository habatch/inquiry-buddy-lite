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
  /** 行動キットから作った場合のキット ID */
  kitId?: string;
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
    summary: "すでに分かっていることを確かめます。探究の土台になる行動です。",
    steps: [1, 2, 3, 4, 6],
    howTo: [
      "情報ハブでキーワードを入れて、ニュース → 百科事典 → 論文・統計 の順に広げてください",
      "読んだものは、タイトル・書いた人・年・URL をメモしてください",
      "「誰が書いたか」「元のデータは何か」を毎回確かめてください",
    ],
    template:
      "調べること: {{問い}}\nキーワード: {{キーワード}}\n\n読んだもの (タイトル / 書いた人 / 年 / URL):\n1. \n2. \n3. \n\n分かったこと:\n",
  },
  {
    id: "interview",
    kind: "ask",
    title: "身近な人にインタビュー",
    summary: "家族・友達・先生・地域の人に、体験や考えを聞きます。",
    steps: [1, 2, 3, 5, 6],
    howTo: [
      "誰に聞くと面白い答えが返ってきそうか、3 人ほど候補を考えてください",
      "質問は 5 個までにし、「はい/いいえ」で終わらない聞き方にしてください",
      "聞いた内容は、その日のうちにメモにまとめてください",
    ],
    caution: "学校の外の人に話を聞くときは、先に先生か家族に伝えてください。",
    template:
      "【インタビューのお願い】\n〇〇さん、こんにちは。〇〇高校の〇〇です。\n学校の探究の時間で「{{問い}}」について調べています。\n〇〇さんの経験を 10 分ほど聞かせてもらえませんか？\n\n【質問リスト】\n1. 〜について、ふだんどう感じていますか？\n2. それはどんなときですか？\n3. 〜したことはありますか？ そのときどうでしたか？\n4. \n5. 最後に、ほかに知っておくといいことはありますか？\n",
  },
  {
    id: "survey",
    kind: "ask",
    title: "アンケートを取る",
    summary: "たくさんの人の傾向を、数字でつかみます。",
    steps: [4, 5],
    howTo: [
      "Google フォームなどで作ってください (学校のアカウントがあれば、それを使います)",
      "質問は 10 問以内にし、答えを誘導する聞き方をしないでください",
      "選択肢には「その他」「わからない」を入れてください",
      "配る前に、友達 2 人に試しに答えてもらってください",
    ],
    caution: "クラスや学年全体に配るときは、先に先生に確認してください。名前など、個人が分かる情報は集めないでください。",
    template:
      "アンケートのタイトル: {{問い}} についてのアンケート\n対象: \n人数の目標: \n\nQ1 (選択): \nQ2 (選択): \nQ3 (5 段階: 全くそう思わない〜とてもそう思う): \nQ4 (自由記述): \n\n集計で見たいこと: {{仮説}} が当たっているか",
    links: [{ label: "Google フォーム", url: "https://docs.google.com/forms/" }],
  },
  {
    id: "expert-mail",
    kind: "ask",
    title: "研究者・専門家に質問する",
    summary: "本では分からないことを、その分野の専門家に直接聞きます。",
    steps: [4, 6, 9, 10],
    howTo: [
      "情報ハブの「専門家を探す」で、キーワードに近い研究をしている人を探してください",
      "大学や研究室のページにある問い合わせ先を確認してください",
      "質問は 1〜2 個にしぼり、自分で調べたことも書いてください",
      "返事がすぐに来なくても問題ありません。1〜2 週間待ってください",
    ],
    caution: "メールを送る前に、必ず先生に文面を確認してもらってください。",
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
    summary: "実際の場所・もの・人の動きを、自分の目で見ます。",
    steps: [1, 4, 5],
    howTo: [
      "何を・いつ・どこで見るかを、先に決めてください",
      "写真を撮る場合は、人の顔や家が写らないように気をつけてください",
      "見たこと (事実) と思ったこと (感想) を分けてメモしてください",
    ],
    caution: "知らない場所へ行くときは、家族に行き先と帰る時間を伝えてください。",
    template:
      "観察すること: \n場所: \n日時: \n天気・気温: \n\n【見たこと (事実)】\n- \n- \n\n【思ったこと (感想・疑問)】\n- \n",
    links: [{ label: "地理院地図", url: "https://maps.gsi.go.jp/" }],
  },
  {
    id: "experiment",
    kind: "try",
    title: "小さく試す (実験)",
    summary: "家や学校でできる規模で、予想が当たるか確かめます。",
    steps: [3, 4, 5],
    howTo: [
      "変える条件は 1 つだけにし、ほかの条件はそろえてください",
      "同じ条件で 3 回以上くり返してください",
      "結果は表にして、数字で記録してください",
    ],
    caution: "火・薬品・刃物・電気を使うときは、必ず先生と一緒に行ってください。",
    template:
      "確かめたいこと: {{仮説}}\n\n変える条件: \nそろえる条件: \n測るもの (単位も): \nくり返す回数: \n必要なもの: \n\n| 条件 | 1回目 | 2回目 | 3回目 | 平均 |\n|---|---|---|---|---|\n|  |  |  |  |  |\n",
  },
  {
    id: "prototype",
    kind: "make",
    title: "作って見せる",
    summary: "ポスター・模型・試作品・提案書などの形にして、人に見てもらいます。",
    steps: [7, 8, 9],
    howTo: [
      "見せたい相手を 1 人決めてください",
      "完成度よりも、早く見せて感想をもらうことを優先してください",
      "もらった感想は、良かった点と直したい点に分けてメモしてください",
    ],
    template:
      "作るもの: \n見せる相手: \nいつまでに: \n\n伝えたいこと (1 文): \n\n【もらった感想】\n良かった点: \n直したい点: \n",
  },
  {
    id: "publish",
    kind: "share",
    title: "学校の外へ発信する",
    summary: "コンテスト・記事・発表会を通じて、学校の外の人にも届けます。",
    steps: [8, 9, 10],
    howTo: [
      "どこに出すか (コンテスト / Web 記事 / 地域の発表会) を決めてください",
      "締め切りと応募の条件を確認してください",
      "公開する前に、個人情報が入っていないか見直してください",
    ],
    caution: "Web に公開するときやコンテストに応募するときは、先生と家族に相談してください。",
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
// ステップごとの「起こせる行動」
// 目的: 書くだけでは答えが出ないことを、実際に調べる・聞く・試すことで前に進める。
// ステップの目標に直結する行動だけを、そのステップでやる理由とともに提案する。
// ------------------------------------------------------------------
export interface StepActionGuide {
  /** このステップで行動する目的 (1 文) */
  purpose: string;
  picks: { kit: string; why: string }[];
}

export const STEP_ACTION_GUIDE: Record<number, StepActionGuide> = {
  1: {
    purpose: "頭の中だけで考えず、実際に見たり聞いたりして「気になること」の材料を集めます。",
    picks: [
      { kit: "field", why: "身の回りをよく観察すると、まだ言葉になっていない「なぜ？」が見つかります。" },
      { kit: "interview", why: "家族や友達が不思議に思っていることを聞くと、自分では気づかなかった疑問に出会えます。" },
      { kit: "desk-research", why: "気になった話題を少し調べると、どこが本当に不思議なのかがはっきりします。" },
    ],
  },
  2: {
    purpose: "問いを決める前に、本当に調べられる問いかどうかを確かめます。",
    picks: [
      { kit: "desk-research", why: "同じような問いを調べた人がいるか確かめると、問いの広さを決めやすくなります。" },
      { kit: "interview", why: "問いを人に説明してみると、分かりにくい言葉や広すぎる部分に気づけます。" },
    ],
  },
  3: {
    purpose: "予想の理由を、思い込みだけでなく情報や人の経験で裏付けます。",
    picks: [
      { kit: "desk-research", why: "すでに分かっていることを知ると、予想の理由を説明しやすくなります。" },
      { kit: "interview", why: "経験のある人に聞くと、予想が当たっていそうか早めに見当がつきます。" },
      { kit: "experiment", why: "小さく試してみると、本番の調査の前に予想の手応えが分かります。" },
    ],
  },
  4: {
    purpose: "考えた方法が実際に使えるかを確かめ、準備を進めます。",
    picks: [
      { kit: "desk-research", why: "先行研究がどんな方法で調べたかを知ると、自分の方法を決めやすくなります。" },
      { kit: "survey", why: "アンケートで調べる場合は、ここで質問を作り、友達に試してもらいます。" },
      { kit: "experiment", why: "実験で調べる場合は、ここで条件と手順を決めて、一度試してみます。" },
      { kit: "expert-mail", why: "方法に迷ったら、その分野の専門家に質問すると近道になることがあります。" },
    ],
  },
  5: {
    purpose: "計画した方法で、実際にデータを集めます。このステップの中心は行動です。",
    picks: [
      { kit: "survey", why: "アンケートを配って回答を集めます。" },
      { kit: "interview", why: "人に話を聞いて、言葉のデータを集めます。" },
      { kit: "field", why: "現地で観察して、見たことを記録します。" },
      { kit: "experiment", why: "実験をくり返して、数字のデータを集めます。" },
    ],
  },
  6: {
    purpose: "自分だけの見方に偏らないよう、他の人の意見や他のデータと比べます。",
    picks: [
      { kit: "interview", why: "データを友達や先生に見せると、自分では思いつかない読み取り方が出てきます。" },
      { kit: "desk-research", why: "先行研究の結果と比べると、自分の結果の確かさが分かります。" },
      { kit: "expert-mail", why: "解釈に迷ったら、専門家の意見を聞くことができます。" },
    ],
  },
  7: {
    purpose: "結論を人に見せて、伝わるか、言い過ぎていないかを確かめます。",
    picks: [
      { kit: "interview", why: "結論を人に説明して、納得してもらえるか確かめます。" },
      { kit: "prototype", why: "結論を 1 枚にまとめて見せると、足りない部分が見つかります。" },
    ],
  },
  8: {
    purpose: "発表の前に、実際に人に聞いてもらって分かりやすさを確かめます。",
    picks: [
      { kit: "prototype", why: "スライドやポスターを作って、早めに人に見てもらいます。" },
      { kit: "interview", why: "家族や友達に発表を聞いてもらい、分かりにくかった点を教えてもらいます。" },
    ],
  },
  9: {
    purpose: "本番に近い形で練習し、質問に答えられるようにします。",
    picks: [
      { kit: "interview", why: "人の前で通して発表し、出てきた質問を記録します。" },
      { kit: "prototype", why: "練習でもらった意見をもとに、資料を直します。" },
    ],
  },
  10: {
    purpose: "探究の成果を、学校の外に届けるための最初の一歩を踏み出します。",
    picks: [
      { kit: "publish", why: "コンテストや Web 記事など、発表の場を決めて準備を始めます。" },
      { kit: "expert-mail", why: "専門家に成果を見てもらい、意見をもらいます。" },
    ],
  },
};

// ------------------------------------------------------------------
// 情報ハブ: 信頼できる情報源をキーワード付きで開く
// ------------------------------------------------------------------
export interface Source {
  name: string;
  desc: string;
  /** 検索語入りの URL (検索のないサイトはトップページ) */
  url: (q: string) => string;
  /**
   * 検索語の渡し方:
   *  - "perWord": 辞書・百科事典など単語で引くサイト。重要な言葉ごとに 1 つずつリンクを出す
   *  - "words":   論文データベースなど。文章ではなく重要な言葉をスペースでつないで渡す
   *  - 省略:      Google など文章でも検索できるサイト。入力をそのまま渡す
   */
  mode?: "perWord" | "words";
}

const enc = encodeURIComponent;
const siteSearch = (site: string) => (q: string) =>
  `https://www.google.com/search?q=${enc(`site:${site} ${q}`)}`;

export const SOURCE_GROUPS: { id: string; title: string; icon: string; hint: string; sources: Source[] }[] = [
  {
    id: "basic",
    title: "まず基本を知る",
    icon: "🔤",
    hint: "言葉の意味や全体像をつかみます。ここで終わらせず、元の情報もたどってください。",
    sources: [
      { name: "Wikipedia", desc: "全体像をつかむ (出典もたどれます)", mode: "perWord", url: (q) => `https://ja.wikipedia.org/w/index.php?search=${enc(q)}&go=Go` },
      { name: "コトバンク", desc: "辞書・事典をまとめて検索", mode: "perWord", url: (q) => `https://kotobank.jp/search?q=${enc(q)}` },
    ],
  },
  {
    id: "news",
    title: "ニュース・最近の話題",
    icon: "📰",
    hint: "今、社会でどのように話題になっているかが分かります。日付を必ず確認してください。",
    sources: [
      { name: "Google ニュース", desc: "複数の新聞社・テレビ局", url: (q) => `https://www.google.com/search?q=${enc(q + " ニュース")}&tbm=nws` },
      { name: "NHK", desc: "NHK のニュース記事", url: siteSearch("www3.nhk.or.jp/news") },
    ],
  },
  {
    id: "papers",
    title: "本・論文",
    icon: "📚",
    hint: "研究者が確かめたことです。タイトルと要旨 (最初の数行) を読めば十分です。",
    sources: [
      { name: "CiNii Research", desc: "日本の論文・本", mode: "words", url: (q) => `https://cir.nii.ac.jp/all?q=${enc(q)}` },
      { name: "J-STAGE", desc: "日本の学会誌 (無料で読めるものが多い)", mode: "words", url: (q) => `https://www.jstage.jst.go.jp/result/global/-char/ja?globalSearchKey=${enc(q)}` },
      { name: "Google Scholar", desc: "世界中の論文", mode: "words", url: (q) => `https://scholar.google.com/scholar?q=${enc(q)}` },
      { name: "国立国会図書館サーチ", desc: "日本の本・雑誌", mode: "words", url: (q) => `https://ndlsearch.ndl.go.jp/search?cs=bib&keyword=${enc(q)}` },
    ],
  },
  {
    id: "data",
    title: "統計・データ",
    icon: "📊",
    hint: "国や自治体が公開している数字です。自分の地域のデータを探すと、探究が深まります。",
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
    hint: "そのテーマを研究している人を見つけます。質問するときは「行動キット」を使ってください。",
    sources: [
      { name: "researchmap", desc: "日本の研究者データベース", url: siteSearch("researchmap.jp") },
      { name: "KAKEN", desc: "国の研究費で行われた研究", mode: "words", url: (q) => `https://kaken.nii.ac.jp/ja/search/?kw=${enc(q)}` },
      { name: "大学の研究室", desc: "研究室のページを探す", url: (q) => `https://www.google.com/search?q=${enc(q + " 研究室 大学")}` },
    ],
  },
  {
    id: "places",
    title: "行ける場所・資料",
    icon: "🏛",
    hint: "博物館・科学館・資料館では、本物を見ることができます。",
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
  "誰が書いた情報ですか？ (国・大学・新聞社・個人など)",
  "いつ書かれた情報ですか？ 古すぎませんか？",
  "元のデータや出典は書かれていますか？",
  "ほかの情報源でも、同じことが言われていますか？",
  "広告や、何かを売るための記事ではありませんか？",
];
