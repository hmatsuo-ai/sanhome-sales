/**
 * ローカル .env の DATABASE_URL で DB に接続し、ユーザー件数を表示する（秘密は出さない）
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
try {
  await prisma.$connect();
  const n = await prisma.user.count();
  const sample = await prisma.user.findFirst({ select: { email: true } });
  console.log("DB_OK: connected. user_count=", n, sample ? `sample_email=${sample.email}` : "(no rows)");
  process.exit(0);
} catch (e) {
  console.error("DB_FAIL:", e.message || e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
