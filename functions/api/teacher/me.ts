import { fail, json, type Env } from "../../_lib/util";
import { currentTeacher } from "../../_lib/teacher";

/** GET /api/teacher/me */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const t = await currentTeacher(env, request);
  if (!t) return fail(401, "ログインしてください");
  return json({ teacher: { name: t.name, email: t.email, schoolName: t.school_name } });
};
