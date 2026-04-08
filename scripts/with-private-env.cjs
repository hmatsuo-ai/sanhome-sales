/**
 * private/.env.local（Git 対象外）を process.env に読み込んでから子コマンドを実行する。
 * Vercel では private フォルダが無いため、ダッシュボードの環境変数のみが使われる。
 */
"use strict";

const { existsSync } = require("fs");
const { resolve } = require("path");
const { config } = require("dotenv");
const { spawnSync } = require("child_process");

const root = resolve(__dirname, "..");
const privateEnv = resolve(root, "private", ".env.local");
const dotEnv = resolve(root, ".env");
const localEnv = resolve(root, ".env.local");

if (existsSync(privateEnv)) config({ path: privateEnv });
if (existsSync(dotEnv)) config({ path: dotEnv, override: true });
if (existsSync(localEnv)) config({ path: localEnv, override: true });

const args = process.argv.slice(2);
if (args.length === 0) {
    console.error("usage: node scripts/with-private-env.cjs <command> [args...]\n  example: node scripts/with-private-env.cjs npx next dev");
    process.exit(1);
}

const result = spawnSync(args[0], args.slice(1), {
    stdio: "inherit",
    cwd: root,
    shell: true,
    env: process.env,
});

process.exit(result.status === null ? 1 : result.status);
