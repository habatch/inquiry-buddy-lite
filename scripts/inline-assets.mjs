/**
 * ビルド後処理: 初回表示に必要な JS / CSS を HTML に埋め込み、
 * 1 人がページを開くときのリクエストを「HTML 1 本」にまとめる。
 *
 * 理由: 学校では全員が同じ IP アドレスからアクセスするため、
 * 配信側の「IP ごとのリクエスト数制限」(GitHub Pages では HTTP 429) に当たりやすい。
 * リクエスト数を約 1/10 にして、一斉アクセスと再読み込みに耐えられるようにする。
 *
 * - <link rel="stylesheet">  → <style>
 * - <script src async>       → <script> (中身を埋め込み)
 * - <link rel="preload" as="script"> → 削除 (埋め込んだので不要)
 * - nomodule の polyfills (古いブラウザ用) と、Word 保存時に読む遅延チャンクはファイルのまま残す
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const OUT = new URL("../out/", import.meta.url).pathname;
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

function assetPath(href) {
  if (!href.startsWith(BASE + "/_next/")) return null;
  return join(OUT, href.slice(BASE.length));
}

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === "_next" ? [] : htmlFiles(p);
    return name.endsWith(".html") ? [p] : [];
  });
}

let total = 0;
for (const file of htmlFiles(OUT)) {
  let html = readFileSync(file, "utf8");
  let n = 0;

  html = html.replace(/<link rel="stylesheet" href="([^"]+)"[^>]*\/?>/g, (m, href) => {
    const p = assetPath(href);
    if (!p) return m;
    n++;
    return `<style>${readFileSync(p, "utf8")}</style>`;
  });

  html = html.replace(/<link rel="preload" as="script"[^>]*\/?>/g, () => "");

  html = html.replace(/<script src="([^"]+)" async=""><\/script>/g, (m, src) => {
    const p = assetPath(src);
    if (!p) return m;
    n++;
    const js = readFileSync(p, "utf8").replace(/<\/script/gi, "<\\/script");
    return `<script>${js}</script>`;
  });

  writeFileSync(file, html);
  total += n;
  console.log(`inline-assets: ${file.slice(OUT.length)} — ${n} files inlined, ${Math.round(html.length / 1024)} KB`);
}
if (total === 0) {
  console.error("inline-assets: nothing was inlined (HTML の形式が変わった可能性)");
  process.exit(1);
}
