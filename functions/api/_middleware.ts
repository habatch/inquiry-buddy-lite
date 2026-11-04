import { fail, type Env } from "../_lib/util";

/**
 * /api/* 共通:
 *  - 書き込み系は同じサイトからのリクエストだけ受け付ける (CSRF 対策。Cookie も SameSite=Strict)
 *  - 想定外のエラーは中身を出さずに 500 を返す
 */
export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { request } = ctx;
  if (request.method !== "GET" && request.method !== "HEAD") {
    const origin = request.headers.get("Origin");
    const host = new URL(request.url).host;
    if (!origin || new URL(origin).host !== host) return fail(403, "不正なリクエストです");
    if (!(request.headers.get("Content-Type") || "").includes("application/json") && request.method !== "DELETE") {
      return fail(415, "JSON で送ってください");
    }
  }
  try {
    return await ctx.next();
  } catch (e) {
    console.error("api error", request.method, new URL(request.url).pathname, e);
    return fail(500, "サーバでエラーが起きました。少し待ってからもう一度試してください。");
  }
};
