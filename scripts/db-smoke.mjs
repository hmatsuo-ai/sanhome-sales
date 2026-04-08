/**
 * DB に接続しユーザー件数を表示（秘密は出さない）
 * 読み込み順: .env → .env.local（後者で上書き）
 */
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
config({ path: path.join(root, ".env"), quiet: true });
config({ path: path.join(root, ".env.local"), quiet: true, override: true });

/** パスワードを表示しない接続先の要約 */
function maskDatabaseUrl(url) {
  if (!url || typeof url !== "string") return "(not set)";
  const at = url.indexOf("@");
  if (at === -1) return "(scheme or host unclear)";
  const hostAndRest = url.slice(at + 1);
  const slash = hostAndRest.indexOf("/");
  const hostPort = slash === -1 ? hostAndRest : hostAndRest.slice(0, slash);
  const pathPart = slash >= 0 ? hostAndRest.slice(slash) : "";
  return `postgresql://****@${hostPort}${pathPart.split("?")[0]}`;
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl?.trim()) {
  console.error("DB_FAIL: DATABASE_URL が未設定です。.env または .env.local を確認してください。");
  process.exit(1);
}

console.log("Trying:", maskDatabaseUrl(dbUrl));

const prisma = new PrismaClient();
try {
  await prisma.$connect();
  const n = await prisma.user.count();
  const sample = await prisma.user.findFirst({ select: { email: true } });
  console.log("DB_OK: connected. user_count=", n, sample ? `sample_email=${sample.email}` : "(no rows)");
  process.exit(0);
} catch (e) {
  console.error("DB_FAIL:", e.message || e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
