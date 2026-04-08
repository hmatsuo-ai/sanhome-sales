-- Per-user opt-in for daily morning schedule digest email
ALTER TABLE "users" ADD COLUMN "notify_morning_digest" BOOLEAN NOT NULL DEFAULT true;
