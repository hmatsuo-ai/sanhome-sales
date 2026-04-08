-- Incremental changes on top of 20260319120000_init_postgresql
-- (Do not re-create base tables; the previous migration already created them.)

-- AlterTable: users.is_active (凍結フラグ)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable: feedback
CREATE TABLE IF NOT EXISTS "feedback" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey (idempotent for re-runs in dev)
DO $$ BEGIN
  ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Align _SaleAssignees with Prisma schema (PK on A,B instead of unique index only)
DROP INDEX IF EXISTS "_SaleAssignees_AB_unique";

DO $$ BEGIN
  ALTER TABLE "_SaleAssignees" ADD CONSTRAINT "_SaleAssignees_AB_pkey" PRIMARY KEY ("A", "B");
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
