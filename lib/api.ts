/** サーバ API の呼び出し (同じサイトの /api。Cookie で認証) */

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * status 0 = 通信できなかった (オフライン・タイムアウト)
 *
 * 一斉アクセス時、Cloudflare 側の一時的な制限 (無料版の CPU 上限など) で API が実行されず、
 * JSON ではない応答 (404 / 429 / 5xx) が返ることがある (実測 0〜2%)。
 * その場合は API が動いていないので、間隔をずらして自動で再試行する。
 */
export async function api<T>(
  path: string,
  init: RequestInit & { json?: unknown; timeoutMs?: number; retries?: number } = {},
): Promise<T> {
  const { retries = 3, ...rest } = init;
  for (let attempt = 0; ; attempt++) {
    try {
      return await apiOnce<T>(path, rest);
    } catch (e) {
      const transient = e instanceof ApiError && e.data.__transient === true;
      if (!transient || attempt >= retries) throw e;
      // 0.4 秒, 1.2 秒, 3.6 秒 + ばらつき (全員が同じ瞬間に再送しないように)
      await sleep(400 * 3 ** attempt * (0.5 + Math.random()));
    }
  }
}

async function apiOnce<T>(path: string, init: RequestInit & { json?: unknown; timeoutMs?: number }): Promise<T> {
  const { json, timeoutMs = 15000, ...rest } = init;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(BASE + "/api" + path, {
      credentials: "same-origin",
      ...rest,
      signal: ctrl.signal,
      headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...(rest.headers || {}) },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    throw new ApiError(0, "サーバに接続できません。ネットワークを確認してください。", { __transient: true });
  } finally {
    clearTimeout(timer);
  }
  const isJson = (res.headers.get("Content-Type") || "").includes("application/json");
  let data: Record<string, unknown> = {};
  if (isJson) {
    try {
      data = await res.json();
    } catch {
      /* 本文なし */
    }
  }
  if (!res.ok && !isJson && (res.status === 404 || res.status === 429 || res.status >= 500)) {
    // API ではなく Cloudflare 側が返した応答 → 一時的なものとして再試行
    throw new ApiError(res.status, "サーバが混み合っています。少し待ってからもう一度試してください。", { __transient: true });
  }
  if (!res.ok) {
    const msg =
      typeof data.error === "string"
        ? data.error
        : res.status === 404
          ? "サーバの機能が見つかりません (公開設定を確認してください)"
          : `サーバエラー (${res.status})`;
    throw new ApiError(res.status, msg, data);
  }
  return data as T;
}

/** ログインコードを XXXX-XXXX-XXXX に整形 (入力中の表示用) */
export function formatCode(input: string): string {
  const s = input
    .normalize("NFKC")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);
  return s.match(/.{1,4}/g)?.join("-") ?? "";
}
