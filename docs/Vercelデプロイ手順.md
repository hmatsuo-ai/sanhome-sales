# Vercel へのデプロイ手順

このアプリは **PostgreSQL** が必要です（SQLite は Vercel のサーバーレス環境では使えません）。

## 1. データベースを用意する

次のいずれかで **PostgreSQL** を作成し、接続文字列（`DATABASE_URL`）を取得します。

- [Vercel の Storage で Postgres / Neon](https://vercel.com/docs/storage) をプロジェクトに紐づける  
- または [Neon](https://neon.tech)・[Supabase](https://supabase.com) など外部の Postgres

接続 URL は通常 `postgresql://` または `postgres://` で始まります。

## 2. Vercel にプロジェクトを登録する

1. [Vercel](https://vercel.com) にログインする  
2. **Add New… → Project** で Git リポジトリをインポートする（このフォルダ `sanhome-sales` がルートになるよう設定）  
3. **Root Directory** がサブフォルダの場合は `sanhome-sales` を指定する  

## 3. 環境変数を設定する

プロジェクトの **Settings → Environment Variables** に次を設定します（Production / Preview 両方推奨）。

| 名前 | 説明 |
|------|------|
| `DATABASE_URL` | Postgres の接続 URL（必須） |
| `AUTH_SECRET` | ランダムな長い文字列（必須）。例: `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | デプロイ後の公開 URL。例: `https://あなたのプロジェクト.vercel.app` |
| `AUTH_URL` | **推奨** `NEXT_PUBLIC_APP_URL` と **同じ** URL（ログイン・コールバックの整合用） |

任意:

| 名前 | 説明 |
|------|------|
| `GEMINI_API_KEY` | 領収書 OCR を使う場合 |

## 4. デプロイする

**Deploy** を実行します。ビルド時に `prisma migrate deploy` が走り、テーブルが作成されます。

初回デプロイが成功したら、**初回だけ**ローカルから本番 DB にシードを流す例:

```bash
# Vercel / Neon から DATABASE_URL をコピーして一時設定
set DATABASE_URL=postgresql://...   # Windows cmd
npm run db:seed
```

（本番にテストユーザーを入れない場合はスキップ可）

## 5. 動作確認

- 未ログインで `/dashboard` にアクセス → `/login` へ  
- シード済みなら `tanaka@sanhome.co.jp` / `password123` でログイン（シード実行時のみ）

## 注意（既知の制限）

- **領収書画像のアップロード** (`/api/upload`) はローカル `public/uploads` に保存する実装のため、Vercel 上では永続化されません。本番で使う場合は Vercel Blob / S3 等への変更が必要です。
- 以前ローカルで使っていた **SQLite の `dev.db` のデータは自動では移行されません**。必要なら別途エクスポート／インポートしてください。

## ローカル開発（PostgreSQL）

Docker 利用時:

```bash
docker compose up -d
```

`.env` の例:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sanhome"
```

その後:

```bash
npx prisma migrate dev
npm run dev
```
