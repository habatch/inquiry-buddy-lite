/**
 * Step 1 の話題カード (AI 版では LLM が生成していたもの)。
 * 時事ネタは古くなるので、長く通用する「問いの種」にしている。
 * リンクは Google ニュース検索なので、常に最新の記事が出る。
 */

export interface Topic {
  title: string;
  body: string;
  query: string;
}

export const TOPIC_BANK: Record<string, Topic[]> = {
  nature: [
    {
      title: "夏が暑くなっている？",
      body: "猛暑日の数は昔と比べてどれくらい増えたんだろう。自分の住む地域のデータでも確かめられるかも。",
      query: "猛暑日 増加",
    },
    {
      title: "外来生物と在来生物",
      body: "身近な川や池にも、もともと日本にいなかった生き物がいる。何が困るのか、意外と知られていない。",
      query: "外来生物 在来種 影響",
    },
    {
      title: "海のプラスチック",
      body: "細かく砕けたプラスチックが海の生き物の体から見つかっている。どこから来ているんだろう？",
      query: "マイクロプラスチック 海",
    },
  ],
  science_tech: [
    {
      title: "AI はどう答えを作る？",
      body: "AI は質問にスラスラ答えるけど、ときどき間違える。どんなときに間違えやすいんだろう？",
      query: "生成AI 間違い",
    },
    {
      title: "宇宙ゴミ",
      body: "地球のまわりには使い終わった人工衛星の破片がたくさん回っている。片付ける方法はあるのかな。",
      query: "宇宙ごみ 対策",
    },
    {
      title: "太陽光発電の弱点",
      body: "晴れの日しか発電できない、置く場所が足りない……。それでも増えているのはなぜだろう。",
      query: "太陽光発電 課題",
    },
  ],
  society: [
    {
      title: "人口が減る町",
      body: "子どもが減って学校がなくなる地域がある。自分の町の人口は 10 年でどう変わった？",
      query: "人口減少 地方 学校",
    },
    {
      title: "選挙に行く若者",
      body: "18 歳から投票できるけど、若い人の投票率は低いと言われる。どうしてだろう？",
      query: "若者 投票率",
    },
    {
      title: "物の値段が上がる",
      body: "お菓子や文房具の値段が上がったり、量が減ったりしている。何が起きているんだろう。",
      query: "値上げ 理由",
    },
  ],
  language_lit: [
    {
      title: "若者ことばの変化",
      body: "親や祖父母に通じない言葉がある。ことばはどれくらいの速さで変わっていくんだろう？",
      query: "若者言葉 変化",
    },
    {
      title: "機械翻訳はどこまで使える？",
      body: "翻訳アプリで英語の宿題ができてしまう時代。人が外国語を学ぶ意味は変わるのかな。",
      query: "機械翻訳 英語教育",
    },
    {
      title: "本を読む人は減った？",
      body: "読書する高校生は減っているのか、それとも読み方が変わっただけなのか。",
      query: "高校生 読書 調査",
    },
  ],
  art_design: [
    {
      title: "音楽の長さが短くなっている？",
      body: "最近のヒット曲はイントロが短いと言われる。聴き方の変化と関係があるのかも。",
      query: "ヒット曲 イントロ 短い",
    },
    {
      title: "色が気分を変える？",
      body: "部屋や看板の色で、人の気持ちや行動は変わるんだろうか。身近な場所で確かめられそう。",
      query: "色 心理 効果",
    },
    {
      title: "AI が描いた絵",
      body: "AI が絵を描けるようになって、作品の「作者」は誰なのかが話題になっている。",
      query: "AI イラスト 著作権",
    },
  ],
  sports_health: [
    {
      title: "高校生の睡眠時間",
      body: "高校生は何時間くらい寝ているんだろう。睡眠と集中力や部活の成績には関係がある？",
      query: "高校生 睡眠時間",
    },
    {
      title: "熱中症と部活",
      body: "夏の部活で熱中症になる人がいる。どんな日、どんな時間帯が危ないんだろう。",
      query: "熱中症 部活動",
    },
    {
      title: "スマホと目の疲れ",
      body: "スマホを長く見ると目が疲れる。画面の明るさや距離で変わるのかな。",
      query: "スマホ 目 疲れ",
    },
  ],
  career: [
    {
      title: "将来なくなる仕事？",
      body: "AI やロボットで仕事が変わると言われる。逆に新しく生まれた仕事にはどんなものがある？",
      query: "AI 仕事 変化",
    },
    {
      title: "高校生の起業",
      body: "在学中に会社をつくる高校生が増えている。どんなことから始めているんだろう。",
      query: "高校生 起業",
    },
    {
      title: "働き方の変化",
      body: "家で働く人や、週 4 日だけ働く人もいる。働き方は人の暮らしをどう変えるんだろう。",
      query: "働き方 変化 リモートワーク",
    },
  ],
  media_ai: [
    {
      title: "うわさはなぜ広がる？",
      body: "SNS では本当じゃない情報も一気に広がる。広がりやすい情報には共通点があるのかな。",
      query: "フェイクニュース 拡散",
    },
    {
      title: "おすすめに出てくる動画",
      body: "動画アプリは見たものに合わせておすすめを出す。見る世界が狭くなることはないのかな。",
      query: "おすすめ アルゴリズム 影響",
    },
    {
      title: "ネットに残る写真",
      body: "一度アップした写真や投稿は消しても残ることがある。自分の情報はどう守ればいい？",
      query: "個人情報 SNS 若者",
    },
  ],
  food_living: [
    {
      title: "食べ残しはどれくらい？",
      body: "まだ食べられるのに捨てられる食べ物がたくさんある。学校や家ではどれくらい出ているんだろう。",
      query: "食品ロス 家庭",
    },
    {
      title: "地元の農業",
      body: "近くの畑や田んぼは、誰がどうやって続けているんだろう。後を継ぐ人は足りている？",
      query: "農業 担い手 不足",
    },
    {
      title: "お弁当と季節",
      body: "夏のお弁当が傷みやすいのはなぜ？ 保冷剤や詰め方でどれくらい変わるんだろう。",
      query: "お弁当 食中毒 対策",
    },
  ],
};

/** 興味分野が未選択のとき用 */
export const DEFAULT_TOPICS: Topic[] = [
  TOPIC_BANK.sports_health[0],
  TOPIC_BANK.society[0],
  TOPIC_BANK.science_tech[0],
];

/** 選ばれた興味分野から最大 6 件の話題を取り出す */
export function topicsForInterests(interests: string[]): Topic[] {
  const picked: Topic[] = [];
  const pools = interests.map((id) => TOPIC_BANK[id]).filter(Boolean);
  if (pools.length === 0) return DEFAULT_TOPICS;
  // 分野を横断して交互に取る
  for (let i = 0; picked.length < 6 && i < 3; i++) {
    for (const pool of pools) {
      if (pool[i] && picked.length < 6) picked.push(pool[i]);
    }
  }
  return picked;
}

export function newsSearchUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query + " ニュース")}&tbm=nws`;
}
