/**
 * DATABASE_URL および機能別の接続 URL それぞれに対して prisma migrate deploy を実行します。
 * Neon などで機能ごとに別データベースを作った場合、同じスキーマをすべてに適用するために使います。
 *
 * 使い方: node scripts/migrate-all-databases.mjs
 * 事前に .env または環境変数で URL を設定してください。
 */

import { config } from "dotenv";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

config({ path: path.join(root, ".env") });
config({ path: path.join(root, ".env.local") });

function collectUrls() {
    const keys = [
        "DATABASE_URL",
        "DATABASE_URL_SETTINGS",
        "DATABASE_URL_EXPENSES",
        "DATABASE_URL_SALES",
        "DATABASE_URL_SCHEDULES",
        "DATABASE_URL_DASHBOARD",
    ];
    const set = new Set();
    for (const k of keys) {
        const v = process.env[k]?.trim();
        if (v) set.add(v);
    }
    if (set.size === 0) {
        console.error("DATABASE_URL などが設定されていません。");
        process.exit(1);
    }
    return Array.from(set);
}

const urls = collectUrls();
console.log(`${urls.length} 件の接続先にマイグレーションを適用します。\n`);

for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const masked = url.replace(/:[^:@/]+@/, ":****@");
    console.log(`[${i + 1}/${urls.length}] ${masked}`);
    execSync("npx prisma migrate deploy", {
        cwd: root,
        stdio: "inherit",
        env: {
            ...process.env,
            DATABASE_URL: url,
        },
    });
}

console.log("\n完了しました。");
