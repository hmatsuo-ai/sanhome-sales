# GitHub（h.matsuo@vexum-ai.com）→ Vercel 公開手順

このリポジトリを **h.matsuo@vexum-ai.com** の Git アカウントで新規作成し、**Vercel** でホストするまでの流れです。  
（GitHub / Vercel へのログインと 2FA は本人のみが行えます。）

## 1. GitHub で空リポジトリを作る

1. [GitHub](https://github.com) に **h.matsuo@vexum-ai.com** でログイン（必要なら Organization に招待されるアカウントでログイン）。
2. **New repository** で名前を決める（例: `sanhome-sales`）。
3. **Public** または Private を選択。**README / .gitignore は追加しない**（空のまま）。
4. 作成後、表示される URL を控える（例: `https://github.com/vexum-ai/sanhome-sales.git`）。

## 2. ローカルでリモートを登録してプッシュ

このフォルダ（`sanhome-sales`）で実行:

```bash
git remote add origin https://github.com/<組織またはユーザー名>/<リポジトリ名>.git
git branch -M main
git push -u origin main
```

初回はブラウザまたは Personal Access Token（classic の `repo` 権限）で認証します。

## 3. Vercel でプロジェクトを作成

1. [Vercel](https://vercel.com) にログインし、**Add New… → Project**。
2. **Import** で先ほどの GitHub リポジトリを選ぶ。
3. **Root Directory** がリポジトリ直下でこのアプリだけの場合は **`.`** のまま。  
   親フォルダから Git 管理する構成にした場合は **`sanhome-sales`** を指定。
4. **Environment Variables** に以下を Production（および必要なら Preview）で設定:

   | Name | 説明 |
   |------|------|
   | `DATABASE_URL` | PostgreSQL 接続 URL（Neon / Supabase / Vercel Postgres 等。多くは末尾 `?sslmode=require`） |
   | `AUTH_SECRET` | 長いランダム文字列（`openssl rand -base64 32` など） |
   | `AUTH_URL` | 本番 URL（例: `https://<プロジェクト名>.vercel.app`、カスタムドメインならその URL） |
   | `BLOB_READ_WRITE_TOKEN` | Vercel ダッシュボードで **Storage → Blob** をプロジェクトに接続すると付与 |
   | `GEMINI_API_KEY` | レシート OCR を使う場合のみ |
   | `NEXT_PUBLIC_APP_URL` | 本番のサイト URL（`AUTH_URL` と揃えてもよい） |

5. **Deploy** を実行。ビルドは `prisma migrate deploy` → `next build` のため、**デプロイ前に DB が存在し `DATABASE_URL` が正しい**こと。

## 4. 初回デプロイ後

- 初回ログイン用ユーザーは、ローカルから本番 `DATABASE_URL` を `private/.env.local` に一時設定して `npm run db:seed` を実行するか、本番で管理者ユーザーを別途登録する運用を決める。
- **Preview** 用に別の `DATABASE_URL` を用意しないと、プレビューデプロイでも本番 DB にマイグレーションが走る点に注意。

## 5. 秘密を Git に載せない

- **載せる**: ソース、`/.env.local.example`、`private/README.md`（手順のみ）
- **載せない**: `private/.env.local`、`.env`、API キー、本番 DB パスワード
