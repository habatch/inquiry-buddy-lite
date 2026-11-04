# 🌱 探究伴走ノート (AI なし版)

高校生の「総合的な探究の時間」を 8 ステップ (+ 解放ステップ 2 つ) で伴走する Web ワークブック。
「探究伴走 AI」(Next.js + LLM 版) から **AI を抜いた版** で、サーバも API キーも不要。
静的サイトとして配信するので **運用費 0 円・利用回数の上限なし** で使えます。

## AI 版との違い

| | AI 版 (inquiry-buddy-web) | この版 (inquiry-buddy-lite) |
|---|---|---|
| 対話 | LLM がソクラテス式に質問 | 固定の問いカード + 「考える角度」ヒント |
| 次へ進む判定 | AI が判断 (`<NEXT_READY/>`) | 記入 (最小文字数) + 自己チェックリスト |
| ステップ 1 の話題 | LLM が生成 | 興味分野別の話題バンク (`lib/topicBank.ts`) |
| ステップ 4 の文献 | LLM が提示 | キーワード → Scholar / CiNii / J-STAGE 検索リンク |
| ステップ 8・9 | AI が添削 | A〜D 連結・字数/秒数メーター・1 分タイマー・想定質問集 |
| ランク / スコア | ○ | ○ (同じ 11 ランク・同じ解放条件) |
| Word 出力 | サーバで生成 | ブラウザ内で生成 |
| 必要なもの | Node サーバ + API キー | 静的ホスティングのみ |

スコアは「いま書かれている内容」から毎回計算するので、同じ欄を書き直しても増えません
(`lib/state.ts` の `computeScore`)。

## データの扱い

回答はすべて **その端末のブラウザ (localStorage) の中だけ** に保存され、外部には送信されません。
端末を変えるときは画面の「バックアップ保存 / 読み込み」(JSON ファイル) を使います。

## 開発

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # out/ に静的サイトを書き出し
```

## 公開 (GitHub Pages)

`main` に push すると `.github/workflows/pages.yml` が `out/` をビルドして GitHub Pages にデプロイします。
リポジトリ名のサブパスで配信されるので、ビルド時に `NEXT_PUBLIC_BASE_PATH=/<repo名>` を渡しています。

## 内容を編集する

- 問い・ヒント・チェックリスト: `lib/steps.ts`
- 話題カード: `lib/topicBank.ts`
- ランク・スコア配点: `lib/ranks.ts`

## License

MIT
