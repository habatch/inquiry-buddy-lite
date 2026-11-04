import { destroySession, json, type Env } from "../../_lib/util";

/** POST /api/student/logout */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const cookie = await destroySession(env, request, "student");
  return json({ ok: true }, 200, { "Set-Cookie": cookie });
};
