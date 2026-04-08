## 運用/環境構築（Ops）

参照実装:
- `sanhome-sales/package.json`
- `sanhome-sales/.env.local.example`
- `sanhome-sales/.env`（値は転載しない）
- `sanhome-sales/prisma/seed.ts`

---

## 1. 必要な環境変数

- **`DATABASE_URL`**: Prisma 用 **PostgreSQL** 接続文字列（ローカル・Vercel 共通）
  - 例: `postgresql://username:password@localhost:5432/sanhome_sales_db`
  - **Vercel**: Neon / Supabase / Vercel Postgres 等の URL（SSL 要件に応じ `?sslmode=require` を付与）
- **`AUTH_SECRET`**: NextAuth 用シークレット（必須）
  - 値は外部に出さないこと
- **`AUTH_URL`**（Auth.js v5 / 本番推奨）: サイトの **公開ベースURL**
  - 例: `https://your-app.vercel.app`（カスタムドメインならそのURL）
  - 以前の `NEXTAUTH_URL` に相当する用途
- **`BLOB_READ_WRITE_TOKEN`**: 領収書アップロード用（Vercel ダッシュボードで **Blob** ストレージをプロジェクトに接続すると付与される）
- **`NEXT_PUBLIC_APP_URL`**: 公開URL（環境により必要）

---

## 2. ローカル起動

1. **`private/.env.local`** を作成（`.env.local.example` をコピーして値を埋める）。このファイルは **Git に含めない**。
2. 依存関係インストール後:

```bash
npm install
npm run dev
```

`npm run dev` / `db:*` は `scripts/with-private-env.cjs` 経由で **`private/.env.local`** を読み込む。Vercel には `private/` がデプロイされず、環境変数はダッシュボードのみ。

アクセス: `http://localhost:3000`

---

## 3. DBセットアップ（Prisma）

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

- **seed内容**: `prisma/seed.ts` がサンプルユーザー/売上/経費/予定を作成する
- **初期パスワード**: seed は `password123` を bcrypt 化して投入する

---

## 4. データバックアップ/復元（指針）

### 4.1 PostgreSQL
- **バックアップ**: ホスト提供のスナップショット、または `pg_dump` / `pg_restore` による論理バックアップを推奨

---

## 5. ログ/監視（指針）

- Prisma は開発環境で `query/error/warn` を出す設定（`src/lib/prisma.ts`）
- 運用では
  - APIエラー率
  - 認証失敗率
  - アップロード容量/回数
  - DB接続エラー
  を監視対象にする

---

## 6. 本番（Vercel）

**方針**: 本番は Vercel。コード側では **PostgreSQL**、**ビルド時 `prisma migrate deploy`**、**領収書は Vercel Blob**（`BLOB_READ_WRITE_TOKEN`）に対応済み。ローカルでは Blob トークン未設定時のみ `public/uploads` に保存。

### 6.1 構成の要点

| 項目 | ローカル | Vercel 本番 |
|------|----------|-------------|
| DB | PostgreSQL（`DATABASE_URL`） | 同左（Neon 等のマネージドURLを環境変数へ） |
| 領収書 | `BLOB_READ_WRITE_TOKEN` あれば Blob、なければ `public/uploads` | **`BLOB_READ_WRITE_TOKEN` 必須**（Storage で Blob を接続） |
| ビルド | `npm run build`（中で `migrate deploy` → `next build`） | 同じ。`postinstall` で `prisma generate` |
| マイグレーション | 開発時 `prisma migrate dev` | デプロイのたびに **`prisma migrate deploy`** がビルドに含まれる |

### 6.2 Vercel 上の環境変数（例）

プロジェクト Settings → Environment Variables に少なくとも以下を設定する。

- `DATABASE_URL` … 本番PostgreSQLの接続文字列
- `AUTH_SECRET` … 十分に長いランダム文字列
- `AUTH_URL` … `https://<production-domain>`
- `BLOB_READ_WRITE_TOKEN` … 領収書アップロード（Blob ストレージ連携）

### 6.3 デプロイ手順（概要）

1. GitHub（等）にリポジトリを接続し、Vercel で **Root Directory** を `sanhome-sales` に設定（モノレポで親フォルダがルートの場合）。
2. Vercel プロジェクトに **PostgreSQL**（または外部の `DATABASE_URL`）と **Blob** を接続する。
3. 上記環境変数を Production に設定（`AUTH_URL` は本番URLに合わせる）。
4. デプロイ後、初回ユーザーは `npm run db:seed` をローカルから本番DBに向けて実行するか、管理画面から作成する。

