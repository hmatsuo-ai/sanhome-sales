-- テスト用ログインアカウント（パスワードは prisma/seed.ts と同じ password123 の bcrypt）
-- 既存メールと衝突した場合はパスワード・名前・役割を上書きしてログイン可能にする

INSERT INTO "users" ("id", "name", "email", "password", "role", "is_active", "created_at")
VALUES
  (gen_random_uuid(), '田中 太郎', 'tanaka@sanhome.co.jp', '$2b$10$Jg7zlImOHEhjTc9B2LxclejlIOWaTR4CYEWuHCW77UhvHe2PaxUUe', 'sales', true, NOW()),
  (gen_random_uuid(), '鈴木 花子', 'suzuki@sanhome.co.jp', '$2b$10$Jg7zlImOHEhjTc9B2LxclejlIOWaTR4CYEWuHCW77UhvHe2PaxUUe', 'sales', true, NOW()),
  (gen_random_uuid(), '山田 管理', 'yamada@sanhome.co.jp', '$2b$10$Jg7zlImOHEhjTc9B2LxclejlIOWaTR4CYEWuHCW77UhvHe2PaxUUe', 'admin', true, NOW()),
  (gen_random_uuid(), '佐藤 次郎', 'sato@sanhome.co.jp', '$2b$10$Jg7zlImOHEhjTc9B2LxclejlIOWaTR4CYEWuHCW77UhvHe2PaxUUe', 'sales', true, NOW())
ON CONFLICT ("email") DO UPDATE SET
  "password" = EXCLUDED."password",
  "name" = EXCLUDED."name",
  "role" = EXCLUDED."role",
  "is_active" = true;
