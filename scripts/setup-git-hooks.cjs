/**
 * npm prepare: リポジトリ直下で core.hooksPath を .githooks に設定する
 */
const { execSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");

try {
  execSync("git rev-parse --git-dir", { cwd: root, stdio: "pipe" });
} catch {
  process.exit(0);
}

try {
  execSync("git config core.hooksPath .githooks", { cwd: root, stdio: "inherit" });
  console.log("[setup-git-hooks] core.hooksPath=.githooks を設定しました（コミット後に自動 git push）");
} catch {
  process.exit(0);
}
