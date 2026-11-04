import { destroySession, json, type Env } from "../../_lib/util";

/** POST /api/teacher/logout */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const cookie = await destroySession(env, request, "teacher");
  return json({ ok: true }, 200, { "Set-Cookie": cookie });
};
