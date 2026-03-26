# ローカル機密設定（Git にプッシュしない）

Vercel 本番の API キー・DB URL は **Vercel ダッシュボードの Environment Variables** にだけ設定してください。このフォルダは **開発・検証用** です。

## 手順

1. このフォルダに **`.env.local`** を新規作成する。
2. プロジェクトルートの **`.env.local.example`** を開き、同じキーを `.env.local` にコピーして値を埋める。

```text
private/.env.local   ← 実際の接続文字列・シークレット（コミット禁止）
```

3. 開発サーバー・Prisma は **`npm run ...` 経由**で起動する（`with-private-env.cjs` が `private/.env.local` を読み込む）。

## 注意

- **`private/.env.local` を絶対に Git に追加しない。**（このディレクトリの `.gitignore` でブロック済み）
- ルートに `.env.local` や `.env` を置いた場合、それらは **`private/.env.local` より後に読まれ、上書き**されます（どちらも Git では無視されます）。
