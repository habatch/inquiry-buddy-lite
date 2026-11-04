/*
 * 探究伴走ノート Service Worker
 *
 * 目的: 授業中に回線が混雑・切断しても、2 回目以降はページを開けるようにする。
 *  - /_next/static/ (ファイル名にハッシュ付き、中身が変わらない) → キャッシュ優先
 *  - ページ本体 (HTML) → ネットワーク優先。4 秒以内に返らなければキャッシュを使う
 *    (新しい版を公開すると、次にネットワークが通ったときに自動で切り替わる)
 */
const CACHE = "ibl-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

const scopePath = () => new URL(self.registration.scope).pathname;

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function networkFirst(req, timeoutMs) {
  const cache = await caches.open(CACHE);
  const network = fetch(req).then((res) => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  });
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs));
  try {
    const first = await Promise.race([network, timeout]);
    if (first) return first;
    // 時間切れ: キャッシュがあればそれを返し、無ければネットワークを待ち続ける
    return (await cache.match(req, { ignoreSearch: true })) || (await network);
  } catch (e) {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    throw e;
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(scopePath())) return;

  if (url.pathname.includes("/_next/static/")) {
    event.respondWith(cacheFirst(req));
  } else if (req.mode === "navigate") {
    event.respondWith(networkFirst(req, 4000));
  }
});
