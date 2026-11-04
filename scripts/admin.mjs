#!/usr/bin/env node
/**
 * 運営者用 CLI (学校の登録・教員招待コードの発行)
 *
 *   node scripts/admin.mjs create-school "○○高等学校" [--local]
 *   node scripts/admin.mjs reissue-invite <school_id> [--local]
 *   node scripts/admin.mjs list-schools [--local]
 *   node scripts/admin.mjs disable-school <school_id> [--local]   (その学校の教員・生徒はログイン不可に)
 *
 * --local を付けると `wrangler pages dev` 用のローカル DB、付けなければ本番 DB を操作する。
 * 招待コードは表示されるこの 1 回しか見られない (DB にはハッシュだけ保存)。
 */
import { createHash, randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";

const DB = "tankyu-note-db";
const args = process.argv.slice(2);
const local = args.includes("--local");
const [cmd, arg] = args.filter((a) => a !== "--local");
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function code(len = 12) {
  let s = "";
  while (s.length < len) for (const b of randomBytes(32)) if (b < 248 && s.length < len) s += ALPHABET[b % 31];
  return s.match(/.{4}/g).join("-");
}
const b64url = (buf) => buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const inviteHash = (c) => b64url(createHash("sha256").update("invite:" + c.toUpperCase().replace(/[^A-Z0-9]/g, "")).digest());
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";

function sql(command) {
  const out = execFileSync(
    "./node_modules/.bin/wrangler",
    ["d1", "execute", DB, local ? "--local" : "--remote", "--json", "--command", command],
    { encoding: "utf8", env: { ...process.env, WRANGLER_SEND_METRICS: "false", CI: "true" }, stdio: ["ignore", "pipe", "inherit"] },
  );
  return JSON.parse(out)[0]?.results ?? [];
}

switch (cmd) {
  case "create-school": {
    if (!arg) throw new Error("学校名を指定してください");
    const id = b64url(randomBytes(12));
    const invite = code();
    sql(`INSERT INTO schools (id, name, invite_hash, created_at) VALUES (${q(id)}, ${q(arg)}, ${q(inviteHash(invite))}, ${Date.now()})`);
    console.log(`学校を登録しました: ${arg}\n  school_id : ${id}\n  教員招待コード: ${invite}   ← 先生方に伝えてください (再表示できません)`);
    break;
  }
  case "reissue-invite": {
    const invite = code();
    sql(`UPDATE schools SET invite_hash = ${q(inviteHash(invite))} WHERE id = ${q(arg)}`);
    console.log(`新しい教員招待コード: ${invite}  (古いコードは使えなくなりました。登録済みの先生には影響しません)`);
    break;
  }
  case "list-schools":
    console.table(
      sql(`SELECT sc.id, sc.name, sc.active, (SELECT COUNT(*) FROM teachers t WHERE t.school_id = sc.id) AS teachers,
             (SELECT COUNT(*) FROM students s JOIN classes c ON c.id = s.class_id WHERE c.school_id = sc.id) AS students
           FROM schools sc ORDER BY sc.created_at`),
    );
    break;
  case "disable-school":
    sql(`UPDATE schools SET active = 0 WHERE id = ${q(arg)}`);
    console.log("停止しました");
    break;
  default:
    console.log("使い方: node scripts/admin.mjs create-school|reissue-invite|list-schools|disable-school ... [--local]");
}
