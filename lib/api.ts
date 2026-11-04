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

/** status 0 = 通信できなかった (オフライン・タイムアウト) */
export async function api<T>(path: string, init: RequestInit & { json?: unknown; timeoutMs?: number } = {}): Promise<T> {
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
    throw new ApiError(0, "サーバに接続できません。ネットワークを確認してください。");
  } finally {
    clearTimeout(timer);
  }
  let data: Record<string, unknown> = {};
  try {
    data = await res.json();
  } catch {
    /* 本文なし */
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
